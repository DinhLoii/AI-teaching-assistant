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
        let failureMessage: string | undefined;
        const stepResults: any[] = [];
        const startedAt = Date.now();

        if (!this.page) throw new Error('BrowserTestRunner not initialized');

        console.log(`[BrowserTestRunner] Executing test: ${test.name}`);
        this.executionContext.onBrowserMessage?.(`[Kiểm thử UI] Bắt đầu: ${test.name}.`);

        try {
            if (!test.steps?.length) throw new Error('Browser test has no actions');
            if (test.startUrl) {
                await this.navigateToSubmission(test.startUrl);
            }
            if (this.visible) await this.page.bringToFront();
            for (const step of test.steps) {
                stepsExecuted++;
                const names = { navigate: 'Mở trang', click: 'Bấm nút/phần tử', fill: 'Điền thông tin', waitForSelector: 'Chờ phần tử', assertVisible: 'Kiểm tra hiển thị', assertText: 'Đối chiếu nội dung kết quả', assertValidation: 'Kiểm tra form từ chối dữ liệu không hợp lệ', screenshot: 'Chụp ảnh' };
                this.executionContext.onBrowserMessage?.(`[Thao tác UI ${stepsExecuted}/${test.steps.length}] ${names[step.action] || step.action}${step.target ? ': ' + step.target : ''}`);
                if (this.visible) await this.presentStep(test.id, stepsExecuted, test.steps.length, names[step.action] || step.action, step.target);
                const trace: any = { index: stepsExecuted, action: step.action, target: step.target,
                    expected: step.action === 'assertText' ? step.value : ['assertVisible','waitForSelector'].includes(step.action) ? 'Phần tử xuất hiện và hiển thị' : step.action === 'assertValidation' ? 'Form từ chối dữ liệu không hợp lệ' : names[step.action] || step.action,
                    status: 'running' };
                stepResults.push(trace);
                let evidence;
                try {
                    evidence = await this.executeActionAsync(step);
                    trace.status = 'passed';
                    trace.actual = await this.observeTarget(step.target);
                } catch (error) {
                    trace.status = 'failed';
                    trace.error = error instanceof Error ? error.message : String(error);
                    trace.actual = await this.observeTarget(step.target);
                    throw error;
                }
                if (evidence) {
                    evidencePool.push(...evidence);
                }
                if (this.visible) await this.page.waitForTimeout(450);
            }
        } catch (error) {
            console.error(`[BrowserTestRunner] Test ${test.name} failed at step ${stepsExecuted}:`, error);
            success = false;
            failureMessage = error instanceof Error ? error.message : String(error);
            executionError = /(?:browser|context|page|target).*closed|browser.*disconnected/i.test(String(error));
        }

        evidencePool.push(this.createEvidence('browser.workflow.completed', 1.0, {
            testId: test.id,
            testName: test.name,
            success,
            stepsExecuted,
            steps: stepResults,
            failedStep: stepResults.find(step => step.status === 'failed'),
            executionMs: Date.now() - startedAt,
            isHidden: test.isHidden === true,
            ...(failureMessage ? { error: failureMessage } : {}),
            ...(executionError ? { executionError: true } : {})
        }));

        this.executionContext.onBrowserMessage?.(`[Kiểm thử UI] ${test.name}: ${success ? 'ĐẠT' : executionError ? 'BỊ GIÁN ĐOẠN - cần chạy lại' : 'CHƯA ĐẠT'}.`);
        return evidencePool;
    }

    private async executeActionAsync(action: BrowserAction): Promise<Evidence[]> {
        const evidence: Evidence[] = [];
        const page = this.page!;

        switch (action.action) {
            case 'reload':
                await page.reload({ waitUntil: 'domcontentloaded' });
                evidence.push(this.createEvidence('browser.navigation.completed', 1, { reload: true }));
                break;
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
                    await page.screenshot({ path: tempPath, fullPage: true, style: '[data-aita-runner] { visibility: hidden !important; }' });
                    
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

    private async observeTarget(target?: string) {
        if (!target || !this.page || this.page.isClosed?.()) return undefined;
        try {
            const locator = this.page.locator(target);
            const count = await locator.count();
            if (!count) return { count: 0, visible: false, description: 'Không tìm thấy phần tử khớp điều kiện kiểm tra.' };
            return await locator.first().evaluate((element, count) => ({ count,
                visible: !!element.getClientRects().length,
                text: (element.textContent || '').trim().slice(0, 1000),
                ...(element instanceof HTMLInputElement && element.type === 'number' ? { value: element.value } : {})
            }), count);
        } catch { return { description: 'Không thu thập được trạng thái phần tử sau thao tác.' }; }
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

    /** Observation only: actions and pass/fail assertions still execute against the submitted app. */
    private async presentStep(testId: string, index: number, total: number, action: string, target?: string) {
        const page = this.page!;
        await page.bringToFront();
        let box = null;
        if (target) {
            const locator = page.locator(target).first();
            if (await locator.count()) {
                await locator.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
                box = await locator.boundingBox({ timeout: 1000 }).catch(() => null);
            }
        }
        if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await page.evaluate(({testId,index,total,action,box}) => {
            document.querySelectorAll('[data-aita-runner]').forEach(node => node.remove());
            const label = document.createElement('div'); label.setAttribute('data-aita-runner','status');
            label.textContent = `${testId} · ${index}/${total} · ${action}`;
            label.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;pointer-events:none;background:#163a50;color:white;padding:12px 18px;border-radius:8px;font:14px Arial,sans-serif;box-shadow:0 2px 12px #0004';
            document.body.appendChild(label);
            if (box) {
                const marker = document.createElement('div'); marker.setAttribute('data-aita-runner','target');
                marker.style.cssText = `position:fixed;left:${box.x-4}px;top:${box.y-4}px;width:${box.width+8}px;height:${box.height+8}px;z-index:2147483646;pointer-events:none;border:3px solid #ff8c00;border-radius:6px;background:#ff8c0015`;
                document.body.appendChild(marker);
            }
        }, {testId,index,total,action,box});
        await page.waitForTimeout(350);
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

