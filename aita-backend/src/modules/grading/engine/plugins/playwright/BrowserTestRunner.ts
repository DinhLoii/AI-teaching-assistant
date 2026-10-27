// @ts-nocheck
import { Browser, Page, BrowserContext } from 'playwright';
import { launchGradingBrowser } from '../../application/execution/browser-presentation.js';
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
    private visible = false;
    private ownsBrowser = true;

    constructor(
        private readonly pluginId: string,
        private readonly executionContext: BrowserExecutionContext,
        private readonly artifactStore: IArtifactStore
    ) {}

    public async initializeAsync(): Promise<void> {
        const launched = this.executionContext.browserSession || await launchGradingBrowser(this.executionContext.onBrowserMessage);
        this.ownsBrowser = !this.executionContext.browserSession;
        this.browser = launched.browser;
        this.visible = launched.visible;
        
        this.context = await this.browser.newContext({
            baseURL: this.executionContext.baseUrl,
            viewport: this.visible ? null : { width: 1280, height: 720 }
        });
        
        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(10000); // 10 second timeout for isolated tests
    }

    public async executeTestAsync(test: BrowserTestDefinition): Promise<Evidence[]> {
        const evidencePool: Evidence[] = [];
        let success = true;
        let stepsExecuted = 0;
        let executionError = false;

        if (!this.page) throw new Error('BrowserTestRunner not initialized');

        console.log(`[BrowserTestRunner] Executing test: ${test.name}`);
        this.executionContext.onBrowserMessage?.(`[Kiểm thử UI] Bắt đầu: ${test.name}.`);

        try {
            if (!test.steps?.length) throw new Error('Browser test has no actions');
            if (test.startUrl) {
                await this.navigateToSubmission(test.startUrl);
            }
            for (const step of test.steps) {
                stepsExecuted++;
                const names = { navigate: 'Mở trang', click: 'Bấm nút/phần tử', fill: 'Điền thông tin', waitForSelector: 'Chờ phần tử', assertVisible: 'Kiểm tra hiển thị', assertText: 'Đối chiếu nội dung kết quả', assertValidation: 'Kiểm tra form từ chối dữ liệu không hợp lệ', screenshot: 'Chụp ảnh' };
                this.executionContext.onBrowserMessage?.(`[Thao tác UI ${stepsExecuted}/${test.steps.length}] ${names[step.action] || step.action}${step.target ? ': ' + step.target : ''}`);
                const evidence = await this.executeActionAsync(step);
                if (evidence) {
                    evidencePool.push(...evidence);
                }
                if (this.visible) await this.page.waitForTimeout(450);
            }
        } catch (error) {
            console.error(`[BrowserTestRunner] Test ${test.name} failed at step ${stepsExecuted}:`, error);
            success = false;
            executionError = /(?:browser|context|page|target).*closed|browser.*disconnected/i.test(String(error));
        }

        evidencePool.push(this.createEvidence('browser.workflow.completed', 1.0, {
            testId: test.id,
            success,
            stepsExecuted,
            ...(executionError ? { executionError: true } : {})
        }));

        this.executionContext.onBrowserMessage?.(`[Kiểm thử UI] ${test.name}: ${success ? 'ĐẠT' : executionError ? 'BỊ GIÁN ĐOẠN - cần chạy lại' : 'CHƯA ĐẠT'}.`);
        return evidencePool;
    }

    private async executeActionAsync(action: BrowserAction): Promise<Evidence[]> {
        const evidence: Evidence[] = [];
        const page = this.page!;

        switch (action.action) {
            case 'assertText':
                if (!action.target || action.value === undefined) throw new Error('Text assertion needs a target and expected text');
                await page.locator(action.target).filter({ hasText: action.value }).waitFor({ state: 'visible' });
                evidence.push(this.createEvidence('browser.text.verified', 1, { selector: action.target }));
                break;
            case 'assertValidation':
                if (!action.target) throw new Error('Validation assertion needs a form');
                await page.waitForFunction(({ form, expected }: { form: HTMLFormElement; expected: string }) => {
                    const alert = form.querySelector('[role=alert], [aria-live=assertive], .error, .error-message');
                    return (!form.noValidate && !form.checkValidity()) || !!(alert?.textContent?.trim() && (alert as HTMLElement).getClientRects().length && (!expected || new RegExp(expected, 'i').test(alert.textContent)));
                }, { form: await page.locator(action.target).elementHandle(), expected: action.value || '' }, { timeout: 10000 });
                evidence.push(this.createEvidence('browser.validation.verified', 1, { selector: action.target }));
                break;
            case 'navigate':
                if (action.target) {
                    const response = await this.navigateToSubmission(action.target);
                    evidence.push(this.createEvidence('browser.navigation.completed', 1.0, {
                        url: action.target,
                        ...(response ? { status: response.status() } : { sameDocument: true })
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
                    await page.locator(action.target).waitFor({ state: 'visible' });
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
                    const screenshotName = action.screenshotName.replace(/[^a-zA-Z0-9_-]/g, '_');
                    fs.mkdirSync(this.executionContext.artifactsDir, { recursive: true });
                    const tempPath = path.join(this.executionContext.artifactsDir, `${screenshotName}.png`);
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

        if (!evidence.length) throw new Error(`Invalid or incomplete browser action: ${action.action}`);
        return evidence;
    }

    private async navigateToSubmission(target: string) {
        const url = new URL(target, this.executionContext.baseUrl);
        if (url.origin !== new URL(this.executionContext.baseUrl).origin) throw new Error('Browser test navigation must stay in the running submission');
        const previous = new URL(this.page!.url());
        const sameDocument = previous.origin === url.origin && previous.pathname === url.pathname && previous.search === url.search;
        const response = await this.page!.goto(url.toString());
        // Playwright returns null for a valid hash-only navigation in an SPA.
        if (response ? !response.ok() : !sameDocument) throw new Error(`Navigation returned ${response?.status() || 0}`);
        return response;
    }

    public async teardownAsync(): Promise<void> {
        if (this.visible && this.page && !this.page.isClosed()) await this.page.waitForTimeout(1500).catch(() => {});
        if (this.page) {
            try { await this.page.close(); } 
            catch (e) { console.error(`[BrowserTestRunner] Error closing page: ${(e as Error).message}`); }
        }
        if (this.context) {
            try { await this.context.close(); } 
            catch (e) { console.error(`[BrowserTestRunner] Error closing context: ${(e as Error).message}`); }
        }
        if (this.browser && this.ownsBrowser) {
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

