// @ts-nocheck
import { HTTPProbeSpec, HTTPProbeStep } from '../../core/domain/rubric/EvidenceMatcher';
import { JSONPath } from 'jsonpath-plus';

export interface ProbeResult {
  passed: boolean;
  confidence: number;
  stepResults: Array<{
    stepId: string;
    passed: boolean;
    httpStatus: number;
    expectedStatus: number;
    url?: string;
    method?: string;
    requestBody?: any;
    responseBody?: any;
    assertions: Array<{
      assertion: string;
      passed: boolean;
      actual: any;
    }>;
  }>;
}

export class HTTPProbeEngine {
  public async evaluateAsync(
    sandboxBaseUrl: string,
    probeSpec: HTTPProbeSpec,
    sharedVariables: Record<string, any> = {}
  ): Promise<ProbeResult> {

    const capturedVariables: Record<string, any> = sharedVariables;
    const stepResults = [];
    let isFirstStep = true;

    let stepIndex = 0;
    for (const step of probeSpec.steps) {
      stepIndex++;
      const stepId = step.stepId || `step_${stepIndex}`;
      const pathTemplate = step.pathTemplate || (step as any).url || (step as any).path || "";
      const resolvedPath = this.resolvePlaceholders(pathTemplate, capturedVariables);
      const resolvedBody = step.body ? this.resolvePlaceholders(JSON.stringify(step.body), capturedVariables) : undefined;

      try {
        let url = `${sandboxBaseUrl}${resolvedPath.startsWith('/') ? resolvedPath : '/' + resolvedPath}`;
        
        // SENIOR SAFETY NET: Smart ID Substitution
        // If the teacher hardcoded a dummy ID (e.g., '1', '123', '0') in the path, but we have a captured real ID,
        // we automatically substitute it to prevent false negatives when the student uses UUIDs or dynamic IDs.
        if (capturedVariables['id'] || capturedVariables['newId']) {
            const realId = capturedVariables['id'] || capturedVariables['newId'];
            url = url.replace(/\/(1|123|0)($|\/|\?)/, `/${realId}$2`);
        }

        console.log(`[HTTPProbeEngine] Executing step ${stepId}: ${step.method || 'GET'} ${url}`);

        if (url.includes('{') && url.includes('}')) {
          console.warn(`[HTTPProbeEngine] Unresolved placeholder in URL: ${url}. Failing step but continuing.`);
          stepResults.push({
            stepId: stepId,
            passed: false,
            httpStatus: 0,
            expectedStatus: step.expectedStatus,
            url: url,
            method: step.method || "GET",
            requestBody: step.body,
            assertions: [{ assertion: 'Valid URL Dependency', passed: false, actual: 'Unresolved placeholder (previous step likely failed)' }]
          });
          isFirstStep = false;
          continue;
        }

        let response: Response | undefined;
        let fetchError: any;
        
        // Retry logic for the FIRST request to handle slow backend startup (e.g. NPM install can take 30s)
        const maxRetries = isFirstStep ? 45 : 1;
        const retryDelayMs = 1000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Node.js fetch strictly forbids body on GET/HEAD requests
                const isGetOrHead = !step.method || step.method.toUpperCase() === "GET" || step.method.toUpperCase() === "HEAD";
                const fetchBody = isGetOrHead ? undefined : resolvedBody;

                const controller = new AbortController();
                const fetchTimeoutId = setTimeout(() => controller.abort(), 10000); // 10s max per request

                try {
                    response = await fetch(url, {
                        method: step.method || "GET",
                        headers: { "Content-Type": "application/json" },
                        body: fetchBody,
                        signal: controller.signal as any
                    });
                } finally {
                    clearTimeout(fetchTimeoutId);
                }
                
                break; // Success, exit retry loop
            } catch (err) {
                fetchError = err;
                if (attempt < maxRetries) {
                    console.log(`[HTTPProbeEngine] Connection refused for step ${stepId}. Retrying in ${retryDelayMs}ms (Attempt ${attempt}/${maxRetries})...`);
                    await new Promise(r => setTimeout(r, retryDelayMs));
                }
            }
        }
        
        if (!response) {
            throw fetchError;
        }
        
        isFirstStep = false;

        // Try parsing JSON, fallback to null if empty/invalid
        let responseBody = null;
        const text = await response.text();
        if (text) {
          try { responseBody = JSON.parse(text); } catch { responseBody = text; }
        }

        // SENIOR SAFETY NET: Auto-capture common identifiers (id) from responses 
        // to handle cases where AI forgets to specify 'captureFromResponse'
        if (responseBody && typeof responseBody === 'object') {
          if (responseBody.id !== undefined) {
            capturedVariables['id'] = String(responseBody.id);
          } else if (Array.isArray(responseBody) && responseBody.length > 0 && responseBody[0].id !== undefined) {
            capturedVariables['id'] = String(responseBody[0].id);
          }
        }

        // Capture variable from response if specified
        if (step.captureFromResponse) {
          const captured = this.evaluateJsonPath(responseBody, step.captureFromResponse.jsonPath);
          if (captured !== null && captured !== undefined) {
            capturedVariables[step.captureFromResponse.variable] = String(captured);
          }
        }

        // Evaluate assertions
        const assertionResults = (step.assertions || []).map(assertion => {
          const resolvedJsonPath = this.resolvePlaceholders(assertion.jsonPath, capturedVariables);
          const expectedVal = assertion.value !== undefined ? assertion.value : (assertion as any).expectedValue;
          const resolvedValue = expectedVal !== undefined
            ? this.resolvePlaceholders(String(expectedVal), capturedVariables)
            : undefined;
          
          if (response.status === 204) {
            return {
              assertion: `${resolvedJsonPath} (skipped due to 204 No Content)`,
              passed: true,
              actual: null
            };
          }

          const passed = this.evaluateAssertion(responseBody, resolvedJsonPath, assertion.assertType, resolvedValue);
          let actual = this.evaluateJsonPath(responseBody, resolvedJsonPath);
          
          if (!passed && (actual === null || actual === undefined)) {
            actual = "Không tìm thấy thuộc tính này (null)";
          }

          return {
            assertion: `${resolvedJsonPath} ${assertion.assertType} ${resolvedValue ?? ""}`.trim(),
            passed,
            actual
          };
        });

        // Lenient Status Checking: If the rubric doesn't strictly mandate a specific expectedStatus, accept any 2xx Success code.
        let isStatusMatch = false;
        if (!step.expectedStatus || step.expectedStatus === 200) {
            isStatusMatch = response.status >= 200 && response.status < 300;
        } else {
            isStatusMatch = response.status === step.expectedStatus;
        }

        const stepPassed = isStatusMatch && assertionResults.every(a => a.passed);

        stepResults.push({
          stepId: stepId,
          passed: stepPassed,
          httpStatus: response.status,
          expectedStatus: step.expectedStatus,
          url,
          method: step.method || "GET",
          requestBody: step.body,
          responseBody,
          assertions: assertionResults
        });

        // Do NOT stop on first failed step! 
        // In an educational context, we want to maximize partial credit.
        if (!stepPassed) {
          console.log(`[HTTPProbeEngine] Step ${stepId} failed, but continuing to evaluate remaining steps for partial credit.`);
        }
      } catch (error: any) {
        // Retry once on first step failure (EF Core migrations may still be running)
        if (isFirstStep) {
          console.log(`[HTTPProbeEngine] First step failed, retrying after 2s warmup...`);
          await new Promise(r => setTimeout(r, 2000));
          isFirstStep = false;
          try {
            const retryUrl = `${sandboxBaseUrl}${pathTemplate.startsWith('/') ? pathTemplate : '/' + pathTemplate}`;
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);
            
            let retryResponse;
            try {
                retryResponse = await fetch(retryUrl, {
                  method: step.method || "GET",
                  headers: { "Content-Type": "application/json" },
                  body: step.body ? JSON.stringify(step.body) : undefined,
                  signal: retryController.signal as any
                });
            } finally {
                clearTimeout(retryTimeoutId);
            }
            
            // If retry succeeds at all, continue the loop from the top
            if (retryResponse.status > 0) {
              console.log(`[HTTPProbeEngine] Retry succeeded (status ${retryResponse.status}), re-evaluating...`);
              continue;
            }
          } catch (retryErr) {
            // Retry also failed, fall through to error
          }
        }
        console.error(`[HTTPProbeEngine] Fetch error on step ${stepId}:`, error);
        
