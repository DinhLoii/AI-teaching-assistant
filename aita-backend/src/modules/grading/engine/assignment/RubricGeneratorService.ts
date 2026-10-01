// @ts-nocheck
import { DraftBlueprint } from './BlueprintService';
import { RubricDefinition } from '../core/domain/rubric/RubricDefinition';
import { RubricRule } from '../core/domain/rubric/RubricRule';
import { IAiProvider, ParsedRequirement } from '../core/contracts/IAiProvider';

export class RubricGeneratorService {
    constructor(private readonly aiProvider: IAiProvider) {}

    /**
     * Generates a concrete RubricDefinition from a Blueprint.
     * 
     * ARCHITECTURE NOTE:
     * - The AI generates rule titles, descriptions, and categories.
     * - Weight assignment and scoringStrategy are computed DETERMINISTICALLY 
     *   in this service, NOT by the AI. This eliminates the problem of LLMs
     *   assigning identical weights or ignoring isUIVisible flags.
     */
    public async generateRubricAsync(blueprint: DraftBlueprint): Promise<RubricDefinition> {
        console.log(`[RubricGeneratorService] Generating Rubric for ${blueprint.id}...`);

        let rules: RubricRule[] = [];
        const requirements: ParsedRequirement[] = blueprint.requirements;
        const projectType = (blueprint as any).projectType || "unknown";

        try {
            rules = await this.aiProvider.generateRubricRulesAsync(requirements, projectType, (blueprint as any).originalContent || blueprint.description);
        } catch (error) {
            console.error('[RubricGeneratorService] AI Rule generation failed, falling back to basic rules.', error);
            rules = requirements.map((req: any, i) => ({
                id: `rule-${i}`,
                title: req.title || `Requirement ${i + 1}`,
                description: req.description || JSON.stringify(req),
                category: 'Functional',
                weight: 10,
                scoringStrategy: 'AICodeReview',
                requiredEvidence: []
            }));
        }

        // ═══════════════════════════════════════════════════════
        // DETERMINISTIC POST-PROCESSING — Override AI decisions
        // ═══════════════════════════════════════════════════════

        // 1. Force scoringStrategy based on isUIVisible from parsed requirements
        const fullContext = (blueprint.assignmentTitle + " " + blueprint.description + " " + requirements.map(r => r.title + " " + r.description).join(" "));
        rules = this.applyScoringStrategies(rules, requirements, projectType, fullContext);

        // 2. Compute weights deterministically from marks + complexity
        rules = this.computeWeights(rules, requirements, (blueprint as any).hasExplicitRubric);

        // 3. Deterministically extract Setup Script for SQL assignments
        const originalContent = (blueprint as any).originalContent || blueprint.description;
        if (originalContent) {
            rules = this.extractAndInjectSqlSetupScript(rules, originalContent);
        }

        return {
            id: `rubric-${Date.now()}`,
            assignmentId: blueprint.id,
            version: blueprint.version,
            title: blueprint.assignmentTitle + ' Rubric',
            totalWeight: Math.round(rules.reduce((sum, r) => sum + r.weight, 0) * 100) / 100,
            passThreshold: 0.7,
            rules
        };
    }

