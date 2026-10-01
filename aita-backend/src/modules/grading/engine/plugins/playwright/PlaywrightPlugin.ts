// @ts-nocheck
import { IEvidenceProvider } from '../../core/contracts/IEvidenceProvider';
import { PluginCapability } from '../../core/contracts/PluginCapability';
import { ExecutionContext } from '../../core/domain/execution/ExecutionContext';
import { Evidence } from '../../core/domain/evidence/Evidence';
import { BrowserTestDefinition } from '../../core/domain/tests/BrowserTestDefinition';
import { BrowserTestRunner } from './BrowserTestRunner';
import { BrowserExecutionContext } from './BrowserExecutionContext';
import { IArtifactStore } from '../../core/contracts/IArtifactStore';

export class PlaywrightPlugin implements IEvidenceProvider {
    public readonly pluginId = 'PlaywrightPlugin';
    public readonly version = '1.0.0';
    
    public readonly capabilities: PluginCapability = {
        pluginId: 'PlaywrightPlugin',
        supportedProjectTypes: ['web'],
        supportedLanguages: ['javascript', 'typescript', 'react', 'angular', 'vue'],
        supportedEvidenceTypes: [
            'browser.navigation.completed',
            'browser.element.visible',
            'browser.element.clicked',
            'browser.input.filled',
            'browser.screenshot.captured',
            'browser.workflow.completed'
        ],
        supportedTestDefinitions: ['BrowserTestDefinition']
    };

    constructor(private readonly artifactStore: IArtifactStore) {}

    public async initializeAsync(config: any): Promise<void> {
        console.log(`[PlaywrightPlugin] Initialized.`);
    }

    public async executeAsync(context: ExecutionContext, tests: BrowserTestDefinition[]): Promise<Evidence[]> {
        console.log(`[PlaywrightPlugin] Starting execution for ${tests.length} tests.`);
        
        if (!context.apiUrl) {
            throw new Error('PlaywrightPlugin requires apiUrl in ExecutionContext to run UI tests.');
        }

        const browserContext: BrowserExecutionContext = {
            ...context,
            baseUrl: context.apiUrl,
            artifactsDir: context.sandboxWorkspacePath || '/tmp/grading_artifacts'
        };

        const runner = new BrowserTestRunner(this.pluginId, browserContext, this.artifactStore);
        const allEvidence: Evidence[] = [];

        try {
            await runner.initializeAsync();
            
            for (const test of tests) {
                const evidence = await runner.executeTestAsync(test);
                allEvidence.push(...evidence);
            }
        } finally {
            try {
                await runner.teardownAsync();
            } catch (error) {
                console.error(`[PlaywrightPlugin] Teardown failed but preserving evidence: ${(error as Error).message}`);
            }
        }

        return allEvidence;
    }

    public async disposeAsync(): Promise<void> {
        console.log(`[PlaywrightPlugin] Disposed.`);
    }
}

