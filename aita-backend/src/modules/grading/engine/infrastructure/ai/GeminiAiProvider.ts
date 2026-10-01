// @ts-nocheck
import { IAiProvider, ParsedBlueprint, ParsedRequirement, DocumentImage } from '../../core/contracts/IAiProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { config } from '../../config';
import { AiClientManager } from './AiClientManager';
import { detectProjectType } from '../../core/domain/rubric/ProjectTypeDetector';
import * as crypto from 'crypto';

export class GeminiAiProvider implements IAiProvider {
    constructor() {
        // Handled by AiClientManager
    }


    public async parseRequirementsAsync(prompt: string, documentImages?: DocumentImage[], subject?: string | null): Promise<ParsedBlueprint> {
        const hasImages = documentImages && documentImages.length > 0;
        const systemPrompt = `You are an expert software architect and academic grader at FPT University.

Extract ALL grading criteria from this assignment document — every concrete, testable requirement a student must implement OR answer to earn marks.

════════════════════════════════════════
STEP 0 — CRITICAL RULES
════════════════════════════════════════
1. NEVER SKIP ANY PART. If the document has PART A through PART H, you MUST extract requirements from ALL PARTS. Missing even one PART is a CRITICAL FAILURE.
2. Count the PARTS in the document FIRST, then verify your output covers ALL of them.
3. If a grader CANNOT verify it by running, inspecting, or reading the student's submission → discard.
4. EXCEPTION: You MUST KEEP all requirements regarding Data Models, Properties, APIs, Architecture, Database, UI features, written answers, debugging tasks, and code review tasks.
5. DO NOT FRAGMENT REQUIREMENTS: You MUST preserve the exact grouping and structure of the original document. DO NOT split features into tiny micro-requirements (like separating image, name, price).
6. FEATURE-BASED GROUPING RULE (CRITICAL): DO NOT split UI and Logic into separate micro-requirements. If a feature (like "Display In-Stock Products", "Skeleton Loading", "Pull-to-refresh", "Product Search") involves BOTH visual UI components AND underlying logic, you MUST group them into a SINGLE requirement (e.g., "Implement Product Search functionality including UI and Logic"). Splitting them causes system timeouts and ruins the grading context. Treat a feature as a complete End-to-End delivery.
7. THEORY/WRITTEN QUESTION GROUPING (CRITICAL): If a single PART contains multiple written/theory questions (e.g., 5 questions about Architecture, or 5 questions about AI Usage), DO NOT create separate micro-requirements for each question. You MUST GROUP ALL written questions within the SAME PART into a SINGLE requirement. The \`description\` must list all the sub-questions, and the \`marks\` must be the SUM of their points.

════════════════════════════════════════
STEP 1 — EXTRACT GRADING GROUPS & MARKS
════════════════════════════════════════
Extract the EXACT points mentioned in the document. Map each PART to a grading group.
CRITICAL SCORING RULE: If the teacher explicitly provides points (e.g. "15 POINTS", "20 POINTS"), extract them EXACTLY. If a part has sub-tasks, distribute the part's total points proportionally across sub-tasks.
If the document uses a 100-point scale, extract the raw points. The system will normalize to 10.0 later.
If NO points are mentioned anywhere, set "hasExplicitRubric" to false.

════════════════════════════════════════
STEP 2 — CLASSIFY EACH REQUIREMENT
════════════════════════════════════════
For EACH requirement, classify ALL of the following:

A) COMPLEXITY: "high", "medium", or "low".
B) COMPLEXITY REASON: 1 sentence justification.
C) IS UI VISIBLE: true ONLY if the core deliverable is explicitly building a graphical user interface (e.g., "Build a Product List screen", "Implement a Modal", "Design the layout"). CRITICAL: DO NOT set this to true if the requirement merely mentions data fields (e.g. "information", "guid"), API endpoints, backend logic, or database tables.
D) IS CRUD: boolean. True for actual data manipulation operations AND for ANY REST API endpoints implementation (e.g., GET, POST, PUT, DELETE). CRITICAL: If the task involves building APIs, this MUST be true.
E) IS WRITTEN ANSWER: true if the core deliverable is a written explanation, theoretical analysis, text report, or oral defense preparation. Do NOT set this to true if the primary deliverable is executable code.
F) IS ARCHITECTURE CODE: true if the core deliverable is the structural organization, file layering, or design pattern implementation within the source code itself. Do NOT set this to true for standard UI building, bug fixing, or functional logic.
G) IS DIAGRAM TASK: true if the core deliverable is a visual representation (e.g., UML, flowchart, architecture diagram).
H) IS SOFT DELETE: true if the task requires implementing a soft delete (logical deletion, hiding a record instead of physically dropping it from the database).
I) PART LABEL: The section of the exam this requirement belongs to (e.g. "PART A", "PART B", "PART D", "PART E").
J) PRESERVE KEYWORDS & TABLES: You MUST PRESERVE all technical keywords, exact property names, HTTP methods, and exact rule logic in your description. CRITICAL: If a question or requirement includes a sample output table, expected result table, or test execution example (e.g., Expected Output tables), you MUST PRESERVE AND INCLUDE IT AS A MARKDOWN TABLE (e.g. | col1 | col2 |) inside the requirement's \`description\`. DO NOT omit sample output tables!
K) RECOMMENDED ENGINE REASON: First, briefly explain why a specific engine is needed based on the core deliverable. If the core deliverable is source code structure (like MVVM), explain that. If it's an image, explain that.
L) RECOMMENDED ENGINE: Based on the reason, output the exact engine name:
- "AiTextAnalysis": MUST be used for written essays, theory questions, text reports, or DIAGRAMS. CRITICAL: If IS WRITTEN ANSWER or IS DIAGRAM TASK is true, you MUST assign AiTextAnalysis.
- "AICodeReview": MUST be used for inspecting source code, architectural design patterns, invisible logic (e.g. offline storage, debouncing, state logic), or backend implementations.
- "AIVision": MUST be used ONLY for purely visual UI requirements. If a requirement includes ANY complex logic (e.g., offline storage, debounce, state logic, API integration) alongside UI, you MUST NOT use AIVision alone.
- "HybridVisionAndCode": MUST be used when a requirement contains BOTH visual UI features (that need screenshots) AND complex invisible logic (e.g., offline storage, debouncing, API integration, state management). This tells the system to evaluate BOTH the screenshot and the source code simultaneously.
- "HybridTextAndCode": MUST be used when a requirement asks for BOTH a written theory/essay answer AND an actual code implementation (e.g., "Design the architecture in code and explain your design choices in the document"). This tells the system to evaluate BOTH the written document and the source code simultaneously.
- "HTTPProbe": Use only if testing a REST API endpoint. CRITICAL: If the requirement asks to implement REST APIs (GET, POST, etc.), you MUST use HTTPProbe and you MUST set isCRUD to true. DO NOT use HybridTextAndCode or AiTextAnalysis for API endpoints.
- "SqlExecutionProbe": MUST be used when the assignment requires writing SQL queries, stored procedures, triggers, or any database DDL/DML statements. The student submits a .sql file and the system executes it against a real database. Use this for SQL/database exam subjects (e.g., DBI202, database courses). Set projectType to "database" when using this engine.

════════════════════════════════════════
MULTI-PART EXAM STRUCTURE
════════════════════════════════════════
University exams often have this structure:
- PART A: System Design (written answers + code architecture)
- PART B: MVP Building (code + UI screenshots)
- PART C: Change Requests (code + UI screenshots)  
- PART D: Advanced Features (code + UI + written answers)
- PART E: Debugging Challenge (written answer analyzing code)
- PART F: Code Review (written analysis of external project)
- PART G: AI Audit Report (written documentation)
- PART H: Oral Defense (written preparation)

You MUST create separate requirements for DIFFERENT TYPES of tasks:
1. Code/UI tasks (isUIVisible=true or isCRUD=true, isWrittenAnswer=false)
2. Written/essay tasks (isWrittenAnswer=true, isUIVisible=false)
Even within the SAME PART, if there is BOTH a coding task AND a written question, you MUST separate them. However, ALL coding tasks in that part should be grouped together into a SINGLE "Code Implementation" requirement, and ALL written questions in that part should be grouped together into a SINGLE "Written Analysis" requirement. DO NOT create more than 2 requirements per PART unless absolutely necessary.

════════════════════════════════════════
PROJECT TYPE CLASSIFICATION
════════════════════════════════════════
"projectType" values: "algorithm" | "backend" | "frontend" | "fullstack" | "desktop" | "mobile" | "unity" | "database"
- If the assignment mentions Flutter, Dart, Android, iOS → "mobile"
- If it mentions stdin/stdout algorithm problems → "algorithm"
- If it is a SQL/database exam (writing SQL queries, stored procedures, triggers, CREATE TABLE) → "database"
- For HTTP APIs, REST services → "backend"
- For browser-based UIs only → "frontend"
- For both API and UI together → "fullstack"

════════════════════════════════════════
DATABASE/SQL PROJECTS SPECIAL RULE
════════════════════════════════════════
If projectType is "database":
- Create ONE requirement per SQL question/task in the exam
- Each requirement MUST use recommendedEngine = "SqlExecutionProbe"
- The title should be descriptive (e.g., "Câu 1: CREATE TABLE theo ERD")
- The description should include the full question text and expected output format
- Set marks according to the exam paper's point allocation
- DO NOT merge multiple SQL questions into a single requirement

════════════════════════════════════════
ALGORITHM PROJECTS SPECIAL RULE
════════════════════════════════════════
If projectType is "algorithm":
- Create ONE requirement per problem/question found in the exam (Problem 1, Câu 1, Task A, ...)
- Each requirement's description MUST contain that problem's statement, input format, output format, and sample input/output if given
- Set marks from the exam paper's point allocation ONLY if explicitly stated in text; if the paper gives no explicit point values, set marks to null and hasExplicitRubric to false
- DO NOT merge multiple problems into a single requirement

════════════════════════════════════════
OUTPUT FORMAT (JSON OBJECT)
════════════════════════════════════════
{
  "_planning": "Step-by-step reasoning. List ALL PARTS found. Show point distribution math.",
  "_partsCovered": ["PART A", "PART B", "PART C", "..."],
  "hasExplicitRubric": boolean,
  "projectType": "algorithm" | "backend" | "frontend" | "fullstack" | "desktop" | "mobile" | "unity" | "database",
  "language": "csharp" | "java" | "typescript" | "python" | "dart" | "other",
  "framework": "net8" | "spring" | "react" | "angular" | "flutter" | "wpf" | "maui" | "unity" | "other",
  "assignmentTitle": "string",
  "description": "2-3 sentence summary",
  "totalMarks": number | null,
  "gradingGroups": [
    { "id": "g1", "name": "PART A - System Design", "points": 15 }
  ],
  "requirements": [
    {
      "id": "req-1",
      "groupId": "g1",
      "partLabel": "PART A",
      "title": "Short title",
      "description": "Verifiable grading criterion with full technical details",
      "marks": 10,
      "complexity": "low" | "medium" | "high",
      "complexityReason": "string",
      "isUIVisible": boolean,
      "isCRUD": boolean,
      "isWrittenAnswer": boolean,
      "isArchitectureCode": boolean,
      "isDiagramTask": boolean,
      "isSoftDelete": boolean,
      "referenceAnswer": "string | null // Provide a short, factual model answer here ONLY IF recommendedEngine is AiTextAnalysis. This is what the student's answer will be compared against. If not a written answer, use null.",
      "recommendedEngineReason": "string",
      "recommendedEngine": "AICodeReview" | "AiTextAnalysis" | "AIVision" | "HTTPProbe" | "HybridVisionAndCode" | "HybridTextAndCode" | "SqlExecutionProbe",
      "crudOperations": []
    }
  ]
}`;

        // ═══════════════════════════════════════════════════════
        // IMAGE ANALYSIS ADDENDUM — Only when document contains images
        // ═══════════════════════════════════════════════════════
        const imageAnalysisAddendum = hasImages ? `\n\n════════════════════════════════════════\nIMAGE ANALYSIS INSTRUCTIONS (CRITICAL)\n════════════════════════════════════════\nThis document contains ${documentImages!.length} embedded image(s). These images may include:\n- Database schemas / ERD diagrams showing tables, columns, data types, and relationships\n- UI mockup designs showing the expected visual layout\n- Architecture diagrams\n\nYou MUST carefully analyze EVERY image provided. For each image:\n1. If it is a DATABASE SCHEMA / ERD: Extract ALL table names, column names, data types, primary keys, foreign keys, and relationships. Include these details in the relevant requirement descriptions (e.g., "Table 'Products' must have columns: Id (int, PK), Name (nvarchar), Price (decimal), CategoryId (int, FK to Categories)").
2. If it is a UI MOCKUP: Describe the layout, components, navigation structure, and any specific design requirements visible in the mockup. Set isUIVisible=true for requirements derived from it.
3. If it is an ARCHITECTURE DIAGRAM: Extract layers, components, and their interactions.\n\nDo NOT ignore images. The text may say "See diagram below" — YOU are seeing that diagram right now. Extract its full content into your requirements.` : '';

        const fullSystemPrompt = systemPrompt + imageAnalysisAddendum;

        const fullPrompt = `${fullSystemPrompt}\n\nDocument Text:\n${prompt}`;

        // Debug: Log prompt stats
        console.log(`[GeminiAiProvider] parseRequirementsAsync - systemPrompt: ${fullSystemPrompt.length} chars, userPrompt: ${prompt.length} chars, images: ${documentImages?.length || 0}, total: ${(fullSystemPrompt.length + prompt.length)} chars`);

        // Check for problematic content in prompt
        const hasNullBytes = prompt.includes('\0');
        const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(prompt);
        if (hasNullBytes || hasInvalidChars) {
            console.warn(`[GeminiAiProvider] WARNING: Prompt contains problematic characters! nullBytes=${hasNullBytes}, invalidChars=${hasInvalidChars}`);
        }

        let attempt = 0;
        const maxRetries = 2;
        while (attempt <= maxRetries) {
            try {
                let response: any;
                response = await AiClientManager.executeWithFallback(async (client, model) => {
                    const controller = new AbortController();
                    const timeoutMs = hasImages ? 180000 : 120000; // Extra time for vision
                    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                    try {
                        // Build message content: multimodal if images exist, text-only otherwise
                        let userMessageContent: any;
                        if (hasImages) {
                            // Multimodal: text + images (same format as evaluateImageAsync)
                            const parts: any[] = [{ type: "text", text: prompt }];
                            for (const img of documentImages!) {
                                parts.push({
                                    type: "text",
                                    text: `[DOCUMENT IMAGE — ${img.label}${img.isMockup ? ' (TEACHER MOCKUP/REFERENCE)' : ''}]:`
                                });
                                parts.push({
                                    type: "image_url",
                                    image_url: {
                                        url: `data:${img.contentType};base64,${img.buffer.toString('base64')}`,
                                        detail: "high" // High detail for DB schema text recognition
                                    }
                                });
                            }
                            userMessageContent = parts;
                            console.log(`[GeminiAiProvider] Sending multimodal request with ${documentImages!.length} images (detail: high)`);
                        } else {
                            userMessageContent = prompt;
                        }

                        return await Promise.race([
                            client.chat.completions.create({
                                model: model,
                                messages: [
                                    { role: "system", content: fullSystemPrompt },
                                    { role: "user", content: userMessageContent }
                                ],
                                temperature: 0
                            }, { signal: controller.signal as any }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs))
                        ]);
                    } finally {
                        clearTimeout(timeoutId);
                    }
                });

                let jsonText = response.choices[0].message.content || "{}";
                jsonText = jsonText.replace(/^```json\s*/gi, '').replace(/^```\s*/g, '').replace(/```$/g, '').trim();
                let blueprint: ParsedBlueprint;
                try {
                    blueprint = JSON.parse(jsonText) as ParsedBlueprint;
                } catch (jsonErr) {
                    console.warn('[GeminiAiProvider] Retrying JSON parse after sanitizing control characters...');
                    const sanitizedText = jsonText.replace(/[\u0000-\u001F]+/g, (c) => {
                        if (c.includes('\n')) return '\\n';
                        if (c.includes('\r')) return '\\r';
                        if (c.includes('\t')) return '\\t';
                        return '';
                    });
                    blueprint = JSON.parse(sanitizedText) as ParsedBlueprint;
                }

                // Remove empty requirements hallucinated by the AI and clean markdown
                if (blueprint.requirements && Array.isArray(blueprint.requirements)) {
                    blueprint.requirements = blueprint.requirements
                        .filter(req => req && req.title && req.title.trim() !== '' && req.description && req.description.trim() !== '')
                        .map(req => {
                            req.title = req.title.replace(/\*\*/g, '');
                            req.description = req.description.replace(/\*\*/g, '');
                            return req;
                        });
                }

                // ═══════════════════════════════════════════════════════
                // CODE-LEVEL PROJECT TYPE DETECTION FALLBACK
                // ═══════════════════════════════════════════════════════
                const typeDecision = detectProjectType(blueprint.projectType as string, prompt, subject);
                if (typeDecision.changed) {
                    console.log(`[GeminiAiProvider] Project type override: ${typeDecision.reason}.`);
                    blueprint.projectType = typeDecision.projectType as any;
                } else {
                    console.log(`[GeminiAiProvider] Project type "${blueprint.projectType}": ${typeDecision.reason}.`);
                }

                // Verify if the original prompt text actually contains explicit point designations (e.g. "5 pts", "3 điểm")
                const hasExplicitPointText = /\b(\d+(?:[\.,]\d+)?)\s*(?:pt|pts|point|points|điểm|diem|mark|marks|%)\b/i.test(prompt) ||
                    /(?:điểm|diem|score|marks)\s*:\s*\d+/i.test(prompt);

                if (!hasExplicitPointText) {
                    console.log('[GeminiAiProvider] Prompt has no explicit point markings. Forcing hasExplicitRubric = false.');
                    blueprint.hasExplicitRubric = false;
                    blueprint.requirements.forEach(req => {
                        req.marks = null as any;
                    });
                } else if (blueprint.hasExplicitRubric === false) {
                    blueprint.requirements.forEach(req => {
                        req.marks = null as any;
                    });
                }

                // SINGLE REQUIREMENT AUTO-SPLIT:
                // If prompt only produced 1 monolithic requirement and no explicit point breakdown was provided,
                // automatically expand it into sub-criteria with appropriate complexity levels (high, medium, low)
                // matching the project type (database SQL probes vs generic code/algorithm probes).
                if (blueprint.requirements.length === 1 && blueprint.hasExplicitRubric !== true) {
                    const singleReq = blueprint.requirements[0];
                    const baseTitle = singleReq.title.replace(/\s*(Implementation|Bài làm|Task|Requirement|Exam|Đề thi)\s*/gi, '').trim() || singleReq.title;
                    const groupId = singleReq.groupId || 'g1';

                    if (blueprint.projectType === 'database') {
                        blueprint.requirements = [
                            {
                                ...singleReq,
                                id: `${singleReq.id}-1`,
                                groupId,
                                title: `${baseTitle} - DDL & Database Schema Design`,
                                description: `${singleReq.description}\n\nCreate database schema, tables, primary keys, foreign keys, and integrity constraints.`,
                                complexity: 'high',
                                complexityReason: 'Database DDL schema creation and relational integrity',
                                marks: null as any,
                                recommendedEngine: 'SqlExecutionProbe',
                            },
                            {
                                ...singleReq,
                                id: `${singleReq.id}-2`,
                                groupId,
                                title: `${baseTitle} - DML & Relational Queries`,
                                description: `Implement required SQL SELECT queries, JOINs, aggregations, and data manipulations.`,
                                complexity: 'medium',
                                complexityReason: 'Relational data query logic and JOIN operations',
                                marks: null as any,
                                recommendedEngine: 'SqlExecutionProbe',
                            },
                            {
                                ...singleReq,
                                id: `${singleReq.id}-3`,
                                groupId,
                                title: `${baseTitle} - Advanced SQL (Views, Procedures, Triggers)`,
                                description: `Implement advanced database objects such as stored procedures, triggers, views, or indexes as required by the assignment.`,
                                complexity: 'low',
                                complexityReason: 'Advanced database objects and transaction logic',
                                marks: null as any,
                                recommendedEngine: 'SqlExecutionProbe',
                            }
                        ];
                    } else {
                        blueprint.requirements = [
                            {
                                ...singleReq,
                                id: `${singleReq.id}-1`,
                                groupId,
                                title: `${baseTitle} - Logic & Core Functionality`,
                                description: `${singleReq.description}\n\nCore requirement: Correctly implement the main business logic and core functional algorithms.`,
                                complexity: 'high',
                                complexityReason: 'Core algorithmic logic and main business rules',
                                marks: null as any,
                            },
                            {
                                ...singleReq,
                                id: `${singleReq.id}-2`,
                                groupId,
                                title: `${baseTitle} - Input/Output & Constraints`,
                                description: `Verify that input parsing, output formatting, edge cases, and boundary constraints are correctly handled.`,
                                complexity: 'medium',
                                complexityReason: 'Boundary conditions, edge cases, and input/output formatting',
                                marks: null as any,
                            },
                            {
                                ...singleReq,
                                id: `${singleReq.id}-3`,
                                groupId,
                                title: `${baseTitle} - Code Quality & Performance`,
                                description: `Inspect source code for readability, proper naming conventions, clean structure, and optimal time/space complexity.`,
                                complexity: 'low',
                                complexityReason: 'Code structure, readability, and naming conventions',
                                marks: null as any,
                                recommendedEngine: 'AICodeReview',
                                isUIVisible: false,
                                isCRUD: false
                            }
                        ];
                    }
                }

                // ═══════════════════════════════════════════════════════
                // DETERMINISTIC MATH DISTRIBUTION (SENIOR SOLUTION)
                // ═══════════════════════════════════════════════════════
                // We ONLY compute "pointsPerReq" for requirements that DO NOT already have explicit marks.
                // If the AI successfully extracted explicit marks, we preserve them to respect the teacher's exact grading scheme.
                if (blueprint.gradingGroups && blueprint.gradingGroups.length > 0) {
                    let totalComputed = 0;
                    for (const group of blueprint.gradingGroups) {
                        const reqsInGroup = blueprint.requirements.filter(r => r.groupId === group.id);
                        if (reqsInGroup.length === 0) continue;

                        const reqsWithMarks = reqsInGroup.filter(r => typeof r.marks === 'number' && r.marks > 0);
                        const reqsWithoutMarks = reqsInGroup.filter(r => typeof r.marks !== 'number' || r.marks <= 0);

                        const assignedPoints = reqsWithMarks.reduce((sum, r) => sum + (r.marks as number), 0);

                        if (reqsWithoutMarks.length > 0) {
                            const remainingPoints = Math.max(0, group.points - assignedPoints);

                            // Give each req a weight based on complexity
                            reqsWithoutMarks.forEach(r => {
                                (r as any)._weight = r.complexity === 'high' ? 3 : (r.complexity === 'low' ? 1 : 2);
                            });
                            const totalWeight = reqsWithoutMarks.reduce((sum, r) => sum + (r as any)._weight, 0);

                            // Base points (rounded to nearest 0.25)
                            let currentSum = 0;
                            reqsWithoutMarks.forEach(r => {
                                let exact = ((r as any)._weight / totalWeight) * remainingPoints;
                                let rounded = Math.round(exact * 4) / 4;
                                if (rounded === 0 && remainingPoints > 0) rounded = 0.25;
                                r.marks = rounded;
                                currentSum += rounded;
                            });

                            // Adjust to make sum EXACTLY equal to remainingPoints using 0.25 steps
                            let diff = remainingPoints - currentSum;
                            const step = 0.25;
                            let safetyCounter = 0;

                            while (Math.abs(diff) > 0.01 && safetyCounter < 100) {
                                safetyCounter++;
                                if (diff > 0) {
                                    // Give 0.25 to the one with highest weight
                                    reqsWithoutMarks.sort((a, b) => (b as any)._weight - (a as any)._weight);
                                    (reqsWithoutMarks[0].marks as number) += step;
                                    diff -= step;
                                } else {
                                    // Take 0.25 from the one with lowest weight that has > 0.25
                                    reqsWithoutMarks.sort((a, b) => (a as any)._weight - (b as any)._weight);
                                    const target = reqsWithoutMarks.find(r => (r.marks as number) > step) || reqsWithoutMarks[0];
                                    (target.marks as number) -= step;
                                    diff += step;
                                }
                            }

                            // Cleanup temp variable and round to 2 decimals to fix float math issues
                            reqsWithoutMarks.forEach(r => {
                                r.marks = Math.round((r.marks as number) * 100) / 100;
                                delete (r as any)._weight;
                            });
                        }

                        // Re-sum to prevent AI rounding errors on the group total
                        const actualGroupPoints = reqsInGroup.reduce((sum, r) => sum + (r.marks as number), 0);
                        group.points = actualGroupPoints;
                        totalComputed += actualGroupPoints;
                    }
                    blueprint.totalMarks = totalComputed;
                }

                // ═══════════════════════════════════════════════════════
                // ALGORITHM SAFETY NET
                // ═══════════════════════════════════════════════════════
                // Algorithm exams keep the AI's one-requirement-per-problem extraction
                // (each problem gets its own I/O-judged criterion). Only when the AI
                // returned NO requirements at all do we fall back to the two standard
                // criteria instead of producing an empty rubric.
                if (blueprint.projectType === "algorithm" && (!blueprint.requirements || blueprint.requirements.length === 0)) {
                    blueprint.requirements = [
                        {
                            id: "req-algo-1",
                            groupId: "g1",
                            title: "Algorithmic Correctness (I/O)",
                            description: "Correctly implement the algorithmic logic, satisfying all input/output test cases.",
                            marks: 5,
                            complexity: "high",
                            complexityReason: "Core algorithmic logic",
                            isUIVisible: false,
                            isCRUD: false,
                            isWrittenAnswer: false,
                            isArchitectureCode: false,
                            isDiagramTask: false,
                            isSoftDelete: false
                        },
                        {
                            id: "req-algo-2",
                            groupId: "g1",
                            partLabel: "PART A",
                            title: "Complexity & Architecture",
                            description: "Adhere to specific time/space complexity constraints (e.g. O(n), Hash Map) if specified.",
                            marks: 5,
                            complexity: "medium",
                            complexityReason: "Algorithmic efficiency",
                            isUIVisible: false,
                            isCRUD: false,
                            isWrittenAnswer: false,
                            isArchitectureCode: true,
                            isDiagramTask: false,
                            isSoftDelete: false
                        }
                    ];
                    blueprint.totalMarks = 10;
                    blueprint.gradingGroups = [{ id: "g1", name: "Standard Algorithm Grading", points: 10 }];
                }

                return blueprint;
            } catch (error) {
                console.error(`[GeminiAiProvider] Error on attempt ${attempt + 1}:`, error);
                attempt++;
                if (attempt > maxRetries) {
                    throw new Error(`Failed to parse requirements after ${maxRetries} retries: ${(error as Error).message}`);
                }
            }
        }
        throw new Error('Unexpected error in parseRequirementsAsync');
    }

    public async generateFeedbackAsync(context: string, payload: any): Promise<string> {
        const prompt = `Review the following code or result context:\n${context}\n\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nProvide constructive feedback.`;
        const response = await AiClientManager.executeWithFallback(async (client, model) => {
            return await client.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: config.ai.temperature
            });
        });
        return response.choices[0].message.content || "";
    }

    /**
     * Additional specific method for generating detailed RubricRules from requirements.
     */
    public async generateRubricRulesAsync(requirements: ParsedRequirement[], projectType: string, assignmentDescription?: string): Promise<any[]> {
        const rules: any[] = [];
        const pt = projectType.toLowerCase();
        const isWebProject = ["backend", "frontend", "fullstack", "aspnet", "nodejs", "java", "php", "golang", "blazor"].includes(pt);

        // 1. Determine strategies — TRUST AI's recommendedEngine FIRST, flags as fallback
        const strategyMap = new Map<string, string>();
        const canRunBrowser = ["frontend", "fullstack", "blazor", "aspnet", "nodejs", "mobile", "flutter"].some(t => pt.includes(t));

        for (const req of requirements) {
            let strategy: string;

            if (pt === 'algorithm') {
                // Algorithm exams: every problem is judged by its own stdin/stdout test
                // cases; written/diagram answers go to text analysis instead. If the AI
                // fails to produce test cases for a rule, RubricGeneratorService's
                // Constraint D downgrades it to AICodeReview.
                strategy = (req.isWrittenAnswer || req.isDiagramTask) ? 'AiTextAnalysis' : 'StdInOutProbe';
            } else if (pt === 'database') {
                // Database exams (DBI202): every non-written SQL question is judged by SqlExecutionProbe
                strategy = (req.isWrittenAnswer || req.isDiagramTask) ? 'AiTextAnalysis' : 'SqlExecutionProbe';
            } else if (req.recommendedEngine) {
                // ═══════════════════════════════════════════════════════
                // PRIMARY PATH: Use AI's explicit recommendation.
                // Apply only structural constraints (project type limits).
                // ═══════════════════════════════════════════════════════
                switch (req.recommendedEngine) {
                    case 'HTTPProbe':
                        strategy = isWebProject ? 'HTTPProbe' : 'AICodeReview';
                        break;
                    case 'AIVision':
                    case 'HybridVisionAndCode':
                        strategy = canRunBrowser ? 'AIVision' : 'AICodeReview';
                        break;
                    case 'AiTextAnalysis':
                    case 'HybridTextAndCode':
                        strategy = 'AiTextAnalysis';
                        break;
                    case 'SqlExecutionProbe':
                        strategy = 'SqlExecutionProbe';
                        break;
                    case 'AICodeReview':
                    default:
                        strategy = 'AICodeReview';
                        break;
                }
            } else {
                // ═══════════════════════════════════════════════════════
                // FALLBACK PATH: AI didn't provide recommendedEngine.
                // Derive from boolean flags. isCRUD checked BEFORE isWrittenAnswer
                // to ensure API reqs get HTTPProbe even if both flags are set.
                // ═══════════════════════════════════════════════════════
                strategy = 'AICodeReview';
                if (req.isCRUD) {
                    strategy = isWebProject ? 'HTTPProbe' : 'AICodeReview';
                } else if (req.isUIVisible) {
                    strategy = canRunBrowser ? 'AIVision' : 'AICodeReview';
                } else if (req.isWrittenAnswer || req.isDiagramTask) {
                    strategy = 'AiTextAnalysis';
                }
            }

            strategyMap.set(req.id, strategy);
        }

        // 2. Fetch Probe Configs from AI if needed
        const probeReqs = requirements.filter(r => strategyMap.get(r.id) === "HTTPProbe" || strategyMap.get(r.id) === "StdInOutProbe" || strategyMap.get(r.id) === "AIVision");
        let probeConfigs: Record<string, any> = {};

        if (probeReqs.length > 0) {
            let systemPrompt = `You are a testing engineer. Generate test payloads for the following requirements.
OUTPUT A STRICT JSON OBJECT mapping requirement ID to its test configuration.

For HTTPProbe (REST APIs), generate:
{
  "req-id": {
    "type": "http",
    "config": {
      "description": "string",
      "steps": [
        {
          "stepId": "s1", "method": "POST", "pathTemplate": "/api/entity", "body": {}, "expectedStatus": 201,
          "assertions": [{ "jsonPath": "$.name", "assertType": "equals", "value": "test" }]
        }
      ]
    }
  }
}
* Infer realistic paths based on the requirement description.
* ID SUBSTITUTION (CRITICAL): The testing engine automatically captures the \`id\` from a successful POST response into a \`{{id}}\` variable. You MUST use this placeholder in subsequent steps for the URL path (e.g., \`"/api/products/{{id}}"\`) AND in the request body for PUT updates (e.g., \`{"id": "{{id}}", "name": "..."}\`). Failure to include \`"id": "{{id}}"\` in the PUT body will cause 'ID Mismatch' errors in frameworks like .NET.
* COMPREHENSIVE TEST FLOW (CRITICAL): Your steps array MUST logically and comprehensively test all endpoints described in the requirement. If the requirement describes a standard CRUD entity, you MUST simulate a complete lifecycle (e.g., Create -> Read -> Update -> Read -> Delete -> Read) including both success paths and expected error paths (like 400 Bad Request). For non-CRUD endpoints, generate steps that test all described scenarios. DO NOT generate a short, incomplete flow.
* SAFE ASSERTIONS (CRITICAL): If the exact JSON schema/property names are NOT explicitly defined in the assignment description, DO NOT invent them. Rely ONLY on HTTP status codes or safe generic assertions (e.g., '$.id notEmpty').
* JSON CASING (CRITICAL): When writing jsonPath assertions, you MUST adhere to standard JSON naming conventions appropriate for the technology stack (e.g., camelCase is the industry standard for REST APIs in most frameworks). If the assignment description explicitly requires a specific casing (e.g., PascalCase or snake_case) in the API output, use that. Otherwise, default to camelCase for your assertions (e.g., convert "CreatedAt" to "$.createdAt").
* Ensure soft-delete checks use HTTP GET assertions.

For StdInOutProbe (Algorithms), generate test cases functioning strictly as an Automated Competitive Programming Judge.
{
  "req-id": {
    "type": "stdio",
    "config": {
      "description": "string",
      "javascriptSolver": "function solve(input) { ... return output; }",
      "testCases": [
        { 
          "id": "t1", 
          "input": "...", 
          "expectedOutput": "...", 
          "timeoutMs": 5000 
        }
      ]
    }
  }
}
* SYSTEMIC RULES FOR ALGORITHM JUDGE:
1. EXACT QUANTITY: You MUST generate EXACTLY 3 test cases for EVERY algorithm requirement.
2. CONTEXT AWARENESS: You are generating test cases for the ENTIRE algorithmic problem described below. Even if the specific requirement is narrowly focused on 'Input Reading' or 'Format', your test cases MUST represent full, valid inputs and outputs for the CORE algorithmic problem. Do NOT generate dummy strings like 'line1' unless explicitly requested.
3. PURE RAW DATA AND STRICT FORMAT ALIGNMENT (CRITICAL): Your 'input' MUST perfectly match the EXACT line-by-line format requested in the problem description.
   - If the description says "Line 1 contains N and K separated by a space", you MUST format the input as exactly "5 8\\n1 2 3 4 5". DO NOT put N and K on separate lines.
   - Use '\\n' for newlines. DO NOT add any extra text or labels like "Input:" or "Output:".
   - Your 'expectedOutput' MUST be the pure computational answer (e.g., "0 1" or "-1").
4. NO CHAT, NO STATUS: 'expectedOutput' MUST be the pure computational answer. NEVER invent status messages like "Input processed successfully" or describe complexity like "O(n)".
5. STRICT ALIGNMENT: Ensure the generated input and expectedOutput perfectly align with the required formatting in the problem description (e.g., correct number of lines, space separations, and fallback outputs like '-1').
6. DATA CONSISTENCY: If the input requires an integer N followed by N elements, you MUST ensure that the number of elements generated EXACTLY matches N.
7. EXACT EXTRACTION OF EXAMPLES: If the ORIGINAL ASSIGNMENT DESCRIPTION contains EXAMPLES, you MUST extract BOTH the 'input' AND the provided 'expectedOutput' EXACTLY as written. DO NOT leave expectedOutput empty for these teacher-provided examples.
8. REFERENCE SOLUTION EXECUTION: For any ADDITIONAL or NEW hidden test cases you generate beyond the teacher's examples, you MUST leave 'expectedOutput' empty (""). The system will execute your 'javascriptSolver' to compute the missing outputs. You MUST ALWAYS write a flawless algorithmic solver in JavaScript and put it in the 'javascriptSolver' field.
   - Your 'javascriptSolver' MUST be a single pure function named 'solve' that takes exactly one string parameter ('input') and returns exactly one string (the output).
   - EXTREMELY IMPORTANT: Your solver MUST flawlessly parse the EXACT input format you generated. Use 'input.trim().split("\\n")' and split lines carefully based on the problem description. Example: "function solve(input) { const lines = input.trim().split('\\n'); const [N, K] = lines[0].trim().split(' ').map(Number); const arr = lines[1].trim().split(' ').map(Number); ... return ans.toString(); }"

For AIVision (UI Web), generate:
{
  "req-id": {
    "type": "browser",
    "config": {
      "description": "Navigate to the specific page for this requirement",
      "path": "/login"
    }
  }
}
* CRITICAL: Infer the likely relative URL path (e.g., /, /admin, /dashboard, /users) for the feature described in the requirement.

OUTPUT JSON ONLY. NO MARKDOWN FENCES.`;

            if (assignmentDescription) {
                systemPrompt += `\n\n--- ORIGINAL ASSIGNMENT DESCRIPTION ---\n${assignmentDescription}\n---------------------------------------`;
            }

            const prompt = `Requirements to configure:\n${JSON.stringify(probeReqs, null, 2)}`;
            try {
                const response = await AiClientManager.executeWithFallback(async (client, model) => {
                    return await client.chat.completions.create({
                        model: model,
                        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
                        temperature: 0
                    });
                });
                const text = (response.choices[0].message.content || "{}").replace(/^```json\s*/gi, '').replace(/^```\s*/g, '').replace(/```$/g, '').trim();
                probeConfigs = { ...probeConfigs, ...JSON.parse(text) };
            } catch (err) {
                console.error("[GeminiAiProvider] Failed to generate probe configs", err);
            }
        }

        // 3. Construct Rules Deterministically
        for (const req of requirements) {
            const strategy = strategyMap.get(req.id) || "AICodeReview";
            let evidenceType = "ai.code.reviewed";
            if (strategy === "AIVision") evidenceType = "browser.screenshot.captured";
            if (strategy === "HTTPProbe") evidenceType = "runtime.http.probed";
            if (strategy === "StdInOutProbe") evidenceType = "runtime.stdio.probed";
            if (strategy === "SqlExecutionProbe") evidenceType = "runtime.sql.probed";
            if (strategy === "Boolean") evidenceType = "static.code.analyzed";

            // Intelligent category assignment
            let category = req.isUIVisible ? "UI/UX" : (req.isCRUD ? "Functional" : "Architecture");
            if (req.isWrittenAnswer) {
                const text = (req.title + " " + req.description).toLowerCase();
                if (/debug|bug|fix|error/i.test(text)) category = "Functional";
                else if (/review|analysis|strength|weakness|improvement|scalab|maintain|test/i.test(text)) category = "Architecture";
                else if (/audit|report|document|usage/i.test(text)) category = "Architecture";
                else if (/oral|defense|question|prepare/i.test(text)) category = "Architecture";
                else category = "Theory";
            }

            const rule: any = {
                id: req.id,
                title: req.title,
                description: req.description,
                category: category,
                tags: req.isCRUD ? ["api", ...(req.crudOperations || [])] : (req.isUIVisible ? ["ui"] : []),
                weight: req.marks || 0,
                scoringStrategy: strategy,
                requiredEvidence: [
                    {
                        evidenceType: evidenceType,
                        minimumConfidence: 0.8,
                        semanticDescription: req.description
                    }
                ]
            };

            const probeCfg = probeConfigs[req.id];
            if (strategy === "HTTPProbe" && probeCfg?.type === "http") {
                rule.requiredEvidence[0].httpProbe = probeCfg.config;
            } else if (strategy === "StdInOutProbe" && probeCfg?.type === "stdio") {
                const config = probeCfg.config;
                // AI-Driven Reference Solution Execution
                if (config.javascriptSolver && config.testCases) {
                    try {
                        console.log(`[GeminiAiProvider] Executing AI Reference Solution for req ${req.id}...`);
                        const solveFn = new Function('input', config.javascriptSolver + '\nreturn solve(input);');
                        for (const tc of config.testCases) {
                            if (!tc.expectedOutput || tc.expectedOutput.trim() === "") {
                                const computedOutput = solveFn(tc.input);
                                tc.expectedOutput = String(computedOutput).trim();
                                console.log(`[GeminiAiProvider] Computed output for input: ${tc.input.replace(/\\n/g, ' ')} -> ${tc.expectedOutput}`);
                            }
                        }
                    } catch (e) {
                        console.error(`[GeminiAiProvider] Failed to execute AI javascriptSolver for req ${req.id}:`, e);
                    }
                }
                rule.requiredEvidence[0].stdInOutProbe = config;
            } else if (strategy === "AIVision" && probeCfg?.type === "browser") {
                rule.requiredEvidence[0].browserProbe = probeCfg.config;
            }

            rules.push(rule);
        }

        return rules;
    }

    public async generateAssignmentContentAsync(prompt: string, pageImages?: string[]): Promise<string> {
        const systemPrompt = `You are a Senior University Lecturer and Expert Assignment Author in Computer Science.
Your task is to create or convert a complete, professional, comprehensive Programming Assignment document in HTML format.

INSTRUCTIONS:
1. IF THE USER PROVIDES AN EXISTING DOCUMENT (TEXT OR IMAGES): Transcribe, structure, and convert the entire assignment into clean, beautiful HTML format. Include all requirements, questions, rules, sample data tables, and ERD schemas.
2. IF THE USER PROVIDES A SHORT PROMPT, TOPIC, OR SUBJECT CODE (e.g., "Subject: PRM392" or "Mobile App Assignment"): You MUST AUTONOMOUSLY AUTHOR & GENERATE a complete, realistic, comprehensive university-level programming assignment from scratch. DO NOT ASK THE USER FOR MORE CONTENT. DO NOT SAY "Please provide the document". GENERATE THE COMPLETE ASSIGNMENT IMMEDIATELY!

FORMATTING REQUIREMENTS:
- Output pure body HTML snippet format with <h1>, <h2>, <h3>, <p>, <ul>, <li>, <table>, <code>, <pre>.
- Complete transcription of all parts, requirements, inputs, outputs, and constraints.
- CRITICAL: DO NOT include <style>, <link>, <script>, <html>, <head>, <body>, or <!DOCTYPE> tags.
- CRITICAL: DO NOT set fixed widths (no max-width, no width: 800px, no width: 210mm, no margin: auto). The layout must fluidly fill 100% width.
- DO NOT use Markdown (no **, no ##). DO NOT wrap in \`\`\`html blocks.
- Write the entire assignment content in clear, professional ENGLISH.`;

        let userMessageContent: any;
        if (pageImages && pageImages.length > 0) {
            const parts: any[] = [{ type: "text", text: prompt }];
            pageImages.forEach(base64 => {
                const cleanB64 = base64.replace(/^data:image\/\w+;base64,/, '');
                parts.push({
                    type: "image_url",
                    image_url: {
                        url: `data:image/png;base64,${cleanB64}`,
                    }
                });
            });
            userMessageContent = parts;
        } else {
            userMessageContent = prompt;
        }

        const response: any = await AiClientManager.executeWithFallback(async (client, model) => {
            return await client.chat.completions.create({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessageContent }
                ],
                temperature: 0.7
            });
        });

        let text = response.choices[0]?.message?.content || "";
        text = text.replace(/^```html\s*/gi, '').replace(/^```\s*/g, '').replace(/```$/g, '').trim();
        text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<head[\s\S]*?<\/head>/gi, '');
        text = text.replace(/<link[\s\S]*?>/gi, '');
        text = text.replace(/<meta[\s\S]*?>/gi, '');
        text = text.replace(/<title[\s\S]*?<\/title>/gi, '');
        text = text.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
        text = text.replace(/<\/?(?:html|head|body|meta|title)[^>]*>/gi, '');
        text = text.replace(/<!--[\s\S]*?-->/g, '').replace(/\n{3,}/g, '\n\n').trim();
        return text;
    }

    public async generateOverallFeedbackAsync(assignmentTitle: string, passedRules: any[], failedRules: any[], totalScore: number, maxScore: number): Promise<string> {
        const passedTitles = passedRules.map(r => `- Tiêu chí: ${r.title} (+${r.earnedScore}đ)\n  Đánh giá chi tiết: ${r.details}`).join('\n\n');
        const failedTitles = failedRules.map(r => `- Tiêu chí: ${r.title} (0đ)\n  Lỗi/Nhận xét: ${r.details}`).join('\n\n');

        const systemPrompt = `Bạn là một Tech Lead (Mentor) đang review bài tập của sinh viên.
Nhiệm vụ của bạn là tổng hợp Feedback dựa trên kết quả chấm điểm từ hệ thống.

YÊU CẦU QUAN TRỌNG (CRITICAL TONE & STYLE):
1. VĂN PHONG THỰC TẾ, TRỰC DIỆN: Tuyệt đối KHÔNG DÙNG các từ ngữ sáo rỗng, chào hỏi, chúc mừng (VD: KHÔNG dùng "Chào bạn", "Rất vui mừng", "Chúc mừng", "Xuất sắc"). Đi thẳng ngay vào phân tích chuyên môn.
2. RẤT NGẮN GỌN & ĐÚNG TRỌNG TÂM: Tối đa 2-3 đoạn ngắn. Nhận xét cực kỳ thực tế, tránh giải thích dông dài đạo lý.
3. PHẠM VI CHÍNH XÁC: Chỉ đánh giá dựa trên danh sách các tiêu chí Đạt (Passed) và Chưa đạt (Failed) cùng với "Đánh giá chi tiết" của từng tiêu chí bên dưới. Tuyệt đối KHÔNG TƯỞNG TƯỢNG hoặc đưa ra các khái niệm ngoài phạm vi bài học (ví dụ: Không khuyên dùng Docker, CI/CD, Unit Test, Validation... nếu tiêu chí không hề đề cập đến).
4. CẤU TRÚC:
   - Trạng thái hiện tại (Đạt ${totalScore}/${maxScore} điểm).
   - Đánh giá kỹ thuật: Dựa hoàn toàn vào phần "Đánh giá chi tiết" của các tiêu chí, hãy tổng hợp lại những gì sinh viên đã code tốt và những lỗi/hạn chế cụ thể sinh viên gặp phải.
   - Hướng khắc phục / Tối ưu: Dựa trên các lỗi hoặc điểm chưa hoàn hảo trong "Đánh giá chi tiết", đưa ra 1-2 lời khuyên tối ưu code thiết thực. TUYỆT ĐỐI không dùng văn mẫu chung chung và KHÔNG khuyên "Hướng phát triển mở rộng" ra ngoài phạm vi môn học. Nếu "Đánh giá chi tiết" không có gì để chê, không cần bịa ra lời khuyên.
5. NGÔN NGỮ: Tiếng Việt, sử dụng thuật ngữ IT chuẩn. Định dạng Markdown đơn giản.`;

        const userPrompt = `Bài tập: ${assignmentTitle}
Điểm số: ${totalScore} / ${maxScore}

--- CÁC TIÊU CHÍ ĐÃ ĐẠT ---
${passedTitles || '(Không có)'}

--- CÁC TIÊU CHÍ CHƯA ĐẠT / BỊ LỖI ---
${failedTitles || '(Không có)'}

Hãy viết feedback cuối cùng cho sinh viên này.`;

        const response = await AiClientManager.executeWithFallback(async (client, model) => {
            return await client.chat.completions.create({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.2 // Low temperature for consistent, professional tone
            });
        });

        return response.choices[0].message.content || "Hệ thống không thể tạo feedback vào lúc này.";
    }

    /**
     * Evaluates multiple screenshots against a specific requirement.
     */
    public async evaluateImageAsync(imageBuffers: { buffer: Buffer, isMockup?: boolean }[], requirement: string, isHybrid: boolean = false): Promise<{ score: number; explanation: string, relevantImageIndices?: number[] }> {
        // const model = this.genAi.getGenerativeModel({ 
        //     model: config.gemini.model,
        //     generationConfig: {
        //         temperature: 0.1, // Low temperature for consistent grading
        //         responseMimeType: "application/json"
        //     }
        // });

        const systemPrompt = `You are an automated UI grading assistant.
Examine the provided screenshot. Does the screenshot satisfy this specific requirement?
Requirement: "${requirement}"

CRITICAL INSTRUCTION REGARDING EMPTY STATES:
The application is running in a sandbox environment where the database is completely empty (0 rows of data). 
If the requirement asks for a "List of items in a table", and you see a correctly structured table or grid with the expected column headers (e.g., Id, Name, Age), but there are NO data rows, you MUST award FULL points. 
Do NOT penalize the student for missing data rows.
Similarly, if the requirement asks for row-level buttons (like "Update" or "Delete" in each row), but the table is empty, you MUST award FULL points for the existence of the List view. Do NOT penalize the absence of row-level buttons if the table itself is empty.

CRITICAL INSTRUCTION REGARDING MOCKUPS AND IMAGE SEQUENCE:
You will be provided with one or more images. Some images may be teacher mockups, templates, or requirement descriptions.
TEACHER MOCKUPS TYPICALLY HAVE:
- Dotted or grid backgrounds (design canvas)
- Perfect, professional alignment
- Explanatory arrows, dimensions, or red warning text
- No device emulator frame (no Android/iOS status bar or window borders)
STUDENT SUBMISSIONS TYPICALLY HAVE:
- Device emulator frames (Android/iOS status bar, navigation bar)
- Web browser borders
- Realistic, sometimes imperfect alignment or data.

You MUST evaluate the STUDENT'S ACTUAL SUBMISSION. 
If the ONLY images provided are clearly TEACHER MOCKUPS or templates, you MUST REJECT them and give a score of 0.0. 
If there are multiple images, always pick the one that is clearly a student's actual running application.
If you reject due to only finding teacher mockups, your explanation MUST be: "Chỉ tìm thấy ảnh mẫu của giáo viên, không có ảnh chụp màn hình bài làm thực tế của sinh viên. Đánh giá 0 điểm."

CRITICAL INSTRUCTION REGARDING DATA LOGIC (FILTERING/SORTING/STATES):
If the requirement involves business logic applied to data (e.g., filtering out certain items, sorting, or specific data states), evaluate ONLY the visible data in the screenshot. If the data shown logically satisfies the condition, you MUST award FULL points. DO NOT demand or expect visible UI controls (like filter buttons, sort dropdowns, or toggle switches) unless the requirement explicitly mentions building such UI controls. Assume the logic is handled at the code/backend level.

CRITICAL INSTRUCTION REGARDING TRANSIENT UI STATES (LOADING/EMPTY/DEBOUNCE):
You MUST evaluate EXACTLY what is shown in the screenshot. If the requirement explicitly asks for a UI state (like Skeleton Loading, Empty State, or Error State) and it is NOT visible in ANY of the provided screenshots, you MUST deduct points proportionally. Do NOT assume they implemented it. Grading must be strict and based purely on visible visual evidence.

${isHybrid ? `CRITICAL INSTRUCTION REGARDING LOGIC-DRIVEN UI BEHAVIOR (HYBRID RULES):
This requirement involves complex business logic (e.g., filtering, sorting, toggling states). YOUR JOB IS STRICTLY TO VERIFY VISUAL DESIGN, NOT LOGICAL BEHAVIOR.
1. Component Existence: For EACH required UI component (e.g., toggle switch, warning label, search bar), if it visually exists in AT LEAST ONE image, consider that component's UI requirement satisfied.
2. State Transitions: DO NOT attempt to verify if components change state correctly across multiple images (e.g., verifying if a toggle actually removes a label when switched off). State transitions and business logic are evaluated separately by the Code Review Engine.
3. Screen Identification & Anchoring Bias: You MUST visually scan the ENTIRE image from top to bottom. DO NOT reject a screenshot by assuming it is the "wrong screen" just because you see extra UI elements (e.g., heart icons, extra buttons). VLM models often suffer from anchoring bias (e.g., seeing a heart icon and immediately assuming it's a "Favorites" screen, thus blinding themselves to the Search Bar at the top). You MUST NOT do this. Focus ONLY on whether the SPECIFIC components requested in this requirement are present anywhere in the image. If they are present, it IS the correct screen.
4. Scoring: If all requested UI components are visually present and match the design requirements, award a 1.0 (FULL POINTS). Do not deduct points for broken logic or incorrect data states, as long as the UI elements themselves are visible.` : ''}

Answer ONLY with valid JSON in the following format:
{
  "score": <0.0, 0.25, 0.5, 0.75, or 1.0>,
  "explanation": "Brief reasoning for why this score was given. CRITICAL: MUST BE IN VIETNAMESE.",
  "relevantImageIndices": [0]
}
where 1.0 means fully satisfied, 0.0 means not satisfied at all, and anything in between is partial credit. The score MUST be exactly 0.0, 0.25, 0.5, 0.75, or 1.0. 'relevantImageIndices' is an array of integers (e.g. [0, 1]) indicating WHICH of the provided images contain the evidence. You MUST NOT return all indices blindly. Select ONLY the top 1 to 3 MOST distinct and representative images that best prove the requirement.`;


        const messageContent: any[] = [{ type: "text", text: systemPrompt }];
        imageBuffers.forEach((img, index) => {
            if (img.isMockup) {
                messageContent.push({ type: "text", text: `Image ${index} [TEACHER MOCKUP - DO NOT EVALUATE]:` });
            } else {
                messageContent.push({ type: "text", text: `Image ${index} [STUDENT SUBMISSION]:` });
            }
            messageContent.push({
                type: "image_url",
                image_url: {
                    url: `data:image/jpeg;base64,${img.buffer.toString("base64")}`,
                    detail: "low"
                }
            });
        });

        console.log(`[GeminiAiProvider] Sending ${imageBuffers.length} images to Vision AI (detail: low) for rule: ${requirement.substring(0, 50)}...`);

        let imageHashData = '';
        imageBuffers.forEach((img) => {
            imageHashData += img.buffer.length.toString() + (img.isMockup ? '1' : '0');
        });
        const cacheKey = "vis_" + crypto.createHash('sha256').update(systemPrompt + requirement + imageHashData).digest('hex');

        const startTime = Date.now();

        try {
            const response: any = await AiClientManager.executeWithFallback(async (client, model) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout
                try {
                    return await Promise.race([
                        client.chat.completions.create({
                            model: model,
                            messages: [
                                {
                                    role: "user",
                                    content: messageContent
                                }
                            ],
                            temperature: 0.0
                        }, {
                            signal: controller.signal as any,
                            maxRetries: 0   // Don't retry at all internally to prevent hanging
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 45000))
                    ]);
                } finally {
                    clearTimeout(timeoutId);
                }
            }, cacheKey);

            let text = response.choices[0].message.content?.trim() || "{}";

            text = text.replace(/^```json/g, "").replace(/```$/g, "").trim();
            const parsedResult = JSON.parse(text);

            console.log(`[GeminiAiProvider] Vision API returned in ${Date.now() - startTime}ms. Confidence: ${parsedResult.score}`);

            const score = parseFloat(parsedResult.score);
            if (isNaN(score)) return { score: 0.0, explanation: "Failed to parse score from AI.", relevantImageIndices: [0] };
            return {
                score: Math.max(0.0, Math.min(1.0, score)),
                explanation: parsedResult.explanation || "No explanation provided.",
                relevantImageIndices: Array.isArray(parsedResult.relevantImageIndices) ? parsedResult.relevantImageIndices : [parsedResult.relevantImageIndex || 0]
            };
        } catch (error: any) {
            console.error(`[GeminiAiProvider] Failed to evaluate image (outer):`, error.message || error);
            throw new Error(`Hệ thống chấm điểm AI Vision gặp sự cố: ${error.message || 'Unknown error'}`);
        }
    }

    public async parseSqlAnswerKeyAsync(sqlContent: string, rubricRules: any[]): Promise<any[]> {
        const systemPrompt = `You are an expert SQL parser and Database Assessor.
Your task is to analyze a teacher's SQL Answer Key file and map the correct SQL queries to a given list of grading rubric rules.

INPUT:
1. The teacher's raw SQL file content. This file contains the complete answer key, usually including DDL commands (to setup the database, create tables, insert mock data) and DML/SELECT commands (the answers for specific questions like Q1, Q2...).
2. A JSON array of Rubric Rules. Some of these rules are for SQL Execution (\`scoringStrategy: "SqlExecutionProbe"\`).

OUTPUT:
Return ONLY a valid JSON array of rules. This array must be identical to the input array, EXCEPT for the rules with \`scoringStrategy: "SqlExecutionProbe"\`.
For those rules, you MUST populate the \`requiredEvidence[0].sqlProbe\` object with a \`setupScript\` and an array of \`testCases\`.

HOW TO MAP QUERIES:
- Read the title and description of each rule to understand what question it represents (e.g. "Question 1", "Select Accessories Subcategories").
- Find the corresponding query in the teacher's SQL file.
- Look for comments like /* Q1 */, -- Question 2, etc. to help map the queries accurately.
- Extract the raw SQL query exactly as it is written in the file.
- The \`setupScript\` property MUST be returned as an empty string "". The Backend will handle extracting the setup script automatically. DO NOT try to generate or extract it here to save tokens.

JSON SCHEMA FOR sqlProbe:
{
  "sqlProbe": {
    "description": "SQL Test Cases",
    "setupScript": "CREATE TABLE ... INSERT INTO ...",
    "testCases": [
      {
        "id": "q1",
        "title": "Title of the test case",
        "query": "SELECT * FROM ...", // THE EXACT QUERY EXTRACTED FROM THE SQL FILE
        "queryType": "select", // "select", "ddl", "dml", or "procedure"
        "points": 1,
        "expectedObjectName": "Departments" // IMPORTANT: For "ddl" queries, MUST provide the object name being created
      }
    ]
  }
}

CRITICAL RULES:
1. Output MUST be valid JSON only. No markdown fences, no explanations.
2. The returned array must have the exact same number of rules as the input array.
3. Keep all other fields (id, title, description, weight, scoringStrategy, etc.) intact.
4. For \`queryType\`, use "select" for SELECT, "ddl" for CREATE/ALTER/DROP, "dml" for INSERT/UPDATE/DELETE, and "procedure" for Stored Procedures.
5. DO NOT generate \`expectedRows\` or \`expectedColumns\`. The system will automatically execute the \`query\` to get the expected results at runtime!`;

        const prompt = `Rubric Rules:\n${JSON.stringify(rubricRules, null, 2)}\n\nTeacher's SQL File Content:\n${sqlContent}`;

        try {
            const response = await AiClientManager.executeWithFallback(async (client, model) => {
                return await client.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.1
                });
            });

            let text = response.choices[0].message.content?.trim() || "[]";
            text = text.replace(/^```json/gi, "").replace(/```$/g, "").trim();
            const updatedRules = JSON.parse(text);

            if (Array.isArray(updatedRules) && updatedRules.length === rubricRules.length) {
                return updatedRules;
            } else {
                console.warn("[GeminiAiProvider] parseSqlAnswerKeyAsync returned malformed array. Returning original rules.");
                return rubricRules;
            }
        } catch (error: any) {
            console.error("[GeminiAiProvider] Failed to parse SQL Answer Key:", error);
            throw new Error(`Lỗi khi AI phân tích file SQL: ${error.message}`);
        }
    }
}