    /**
     * Deterministically extracts the setup script from the original SQL file and injects it into SqlExecutionProbe rules.
     * Bypasses the AI to prevent truncation of large INSERT statement blocks.
     */
    public extractAndInjectSqlSetupScript(rules: RubricRule[], originalContent: string): RubricRule[] {
        const sqlRules = rules.filter(r => r.scoringStrategy === 'SqlExecutionProbe');
        if (sqlRules.length === 0) {
            return rules;
        }

        let setupScript = originalContent;

        // Subtractive method: Iteratively remove all extracted queries from the original content
        for (const rule of sqlRules) {
            if (rule.requiredEvidence && rule.requiredEvidence.length > 0) {
                const probe = rule.requiredEvidence[0].sqlProbe;
                if (probe && probe.testCases) {
                    for (const tc of probe.testCases) {
                        if (tc.query) {
                            setupScript = this.fuzzyReplace(setupScript, tc.query);
                        }
                    }
                }
            }
        }

        // Clean up excessive whitespace
        setupScript = setupScript.replace(/\n{3,}/g, '\n\n').trim();

        // Strip out CREATE DATABASE, DROP DATABASE, and USE statements.
        setupScript = setupScript.replace(/CREATE\s+DATABASE\s+[a-zA-Z0-9_\[\]`"']+/gi, '');
        setupScript = setupScript.replace(/DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?[a-zA-Z0-9_\[\]`"']+/gi, '');
        setupScript = setupScript.replace(/USE\s+[a-zA-Z0-9_\[\]`"']+/gi, '');

        if (setupScript) {
            // Inject the extracted setup script into all SQL rules
            return rules.map(rule => {
                if (rule.scoringStrategy === 'SqlExecutionProbe' && rule.requiredEvidence && rule.requiredEvidence.length > 0) {
                    const probe = rule.requiredEvidence[0].sqlProbe;
                    if (probe) {
                        probe.setupScript = setupScript;
                    }
                }
                return rule;
            });
        }

        return rules;
    }

    private fuzzyReplace(text: string, search: string): string {
        const normText = text.replace(/\r\n/g, '\n');
        const normSearch = search.replace(/\r\n/g, '\n');

        let idx = normText.indexOf(normSearch);
        if (idx !== -1) {
            // Note: we can safely return the normalized string, it works perfectly fine
            return normText.substring(0, idx) + normText.substring(idx + normSearch.length);
        }
        
        idx = text.indexOf(search);
        if (idx !== -1) {
            return text.substring(0, idx) + text.substring(idx + search.length);
        }
        
        // Fallback: try to find start and end fragments to handle minor whitespace tweaks
        const startFrag = search.substring(0, 30).trim();
        const endFrag = search.substring(Math.max(0, search.length - 30)).trim();
        
        if (startFrag && endFrag) {
            const startIdx = text.lastIndexOf(startFrag); // Use lastIndexOf to avoid matching the DB setup scripts at the top!
            if (startIdx !== -1) {
                const endIdx = text.indexOf(endFrag, startIdx);
                if (endIdx !== -1) {
                    return text.substring(0, startIdx) + text.substring(endIdx + endFrag.length);
                }
            }
        }
        return text; // Return original if not found
    }

    /**
     * Validates and finalizes scoringStrategy based on STRUCTURAL CONSTRAINTS only.
     * 
     * ARCHITECTURE: generateRubricRulesAsync already resolved the correct strategy
     * from AI's recommendedEngine. This method ONLY applies hard constraints that
     * the AI cannot know about (project type limitations, probe availability).
     * It does NOT re-classify using keyword heuristics.
     */
    private applyScoringStrategies(rules: RubricRule[], requirements: ParsedRequirement[], projectType: string, fullContext?: string): RubricRule[] {
        const pt = projectType.toLowerCase();
        const isHttpProbeAvailable = ["web", "backend", "frontend", "fullstack", "aspnet", "nodejs", "java", "php", "golang", "blazor"].some(k => pt.includes(k));
        const contextText = (fullContext || "").toLowerCase();
        const isRestApi = /api|rest|swagger|endpoint/.test(contextText);
        const isServerUI = /blazor|mvc|razor/.test(contextText);
        const allowHttpProbe = isHttpProbeAvailable && (!isServerUI || isRestApi);

        return rules.map((rule, index) => {
            const req = requirements[index];
            if (!req) return rule;

            // ══════════════════════════════════════════════════════════════
            // STEP 1: Accept the strategy from generateRubricRulesAsync.
            // ══════════════════════════════════════════════════════════════
            let finalStrategy = rule.scoringStrategy;

            // ══════════════════════════════════════════════════════════════
            // STEP 2: Apply STRUCTURAL CONSTRAINTS.
            //         These are hard rules the AI cannot evaluate.
            // ══════════════════════════════════════════════════════════════

            // Constraint A: HTTPProbe requires web project with API context
            if (finalStrategy === 'HTTPProbe' && !allowHttpProbe) {
                finalStrategy = 'AICodeReview';
            }

            // Constraint B: AIVision requires browser/device capability
            if (finalStrategy === 'AIVision' && !isHttpProbeAvailable && !pt.includes('mobile')) {
                finalStrategy = 'AICodeReview';
            }

            // Constraint C: Soft delete has a specialized multi-step HTTPProbe sequence
            if (req.isSoftDelete === true) {
                return this.buildSoftDeleteRule(rule, req, allowHttpProbe);
            }

            // Constraint D: StdInOutProbe must have valid test cases
            if (finalStrategy === 'StdInOutProbe'
                && !rule.requiredEvidence?.some((e: any) => e.stdInOutProbe?.testCases?.length > 0)) {
                finalStrategy = 'AICodeReview';
            }

            // Constraint E: SqlExecutionProbe used to require valid sqlProbe spec, but we now allow it
            // to pass through because the teacher will provide the sql schema/dump later in the process.

            // ══════════════════════════════════════════════════════════════
            // STEP 3: Build the final rule with correct evidence types.
            // ══════════════════════════════════════════════════════════════
            return this.buildRuleForStrategy(rule, req, finalStrategy);
        }) as RubricRule[];
    }

    /**
     * Constructs a complete RubricRule with the correct evidence types for a given strategy.
     */
    private buildRuleForStrategy(rule: RubricRule, req: ParsedRequirement, strategy: string): any {
        const isHybrid = req.recommendedEngine === 'HybridVisionAndCode'
                      || req.recommendedEngine === 'HybridTextAndCode';
        const textToCheck = (req.title + ' ' + req.description).toLowerCase();
        const isArchTask = req.isArchitectureCode || /architect|mvvm|mvc|clean|repository|layer/i.test(textToCheck);

        switch (strategy) {
            case 'HTTPProbe':
                // Evidence already populated by generateRubricRulesAsync with httpProbe steps.
                // Only enrich metadata.
                return {
                    ...rule,
                    scoringStrategy: 'HTTPProbe',
                    category: rule.category || 'Functional',
                    contextHint: req.partLabel || rule.contextHint || undefined,
                    isHybrid: isHybrid || undefined,
                };

            case 'AIVision':
                return {
                    ...rule,
                    scoringStrategy: 'AIVision',
                    category: req.isUIVisible ? 'UI/UX' as any : (rule.category || 'Functional'),
                    contextHint: req.partLabel || rule.contextHint || undefined,
                    isHybrid: isHybrid || undefined,
                    requiredEvidence: isHybrid
                        ? [
                            { evidenceType: 'browser.screenshot.captured' as any, minimumConfidence: 0.9 },
                            { evidenceType: 'ai.code.reviewed' as any, minimumConfidence: 0.85, semanticDescription: rule.description }
                          ]
                        : [{ evidenceType: 'browser.screenshot.captured' as any, minimumConfidence: 0.9 }],
                };

            case 'AiTextAnalysis':
                return {
                    ...rule,
                    scoringStrategy: 'AiTextAnalysis',
                    category: this.classifyTextCategory(req) as any,
                    contextHint: req.partLabel || rule.contextHint || undefined,
                    isHybrid: isHybrid || undefined,
                    referenceAnswer: req.referenceAnswer || "Học sinh cần trả lời đúng trọng tâm câu hỏi. Đánh giá dựa trên sự hiểu biết và giải thích hợp lý.",
                    requiredEvidence: [{
                        evidenceType: 'ai.text.analyzed' as any,
                        minimumConfidence: 0.7,
                        semanticDescription: rule.description,
                    }],
                };

            case 'StdInOutProbe':
                // Fully populated by generateRubricRulesAsync. Preserve as-is.
                return rule;

            case 'SqlExecutionProbe':
                // SqlProbe spec is populated externally (by the grading controller when
                // the teacher provides a setup script + answer key). Preserve as-is.
                return {
                    ...rule,
                    scoringStrategy: 'SqlExecutionProbe',
                    category: 'Functional' as any,
                    contextHint: req.partLabel || rule.contextHint || undefined,
                };

            case 'AICodeReview':
            default:
                return {
                    ...rule,
                    scoringStrategy: 'AICodeReview',
                    category: isArchTask ? 'Architecture' as any : (rule.category || 'Functional' as any),
                    contextHint: req.partLabel || rule.contextHint || undefined,
                    requiredEvidence: [{
                        evidenceType: 'ai.code.reviewed' as any,
                        minimumConfidence: 0.85,
                        semanticDescription: isArchTask
                            ? `Evaluate the project architecture. The student may use ANY architecture pattern (e.g., MVC, MVVM, Clean Architecture, Repository Pattern) or follow the requested design. Verify that there is a clear separation of concerns with distinct layers. Do NOT penalize for minor naming differences as long as the structural intent is correct.`
                            : rule.description,
                    }],
                };
        }
    }

    /**
     * Classifies the category for text/written answer requirements.
     */
    private classifyTextCategory(req: ParsedRequirement): string {
        const text = (req.title + ' ' + req.description).toLowerCase();
        if (/debug|bug|fix|error/.test(text)) return 'Functional';
        if (/architect|design|pattern|review|analysis|strength|weakness|improvement/.test(text)) return 'Architecture';
        return 'Theory';
    }

    /**
     * Builds a specialized rule for soft delete requirements.
     * Soft delete requires a multi-step HTTPProbe sequence to verify that
     * the entity is logically hidden rather than physically removed.
     */
    private buildSoftDeleteRule(rule: RubricRule, req: ParsedRequirement, allowHttpProbe: boolean): any {
        if (allowHttpProbe) {
            const match = req.title.match(/(?:delete|remove)\s+([a-zA-Z]+)/i);
            const entityName = match ? match[1].toLowerCase() : "item";

            return {
                ...rule,
                scoringStrategy: 'HTTPProbe',
                requiredEvidence: [{
                    evidenceType: 'runtime.http.probed' as any,
                    minimumConfidence: 0.9,
                    httpProbe: {
                        description: `Multi-step probe to verify soft delete for ${entityName}`,
                        steps: [
                            {
                                stepId: "s1",
                                method: "POST",
                                pathTemplate: `/api/${entityName}s`,
                                expectedStatus: 201,
                                body: { name: `Test ${entityName}`, price: 100, stockQuantity: 10, category: "Test", isAvailable: true },
                                captureFromResponse: { variable: "id", jsonPath: "$.id" },
                                assertions: []
                            },
                            {
                                stepId: "s2",
                                method: "DELETE",
                                pathTemplate: `/api/${entityName}s/{id}`,
                                expectedStatus: 204,
                                body: {},
                                captureFromResponse: {},
                                assertions: []
                            },
                            {
                                stepId: "s3",
                                method: "GET",
                                pathTemplate: `/api/${entityName}s/{id}`,
                                expectedStatus: 200,
                                body: {},
                                captureFromResponse: {},
                                assertions: [
                                    { jsonPath: "$.isAvailable", assertType: "equals", value: false }
                                ]
                            },
                            {
                                stepId: "s4",
                                method: "GET",
                                pathTemplate: `/api/${entityName}s`,
                                expectedStatus: 200,
                                body: {},
                                captureFromResponse: {},
                                assertions: [
                                    { jsonPath: "$[?(@.id == {id})]", assertType: "notExists" }
                                ]
                            }
                        ]
                    }
                }]
            };
        } else {
            return {
                ...rule,
                scoringStrategy: 'AICodeReview',
                requiredEvidence: [{
                    evidenceType: 'ai.code.reviewed' as any,
                    minimumConfidence: 0.9,
                    semanticDescription: `Inspect the code for soft delete logic. Ensure the entity is NOT removed from the database, but rather its isActive or isAvailable property is set to false, and changes are saved.`
                }]
            };
        }
    }

    private computeWeights(rules: RubricRule[], requirements: ParsedRequirement[], hasExplicitRubric?: boolean): RubricRule[] {
        // Find if ANY requirement has explicit marks assigned by the AI, but only if the prompt explicitly contained rubric points
        const withMarks = (hasExplicitRubric !== false) ? requirements.filter(r => typeof r.marks === 'number' && r.marks > 0) : [];
        const hasExplicitMarks = withMarks.length > 0;

        let computedRules: RubricRule[] = [];

        if (hasExplicitMarks) {
            // Case 1: User provided explicit marks. We MUST follow them.
            // If the AI missed assigning marks to some requirements but assigned to others, 
            // we should not overwrite the assigned ones, just give a default minimal weight (1) to the unassigned ones.
            computedRules = rules.map((rule, index) => {
                const req = requirements[index];
                let weight = req?.marks;
                
                if (weight === undefined || weight === null || weight <= 0) {
                    weight = 1; // Fallback for missed requirements to keep them strictly minimal
                }
                
                return { ...rule, weight: weight };
            });
        } else {
            // Case 2: No marks were provided anywhere in the prompt.
            // We self-evaluate based on complexity.
            const COMPLEXITY_WEIGHTS: Record<string, number> = { high: 3, medium: 2, low: 1 };
            
            computedRules = rules.map((rule, index) => {
                const req = requirements[index];
                
                let base = 2;
                let reasonBonus = 0;
                
                if (req) {
                    base = COMPLEXITY_WEIGHTS[req.complexity] || 2;
                    // Add up to 2 bonus points for complex multi-step rules
                    if (req.complexityReason) {
                        const steps = req.complexityReason.split(/[,;]/).length;
                        reasonBonus = steps > 2 ? 2 : (steps > 1 ? 1 : 0);
                    }
                    
                    // Penalty for non-functional or clean code rules to prioritize functional requirements
                    const textToCheck = (req.title + " " + req.description).toLowerCase();
                    if (/clean code|structured|solid|dry|tổ chức rõ ràng|mã nguồn sạch/.test(textToCheck)) {
                        base = 1;
                        reasonBonus = 0;
                    }
                }
                
                return { ...rule, weight: base + reasonBonus };
            });
        }

        // =========================================================
        // NORMALIZE TO EXACTLY 10.0 POINTS (ALWAYS, AS AITA USES 10-POINT SCALE)
        // =========================================================
        const currentTotal = computedRules.reduce((sum, r) => sum + r.weight, 0);
        
        if (currentTotal > 0 && Math.abs(currentTotal - 10.0) > 0.01) {
            // Scale to exactly 10.0 using 0.25 steps to meet standard academic rubric increments while preserving parent weights
            const scale = 10.0 / currentTotal;
            const step = 0.25;
            let currentSum = 0;
            
            computedRules.forEach(rule => {
                let exact = rule.weight * scale;
                let rounded = Math.round(exact / step) * step; 
                if (rounded <= 0) rounded = step; // Ensure no rule is 0 points
                rule.weight = rounded;
                currentSum += rounded;
            });

            // Adjust to make sum EXACTLY equal to 10.0
            let diff = 10.0 - currentSum;
            let safetyCounter = 0;

            while (Math.abs(diff) > 0.01 && safetyCounter < 1000) {
                safetyCounter++;
                if (diff > 0) {
                    // Give to the one with max weight
                    computedRules.sort((a, b) => b.weight - a.weight);
                    computedRules[0].weight += step;
                    diff -= step;
                } else {
                    // Take from the one with min weight that is > step
                    computedRules.sort((a, b) => a.weight - b.weight);
                    const target = computedRules.find(r => r.weight > step + 0.01) || computedRules[0];
                    if (target.weight > step) {
                        target.weight -= step;
                        diff += step;
                    } else {
                        break;
                    }
                }
            }

            // Cleanup float math issues to ensure strict 2 decimal precision (e.g. 10.000000000000002)
            computedRules.forEach(r => {
                r.weight = Math.round(r.weight * 100) / 100;
            });
        }

        return computedRules;
    }
}