        // Use resolved url if available, otherwise template
        const failedUrl = `${sandboxBaseUrl}${pathTemplate.startsWith('/') ? pathTemplate : '/' + pathTemplate}`;
        
        stepResults.push({
          stepId: stepId,
          passed: false,
          httpStatus: 0,
          expectedStatus: step.expectedStatus,
          url: failedUrl,
          method: step.method || "GET",
          requestBody: step.body,
          assertions: [{ assertion: 'Network Error', passed: false, actual: error.message }]
        });
        
        console.log(`[HTTPProbeEngine] Step ${stepId} threw an error, but continuing to remaining steps.`);
        // We removed the break statement here to ensure remaining independent steps (like GETs) can still run.
      }
      isFirstStep = false;
    }

    const allPassed = stepResults.length === probeSpec.steps.length && stepResults.every(s => s.passed);
    return {
      passed: allPassed,
      confidence: allPassed ? 1.0 : stepResults.filter(s => s.passed).length / probeSpec.steps.length,
      stepResults
    };
  }

  private resolvePlaceholders(template: string, variables: Record<string, any>): string {
    // Intelligent variable resolver: handles both {var} and {{var}} (Mustache) syntax.
    // Also provides smart fallback: if {{productId}} or {orderId} can't be found,
    // try the generic 'id' variable (set by auto-capture).
    const resolve = (match: string, varName: string): string => {
      if (variables[varName] !== undefined) return String(variables[varName]);
      // Fallback: any *Id or *_id variable → try generic 'id'
      if (/id$/i.test(varName) && variables['id'] !== undefined) return String(variables['id']);
      return match;
    };
    // Pass 1: Resolve {{variable}} (Mustache-style, used by some AI models)
    let result = template.replace(/\{\{([^}]+)\}\}/g, resolve);
    // Pass 2: Resolve {variable} (standard style)
    result = result.replace(/\{([^{}]+)\}/g, resolve);
    return result;
  }

  private evaluateJsonPath(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return null;
    try {
      const result = JSONPath({ path, json: obj });
      if (result && result.length === 1) return result[0];
      if (result && result.length > 1) return result;
      return null;
    } catch (e) {
      console.warn(`[HTTPProbeEngine] Invalid JSONPath: ${path}`);
      return null;
    }
  }

  private evaluateAssertion(obj: any, path: string, assertType: string, expectedValue?: any): boolean {
    let actual = this.evaluateJsonPath(obj, path);
    
    // ROOT-LEVEL ARRAY FALLBACK: If `$.field` returns null but response is itself
    // an array, try evaluating the root `$` directly. This handles common REST patterns
    // where students return `[{...}]` instead of `{field: [{...}]}`.
    if ((actual === null || actual === undefined) && Array.isArray(obj) && path.startsWith('$.') && path.split('.').length === 2) {
      console.log(`[HTTPProbeEngine] Assertion fallback: '${path}' returned null but response is a root-level array. Trying '$' instead.`);
      actual = obj;
    }
    
    switch (assertType) {
      case "exists":
        return actual !== null && actual !== undefined;
      case "not_exists":
      case "notExists":
        return actual === null || actual === undefined;
      case "equals":
        return String(actual) === String(expectedValue);
      case "contains":
        return String(actual).includes(String(expectedValue));
      case "greater_than":
      case "greaterThan":
        return parseFloat(actual) > parseFloat(expectedValue);
      case "isArray":
        return Array.isArray(actual);
      case "count_equals":
        return Array.isArray(actual) && actual.length === parseInt(expectedValue, 10);
      case "count_gt":
        return Array.isArray(actual) && actual.length > parseInt(expectedValue, 10);
      case "not_empty":
      case "notEmpty":
        if (Array.isArray(actual)) return actual.length > 0;
        if (typeof actual === 'string') return actual.length > 0;
        return actual !== null && actual !== undefined;
      case "greater_than":
        return parseFloat(actual) > parseFloat(expectedValue);
      case "less_than":
        return parseFloat(actual) < parseFloat(expectedValue);
      default:
        console.warn(`[HTTPProbeEngine] Unknown assertType: ${assertType}`);
        return false;
    }
  }
}

