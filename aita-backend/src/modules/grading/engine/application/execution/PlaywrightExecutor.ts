// @ts-nocheck
import { PublishedAssignment } from '../../core/domain/submission/PublishedAssignment';
import { Evidence } from '../../core/domain/evidence/Evidence';
import { IArtifactStore } from '../../core/contracts/IArtifactStore';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export class PlaywrightExecutor {
    constructor(private artifactStore: IArtifactStore) {}

    public async executeAsync(
        submissionId: string, 
        projectDirectory: string, 
        assignment: PublishedAssignment,
        baseUrl: string,
        additionalUrls?: string[]
    ): Promise<Evidence[]> {
        const evidences: Evidence[] = [];
        
        console.log(`[PlaywrightExecutor] Starting Chromium in background for ${baseUrl}...`);
        
        let browser;
        try {
            browser = await chromium.launch({ 
                headless: true 
            });
            const page = await browser.newPage();
            
            // Network Interceptor: Auto-correct hardcoded API ports and inject CORS
            await page.route('**/*', async (route) => {
                const request = route.request();
                const url = request.url();
                const resourceType = request.resourceType();
                
                // Only intercept API-like requests (fetch/xhr) going to localhost or 127.0.0.1
                // Do NOT intercept 'script' or 'document' requests (e.g. Vite loading /src/api/axiosClient.ts)
                if ((resourceType === 'fetch' || resourceType === 'xhr') && 
                    (url.includes('localhost:') || url.includes('127.0.0.1:')) && 
                    url.toLowerCase().includes('/api')) {
                    try {
                        const parsedUrl = new URL(url);
                        const backendUrl = new URL(baseUrl);
                        
                        // If the port doesn't match the sandbox backend port, rewrite it
                        if (parsedUrl.port !== backendUrl.port) {
                            console.log(`[PlaywrightExecutor] Intercepted hardcoded API request to ${parsedUrl.port}. Proxying to backend port ${backendUrl.port} with CORS...`);
                            parsedUrl.port = backendUrl.port;
                            parsedUrl.hostname = 'localhost'; // Normalize hostname
                            
                            // Perform the request via Playwright's fetcher to bypass browser CORS restrictions
                            const response = await route.fetch({ url: parsedUrl.toString() });
                            
                            // Inject CORS headers into the response so the browser accepts it
                            const headers = { ...response.headers() };
                            headers['access-control-allow-origin'] = '*';
                            headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
                            headers['access-control-allow-headers'] = '*';
                            
                            await route.fulfill({
                                response,
                                headers
                            });
                            return;
                        }
                    } catch (e) {
                        // URL parse error, just continue normally
                    }
                }
                
                await route.continue();
            });
            
            // Smart Probing: Discover routes from source code
            const discoveredRoutes = await this.discoverRoutes(projectDirectory);
            const pathsToProbe = ['/', '/index.html', '/public/index.html', '/app.html', ...discoveredRoutes];
            
            // Collect all base URLs to check
            const baseUrlsToCheck = [baseUrl];
            if (additionalUrls && additionalUrls.length > 0) {
                baseUrlsToCheck.push(...additionalUrls);
            }

            let successfullyLoaded = false;
            let finalUrl = baseUrl;

            // Probe loop across all base URLs. We check additionalUrls (Frontend) BEFORE baseUrl (Backend).
            // This prevents Playwright from falsely identifying Backend Swagger as the main UI.
            const prioritizedBaseUrls = [...(additionalUrls || []), baseUrl];

            // Global retry loop for slow UI startups (e.g. background npm install in fullstack containers)
            for (let globalAttempt = 1; globalAttempt <= 25; globalAttempt++) {
                if (successfullyLoaded) break;
                
                for (const currentBaseUrl of prioritizedBaseUrls) {
                    if (successfullyLoaded) break;
                    
                    for (const probePath of pathsToProbe) {
                        try {
                            const testUrl = `${currentBaseUrl}${probePath.startsWith('/') ? probePath : '/' + probePath}`;
                            // Fast timeout for probing (3s) instead of waiting 15s for nothing
                            const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 3000 });
                            
                            // Consider it a success if it returns 200 OK and has some body content
                            if (response && response.ok()) {
                                const content = await page.content();
                                // Verify it's actually an HTML page, not just an empty response or basic JSON API
                                if (content.toLowerCase().includes('<body') && content.length > 50) {
                                    console.log(`[PlaywrightExecutor] Found valid UI at ${testUrl}`);
                                    successfullyLoaded = true;
                                    finalUrl = currentBaseUrl; // Fix: Use root URL, not the probed file path like /index.html
                                    break; // Success!
                                }
                            }
                        } catch(e) {
                            // Suppress errors during probe
                        }
                    }
                }
                
                if (!successfullyLoaded) {
                    console.log(`[PlaywrightExecutor] Global Attempt ${globalAttempt}/25 failed to find UI. Waiting 3s before retrying...`);
                    await page.waitForTimeout(3000);
                }
            }

            if (!successfullyLoaded) {
                 console.log(`[PlaywrightExecutor] Could not find UI at any standard path. Defaulting to ${baseUrl}`);
                 await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
            }
            
            // Optional: Give it a tiny bit more time for any JS rendering on the final URL
            await page.waitForTimeout(2000);

            // Keep track of screenshots already taken to avoid duplicate work if multiple rules target same path
            const routesToSnapshot = new Set<string>();
            routesToSnapshot.add('/'); // always snapshot root
            
            for (const route of discoveredRoutes) {
                const normalized = route.startsWith('/') ? route : '/' + route;
                
                // Ignore common boilerplate routes to save execution time
                const lowerRoute = normalized.toLowerCase();
                if (lowerRoute.includes('/counter') || lowerRoute.includes('/weather') || lowerRoute.includes('/error') || lowerRoute.includes('/fetchdata')) {
                    continue;
                }
                
                routesToSnapshot.add(normalized);
            }

            // Live Crawling: Extract links from the Home page
            if (successfullyLoaded) {
                try {
                    await page.goto(`${finalUrl.replace(/\/$/, '')}/`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
                    await page.waitForTimeout(1000);
                    
                    const hrefs = await page.evaluate(() => {
                        // @ts-ignore
                        return Array.from(document.querySelectorAll('a')).map((a: any) => a.getAttribute('href'));
                    });
                    
                    for (const href of hrefs) {
                        if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.includes('#')) {
                            const normalized = href.startsWith('/') ? href : '/' + href;
                            routesToSnapshot.add(normalized);
                        }
                    }
                } catch (e) {
                    console.log('[PlaywrightExecutor] Failed to crawl links:', e);
                }
            }

            let screenshotCount = 0;
            for (const targetPath of routesToSnapshot) {
                if (screenshotCount >= 8) break; // Hard limit to avoid blowing up the context window

                // Replace parameters like {id:int}, {id}, [id] with '1' to prevent 404s on parameterized routes
                const safeTargetPath = targetPath.replace(/\{[^}]+\}/g, '1').replace(/\[[^\]]+\]/g, '1');
                const fullTargetUrl = `${finalUrl.replace(/\/$/, '')}${safeTargetPath}`;
                console.log(`[PlaywrightExecutor] Capturing discovered route ${fullTargetUrl}...`);
                
                try {
                    // Increase timeout to 45s to allow Vite/Webpack to pre-bundle dependencies on the first load
                    await page.goto(fullTargetUrl, { waitUntil: 'load', timeout: 45000 });
                } catch (e: any) {
                    console.log(`[PlaywrightExecutor] Navigation to ${fullTargetUrl} timed out or failed:`, e.message);
                }
                
                // Wait for SPA frameworks (Blazor WASM/Server, React, etc.) to hydrate
                await page.waitForTimeout(3000); 
                
                // Adaptive wait: ensure the page isn't just a blank white screen (e.g. Vite still compiling JS)
                await page.waitForFunction(() => {
                    const bodyText = document.body ? document.body.innerText.trim() : '';
                    return bodyText.length > 20;
                }, { timeout: 30000 }).catch(() => {
                    console.log(`[PlaywrightExecutor] Adaptive wait for UI text content timed out after 30s. Page might be blank or have very little text.`);
                });
                
                // Safety check: if goto failed completely and we're stuck on the old page, skip
                // We compare base paths to handle trailing slashes and query strings
                const decodedUrl = decodeURIComponent(page.url()).toLowerCase();
                const basePath = safeTargetPath.toLowerCase().split('?')[0].replace(/\/$/, '');
                if (safeTargetPath !== '/' && !decodedUrl.includes(basePath)) {
                    console.log(`[PlaywrightExecutor] Expected URL to contain ${basePath}, but it is ${decodedUrl}. Skipping screenshot to avoid duplicates.`);
                    continue;
                }
                
                // @ts-ignore
                const contentText = await page.evaluate(() => document.body.innerText).catch(() => "");
                const isBlazorNotFound = contentText.toLowerCase().includes("sorry, there's nothing at this address");
                
                // We MUST capture the screenshot even if it's completely blank (e.g. React crashed). 
                // Skipping it causes the engine to fall back to Code Review, allowing broken apps to get 100%.
                if (isBlazorNotFound) {
                    console.log(`[PlaywrightExecutor] Route ${safeTargetPath} is Blazor 404, skipping screenshot.`);
                    continue;
                }

                const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 60 });
                
                // Store the artifact
                const artifact = await this.artifactStore.storeArtifactAsync(
                    submissionId, 
                    'browser.screenshot.captured' as any, 
                    screenshotBuffer, 
                    `screenshot_${targetPath.replace(/[^a-zA-Z0-9]/g, '_') || 'root'}.jpeg`
                );

                evidences.push({
                    id: `ev-pw-${Date.now()}-${screenshotCount}`,
                    source: 'PlaywrightExecutor',
                    type: 'browser.screenshot.captured',
                    confidence: 1.0,
                    timestamp: new Date().toISOString(),
                    payload: {
                        artifactId: artifact.id,
                        url: fullTargetUrl
                    }
                });
                screenshotCount++;
            }
        } catch (error) {
            console.error('[PlaywrightExecutor] Failed to capture screenshots:', error);
        } finally {
            if (browser) await browser.close();
        }

        console.log(`[PlaywrightExecutor] Finished. Captured ${evidences.length} screenshots.`);
        return evidences;
    }

    private async discoverRoutes(dir: string): Promise<string[]> {
        const routes = new Set<string>();
        try {
            const files = await this.walkDir(dir);
            for (const file of files) {
                // Blazor: @page "/something"
                if (file.endsWith('.razor')) {
                    const content = await fs.promises.readFile(file, 'utf-8');
                    const matches = content.matchAll(/@page\s+"([^"]+)"/g);
                    for (const match of matches) {
                        if (match[1]) routes.add(match[1]);
                    }
                }
                // MVC/API: [Route("/something")]
                else if (file.endsWith('.cs')) {
                    const content = await fs.promises.readFile(file, 'utf-8');
                    const matches = content.matchAll(/\[Route\("([^"]+)"\)\]/g);
                    for (const match of matches) {
                        if (match[1] && !match[1].includes('{') && !match[1].includes('[')) routes.add(match[1]);
                    }
                }
                // React/Vue/Angular: path="something" or path: 'something'
                else if (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.ts')) {
                    const content = await fs.promises.readFile(file, 'utf-8');
                    // Try to catch Next.js/Nuxt.js file-based routing
                    if (file.includes(path.sep + 'pages' + path.sep) || file.includes(path.sep + 'app' + path.sep)) {
                        let routePath = file.split(path.sep + 'pages' + path.sep)[1] || file.split(path.sep + 'app' + path.sep)[1];
                        if (routePath) {
                            routePath = routePath.replace(/\.(tsx|jsx|js|ts|vue)$/, '').replace(/index$/, '');
                            if (!routePath.includes('[') && !routePath.includes(':')) {
                                routes.add('/' + routePath.replace(/\\/g, '/'));
                            }
                        }
                    }
                    
                    const reactMatches = content.matchAll(/path\s*[:=]\s*['"]([^'"]+)['"]/g);
                    for (const match of reactMatches) {
                        if (match[1] && !match[1].includes(':') && !match[1].includes('*')) routes.add(match[1]);
                    }
                }
            }
        } catch (err) {
            console.error(`[PlaywrightExecutor] Failed to discover routes:`, err);
        }
        return Array.from(routes);
    }

    private async walkDir(dir: string): Promise<string[]> {
        const results: string[] = [];
        const list = await fs.promises.readdir(dir);
        for (const file of list) {
            if (file === 'node_modules' || file === 'bin' || file === 'obj' || file === '.git') continue;
            const filePath = path.join(dir, file);
            const stat = await fs.promises.stat(filePath);
            if (stat && stat.isDirectory()) {
                results.push(...await this.walkDir(filePath));
            } else {
                results.push(filePath);
            }
        }
        return results;
    }
}

