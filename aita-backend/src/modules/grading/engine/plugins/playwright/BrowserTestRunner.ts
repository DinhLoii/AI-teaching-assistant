// @ts-nocheck
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { BrowserTestDefinition, BrowserAction } from '../../core/domain/tests/BrowserTestDefinition';
import { Evidence } from '../../core/domain/evidence/Evidence';
import { BrowserExecutionContext } from './BrowserExecutionContext';
import { IArtifactStore } from '../../core/contracts/IArtifactStore';
import * as fs from 'fs';
import * as path from 'path';

export class BrowserTestRunner {
    private browser?: Browser;
    private context?: BrowserContext;
    private page?: Page;

    constructor(
        private readonly pluginId: string,
        private readonly executionContext: BrowserExecutionContext,
        private readonly artifactStore: IArtifactStore
    ) {}

    public async initializeAsync(): Promise<void> {
        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        this.context = await this.browser.newContext({
            baseURL: this.executionContext.baseUrl,
            viewport: { width: 1280, height: 720 }
        });
        
        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(10000); // 10 second timeout for isolated tests
    }

    public async executeTestAsync(test: BrowserTestDefinition): Promise<Evidence[]> {
        const evidencePool: Evidence[] = [];
        let success = true;
        let stepsExecuted = 0;

        if (!this.page) throw new Error('BrowserTestRunner not initialized');

        console.log(`[BrowserTestRunner] Executing test: ${test.name}`);

        try {
            for (const step of test.steps) {
                stepsExecuted++;
                const evidence = await this.executeActionAsync(step);
                if (evidence) {
                    evidencePool.push(...evidence);
                }
            }
        } catch (error) {
            console.error(`[BrowserTestRunner] Test ${test.name} failed at step ${stepsExecuted}:`, error);
            success = false;
        }

        evidencePool.push(this.createEvidence('browser.workflow.completed', 1.0, {
            testId: test.id,
            success,
            stepsExecuted
        }));

        return evidencePool;
    }

    private async executeActionAsync(action: BrowserAction): Promise<Evidence[]> {
        const evidence: Evidence[] = [];
        const page = this.page!;

        switch (action.action) {
            case 'navigate':
                if (action.target) {
                    const response = await page.goto(action.target);
                    evidence.push(this.createEvidence('browser.navigation.completed', 1.0, {
                        url: action.target,
                        status: response?.status() || 0
                    }));
                }
                break;

            case 'waitForSelector':
                if (action.target) {
                    await page.waitForSelector(action.target, { state: 'visible' });
                    evidence.push(this.createEvidence('browser.element.visible', 1.0, {
                        selector: action.target,
                        isVisible: true
                    }));
                }
                break;

            case 'assertVisible':
                if (action.target) {
                    const isVisible = await page.isVisible(action.target);
                    evidence.push(this.createEvidence('browser.element.visible', 1.0, {
                        selector: action.target,
                        isVisible
                    }));
                    if (!isVisible) throw new Error(`Assertion failed: ${action.target} is not visible`);
                }
                break;

            case 'click':
                if (action.target) {
                    await page.click(action.target);
                    evidence.push(this.createEvidence('browser.element.clicked', 1.0, {
                        selector: action.target
                    }));
                }
                break;

            case 'fill':
                if (action.target && action.value !== undefined) {
                    await page.fill(action.target, action.value);
                    evidence.push(this.createEvidence('browser.input.filled', 1.0, {
                        selector: action.target,
                        valueLength: action.value.length
                    }));
                }
                break;

            case 'screenshot':
                if (action.screenshotName) {
                    const tempPath = path.join(this.executionContext.artifactsDir, `${action.screenshotName}.png`);
                    await page.screenshot({ path: tempPath, fullPage: true });
                    
                    const buffer = fs.readFileSync(tempPath);
                    const artifact = await this.artifactStore.storeArtifactAsync(
                        this.executionContext.submissionId, 
                        'screenshot', 
                        buffer,
                        `${action.screenshotName}.png`
                    );

                    evidence.push(this.createEvidence('browser.screenshot.captured', 1.0, {
                        artifactId: artifact.id,
                        name: action.screenshotName
                    }));
                }
                break;
        }

        return evidence;
    }

    public async teardownAsync(): Promise<void> {
        if (this.page) {
            try { await this.page.close(); } 
            catch (e) { console.error(`[BrowserTestRunner] Error closing page: ${(e as Error).message}`); }
        }
        if (this.context) {
            try { await this.context.close(); } 
            catch (e) { console.error(`[BrowserTestRunner] Error closing context: ${(e as Error).message}`); }
        }
        if (this.browser) {
            try { await this.browser.close(); } 
            catch (e) { console.error(`[BrowserTestRunner] Error closing browser: ${(e as Error).message}`); }
        }
    }

    private createEvidence(type: string, confidence: number, payload: any): Evidence {
        return {
            id: `ev-browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: this.pluginId,
            type,
            confidence,
            timestamp: new Date().toISOString(),
            payload
        };
    }
}

