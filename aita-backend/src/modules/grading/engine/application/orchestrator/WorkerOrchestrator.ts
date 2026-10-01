// @ts-nocheck
import { Submission } from '../../core/domain/submission/Submission';
import { SubmissionStateMachine } from '../../core/domain/submission/SubmissionStateMachine';
import { SubmissionState } from '../../core/domain/submission/SubmissionState';
import { PublishedAssignment } from '../../core/domain/submission/PublishedAssignment';
import { EvidenceCatalog } from '../registries/EvidenceCatalog';
import * as fs from 'fs';
import * as path from 'path';
import { PluginRegistry, CapabilityResolver } from '../registries/PluginRegistry';
import { RubricEvaluator } from '../evaluator/RubricEvaluator';
import { ManifestResolver, ProjectTypeResolver } from '../resolvers/ManifestResolver';
import { EnvironmentResolver } from '../resolvers/EnvironmentResolver';
import { RuntimeStrategyResolver } from '../resolvers/RuntimeStrategyResolver';
import { IDatabaseProvisioner } from '../../core/contracts/IDatabaseProvisioner';
import { IEvidenceProvider } from '../../core/contracts/IEvidenceProvider';
import { Evidence } from '../../core/domain/evidence/Evidence';
import { AssessmentReport } from '../../core/domain/review/AssessmentReport';

export class WorkerOrchestrator {
    constructor(
        private evidenceCatalog: EvidenceCatalog,
        private capabilityResolver: CapabilityResolver,
        private rubricEvaluator: RubricEvaluator,
        private manifestResolver: ManifestResolver,
        private envResolver: EnvironmentResolver,
        private runtimeStrategyResolver: RuntimeStrategyResolver,
        private dbProvisioner: IDatabaseProvisioner
    ) {}

    public async processSubmissionAsync(submission: Submission, assignment: PublishedAssignment): Promise<AssessmentReport | undefined> {
        let activeContainerId: string | undefined;
        let connectionString = '';
        let dbInstanceId = '';
        let strategy: any = null;
        let executionContext: any = null;

        try {
            // 1. Resolve Manifest & Environment
            const resolvedManifest = await this.manifestResolver.resolveAsync(submission.sourceCodeUri, submission.manifest);
            submission.manifest = resolvedManifest;
            const env = await this.envResolver.resolveEnvironmentAsync(submission.sourceCodeUri);
            
            this.transitionState(submission, SubmissionState.Provisioning);

            // 2. Provision Database
            if (resolvedManifest.database) {
                const dbResult = await this.dbProvisioner.provisionDatabaseAsync(resolvedManifest.database);
                if (!dbResult.success) throw new Error(dbResult.error!);
                connectionString = dbResult.connectionString || '';
                dbInstanceId = dbResult.instanceId || '';
            }

            // 3. Resolve Runtime Strategy & Execute Sandbox
            this.transitionState(submission, SubmissionState.Building);
            strategy = this.runtimeStrategyResolver.resolveStrategy(resolvedManifest, env);
            
            // Build and run, returning the ExecutionContext
            executionContext = await strategy.buildAndStartAsync({ 
                sourcePath: submission.sourceCodeUri,
                env: connectionString ? { 'ConnectionStrings__DefaultConnection': connectionString } : undefined
            });
            this.transitionState(submission, SubmissionState.Running);

            // 4. Resolve & Execute Plugins with ExecutionContext
            this.transitionState(submission, SubmissionState.Analyzing);
            const plugins = this.capabilityResolver.resolveForManifest(resolvedManifest);
            
            const evidencePool: Evidence[] = [];
            for (const plugin of plugins) {
                // Ensure the plugin is an IEvidenceProvider
                if ('executeAsync' in plugin) {
                    const provider = plugin as unknown as IEvidenceProvider;
                    
                    // Combine runtime and browser tests into a single array passed to the plugin
                    const allTests = [
                        ...(assignment.testSuites?.runtime || []),
                        ...(assignment.testSuites?.browser || [])
                    ];
                    
                    // Plugins receive ExecutionContext, NOT the Sandbox directly
                    const emittedEvidence = await provider.executeAsync(executionContext, allTests);
                    
                    // Validate emitted evidence against EvidenceCatalog
                    for (const evidence of emittedEvidence) {
                        this.evidenceCatalog.validate(evidence);
                        evidencePool.push(evidence);
                    }
                }
            }

            // Dump Evidence (Phase 5)
            const evidenceDir = path.join(process.cwd(), 'artifacts', 'evidence');
            fs.mkdirSync(evidenceDir, { recursive: true });
            fs.writeFileSync(
                path.join(evidenceDir, `${submission.id}_evidence.json`), 
                JSON.stringify(evidencePool, null, 2)
            );

            // 5. Evaluate Validated Evidence
            this.transitionState(submission, SubmissionState.Evaluating);
            const report = await this.rubricEvaluator.evaluateAsync(
                submission.id, 
                assignment.id, 
                submission.studentId, 
                assignment.rubric, 
                {
                    sandbox: { containerId: null, baseUrl: null, projectType: "unknown", runtimeStack: "unknown", isReady: false },
                    sourceSnapshot: { projectType: 'unknown', files: [] },
                    evidencePool: evidencePool
                }
            );

            // 6. Final State Transition
            if (report.manualReviewNotes && report.manualReviewNotes.length > 0) {
                this.transitionState(submission, SubmissionState.ManualReview, 'Low confidence evidence detected.');
            } else {
                this.transitionState(submission, SubmissionState.Completed);
            }

            // TODO: Persist report via Reporting Engine
            return report;

        } catch (error) {
            this.transitionState(submission, SubmissionState.Failed, (error as Error).message);
        } finally {
            // Teardown everything safely without throwing
            const teardownTasks: Promise<void>[] = [];
            
            if (dbInstanceId) {
                teardownTasks.push(
                    this.dbProvisioner.destroyDatabaseAsync(dbInstanceId)
                        .catch(e => console.error(`[WorkerOrchestrator] Safe DB Teardown failed: ${(e as Error).message}`))
                );
            }
            
            if (strategy && executionContext) {
                teardownTasks.push(
                    strategy.teardownAsync(executionContext)
                        .catch((e: Error) => console.error(`[WorkerOrchestrator] Safe Sandbox Teardown failed: ${e.message}`))
                );
            }
            
            await Promise.allSettled(teardownTasks);
        }
    }

    private transitionState(submission: Submission, nextState: SubmissionState, reason?: string) {
        const historyEntry = SubmissionStateMachine.transition(submission.currentState, nextState, reason);
        submission.currentState = nextState;
        submission.statusHistory.push(historyEntry);
        // Log transition
        console.log(`[Submission ${submission.id}] Transitioned to ${nextState}`);
    }
}

