// @ts-nocheck
import { IAssessmentPlugin } from './IAssessmentPlugin';
import { ExecutionContext } from '../domain/execution/ExecutionContext';
import { Evidence } from '../domain/evidence/Evidence';

/**
 * Defines a plugin capable of observing a submission and emitting Evidence.
 */
export interface IEvidenceProvider extends IAssessmentPlugin {
    /**
     * Executes the plugin's logic against the strictly isolated ExecutionContext.
     * @param context The execution environment (API urls, paths, artifacts).
     * @param tests The relevant test definitions this plugin is capable of running.
     */
    executeAsync(context: ExecutionContext, tests: any[]): Promise<Evidence[]>;
}

