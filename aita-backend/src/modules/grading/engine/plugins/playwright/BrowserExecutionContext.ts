// @ts-nocheck
import { ExecutionContext } from '../../core/domain/execution/ExecutionContext';

/**
 * Extends the generic ExecutionContext for browser-specific operations.
 */
export interface BrowserExecutionContext extends ExecutionContext {
    /**
     * The internal network address where the web application is running.
     */
    baseUrl: string;
    
    /**
     * A temporary directory mapped into the sandbox for saving screenshots/traces.
     */
    artifactsDir: string;
}

