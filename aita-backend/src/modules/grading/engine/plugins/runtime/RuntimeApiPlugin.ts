// @ts-nocheck
import { IEvidenceProvider } from '../../core/contracts/IEvidenceProvider';
import { PluginCapability } from '../../core/contracts/PluginCapability';
import { ExecutionContext } from '../../core/domain/execution/ExecutionContext';
import { Evidence } from '../../core/domain/evidence/Evidence';
import { RuntimeTestDefinition, HttpTestStep, HttpAssertion } from '../../core/domain/tests/RuntimeTestDefinition';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import Ajv from 'ajv';
import jp from 'jsonpath';

export class RuntimeApiPlugin implements IEvidenceProvider {
    public readonly pluginId = 'RuntimeApiPlugin';
    public readonly version = '2.0.0';
    private ajv = new Ajv({ allErrors: true });
    
    public readonly capabilities: PluginCapability = {
        pluginId: 'RuntimeApiPlugin',
        supportedProjectTypes: ['web'],
        supportedLanguages: ['csharp', 'typescript', 'java', 'python'],
        supportedEvidenceTypes: [
            'runtime.http.request_sent',
            'runtime.http.response_received',
            'runtime.http.status_validated',
            'runtime.http.schema_validated',
            'runtime.http.latency_measured',
            'runtime.http.variable_extracted',
            'runtime.auth.token_acquired',
            'runtime.workflow.completed'
        ],
        supportedTestDefinitions: ['RuntimeTestDefinition']
    };

    public async initializeAsync(config: any): Promise<void> {
        console.log(`[RuntimeApiPlugin] Initialized Real Verification Engine`);
    }

    public async executeAsync(context: ExecutionContext, tests: RuntimeTestDefinition[]): Promise<Evidence[]> {
        const evidencePool: Evidence[] = [];
        if (!context.apiUrl) throw new Error('RuntimeApiPlugin requires apiUrl.');

        for (const test of tests) {
            let workflowSuccess = true;
            const variables: Record<string, string> = {};
            let stepsExecuted = 0;

            for (const step of test.steps) {
                try {
                    stepsExecuted++;
                    const url = this.substituteVariables(`${context.apiUrl}${step.path}`, variables);
                    const headers = this.substituteHeaders(step.headers, variables);
                    const body = this.substituteBody(step.body, variables);

                    const startTime = Date.now();
                    evidencePool.push(this.createEvidence('runtime.http.request_sent', 1.0, { method: step.method, url }));

                    const config: AxiosRequestConfig = {
                        method: step.method,
                        url,
                        headers,
                        data: body,
                        validateStatus: () => true, // Don't throw on 4xx/5xx
                        timeout: 5000
                    };

                    const response = await axios(config);
                    const latencyMs = Date.now() - startTime;
                    const responseBody = response.data;
                    const status = response.status;
                    const contentType = response.headers['content-type'] || 'unknown';

                    evidencePool.push(this.createEvidence('runtime.http.response_received', 1.0, { status, contentType }));
                    evidencePool.push(this.createEvidence('runtime.http.latency_measured', 1.0, { latencyMs }));

                    // Extract Variables
                    if (step.extractVariables) {
                        for (const extract of step.extractVariables) {
                            let value: any;
                            if (extract.source === 'body' && extract.jsonPath && responseBody) {
                                const nodes = jp.query(responseBody, extract.jsonPath);
                                if (nodes.length > 0) value = nodes[0];
                            } else if (extract.source === 'header' && extract.headerName) {
                                value = response.headers[extract.headerName.toLowerCase()];
                            }

                            if (value !== undefined) {
                                variables[extract.variableName] = value.toString();
                                evidencePool.push(this.createEvidence('runtime.http.variable_extracted', 1.0, { variableName: extract.variableName, source: extract.source }));
                                
                                if (extract.variableName.toLowerCase().includes('token')) {
                                    evidencePool.push(this.createEvidence('runtime.auth.token_acquired', 1.0, { tokenType: 'Bearer', variableName: extract.variableName }));
                                }
                            }
                        }
                    }

                    // Process Assertions
                    for (const assertion of step.assertions) {
                        const { passed, errors } = this.evaluateAssertion(assertion, status, responseBody, response);
                        if (!passed) workflowSuccess = false;
                        
                        if (assertion.type === 'StatusCode') {
                            evidencePool.push(this.createEvidence('runtime.http.status_validated', passed ? 1.0 : 0.4, { expected: assertion.expected, actual: status, passed }));
                        } else if (assertion.type === 'JsonSchema') {
                            evidencePool.push(this.createEvidence('runtime.http.schema_validated', passed ? 1.0 : 0.4, { passed, errors }));
                        } else if (assertion.type === 'JsonPath') {
                            // Can add specific evidence here if needed
                        }
                    }

                } catch (error) {
                    workflowSuccess = false;
                    console.error(`Step ${step.name} failed:`, error);
                }
            }

            evidencePool.push(this.createEvidence('runtime.workflow.completed', 1.0, { testId: test.id, stepsExecuted, success: workflowSuccess }));
        }

        return evidencePool;
    }

    private substituteVariables(template: string, variables: Record<string, string>): string {
        if (!template) return template;
        return template.replace(/{{(.*?)}}/g, (_, key) => variables[key.trim()] || '');
    }

    private substituteHeaders(headers: Record<string, string> | undefined, variables: Record<string, string>): Record<string, string> {
        if (!headers) return {};
        const result: Record<string, string> = {};
        for (const [k, v] of Object.entries(headers)) {
            result[k] = this.substituteVariables(v, variables);
        }
        return result;
    }

    private substituteBody(body: any, variables: Record<string, string>): any {
        if (!body) return undefined;
        if (typeof body === 'string') return this.substituteVariables(body, variables);
        return JSON.parse(this.substituteVariables(JSON.stringify(body), variables));
    }

    private evaluateAssertion(assertion: HttpAssertion, status: number, body: any, response: AxiosResponse): { passed: boolean, errors?: string[] } {
        switch (assertion.type) {
            case 'StatusCode': 
                return { passed: status === assertion.expected };
            case 'JsonSchema': 
                const validate = this.ajv.compile(assertion.expected);
                const valid = validate(body);
                if (valid) return { passed: true };
                return { passed: false, errors: validate.errors?.map(e => `${e.instancePath} ${e.message}`) };
            case 'JsonPath':
                if (!assertion.jsonPath) return { passed: false, errors: ['Missing jsonPath'] };
                const nodes = jp.query(body, assertion.jsonPath);
                return { passed: nodes.length > 0 && nodes[0] === assertion.expected };
            case 'HeaderEquals':
                if (!assertion.jsonPath) return { passed: false }; // using jsonPath property to store header name for reuse
                const headerVal = response.headers[assertion.jsonPath.toLowerCase()];
                return { passed: headerVal === assertion.expected };
            case 'BodyContains':
                if (typeof body === 'string') {
                    return { passed: body.includes(assertion.expected) };
                } else {
                    return { passed: JSON.stringify(body).includes(assertion.expected) };
                }
            default: 
                return { passed: true };
        }
    }

    private createEvidence(type: string, confidence: number, payload: any): Evidence {
        return {
            id: `ev-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            source: this.pluginId,
            type,
            confidence,
            timestamp: new Date().toISOString(),
            payload
        };
    }

    public async disposeAsync(): Promise<void> {
        console.log(`[RuntimeApiPlugin] Disposed.`);
    }
}

