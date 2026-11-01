// @ts-nocheck
import { consoleFunctionalScore } from './console-functional-score.js';
import { RubricDefinition } from '../../core/domain/rubric/RubricDefinition';
import { RubricRule } from '../../core/domain/rubric/RubricRule';
import { Evidence } from '../../core/domain/evidence/Evidence';
import { AssessmentReport, ScoredRule, RuleEvidence } from '../../core/domain/review/AssessmentReport';
import { IAiProvider } from '../../core/contracts/IAiProvider';
import { IArtifactStore } from '../../core/contracts/IArtifactStore';
import { HTTPProbeEngine } from './HTTPProbeEngine';
import { AICodeReviewEngine, ProjectSourceSnapshot } from './AICodeReviewEngine';
import { StdInOutProbeEngine } from './StdInOutProbeEngine';
import { SqlExecutionProbeEngine } from './SqlExecutionProbeEngine';
import { SandboxHandle } from '../sandbox/ExecutionSandboxService';
import { UniversalStaticAnalyzer } from './UniversalStaticAnalyzer';
import { AiTextAnalysisEngine } from './AiTextAnalysisEngine';
import { ExtractedDocument } from '../../assignment/DocumentExtractor';
import { globalJobManager } from '../queue/SubmissionJobManager';
import { normaliseSubjectCode } from '../../core/domain/rubric/SubjectProjectTypes';
import { config } from '../../config/index.js';
import { assertRealGradingMode } from '../../config/grading-mode.js';
import type { ExecutionObserver } from './execution-events.js';
import { scoreBrowserWorkflows } from './browser-workflow-score.js';

export interface EvaluationContext {
    sandbox: SandboxHandle;
    sourceSnapshot: ProjectSourceSnapshot;
    evidencePool: Evidence[];
    /** Path to extracted submission on disk (needed for StdInOutProbe) */
    submissionPath?: string;
    /** Extracted document for AiTextAnalysis (from Docx/PDF) */
    extractedDocument?: ExtractedDocument;
    crashLogs?: string;
    runtimeTestSummary?: string;
    consoleVerification?: any;
    submissionId?: string;
    subjectCode?: string;
    assignmentTitle?: string;
    projectType?: string;
    onExecutionEvent?: ExecutionObserver;
}

interface RuleScore {
    ruleId: string;
    passed: boolean;
    score: number;
    reason: string;
    evidence?: RuleEvidence;
    needsReview?: boolean;
}

export class RubricEvaluator {
    private httpProbe = new HTTPProbeEngine();
    private aiCodeReview = new AICodeReviewEngine();
    private stdInOutProbe = new StdInOutProbeEngine();
    private staticAnalyzer = new UniversalStaticAnalyzer();
    private textAnalysisEngine = new AiTextAnalysisEngine();
    private sqlProbe = new SqlExecutionProbeEngine();

    constructor(
        private readonly aiProvider: IAiProvider,
        private readonly artifactStore: IArtifactStore
    ) { }

    public async evaluateAsync(
        submissionId: string,
        assignmentId: string,
        studentId: string,
        rubric: RubricDefinition,
        context: EvaluationContext,
        onProgress?: (current: number, total: number, message: string, meta?: any) => void
    ): Promise<AssessmentReport> {
        assertRealGradingMode(config.ai.stubMode);
        let totalScore = 0;
        const passedRules: ScoredRule[] = [];
        const failedRules: ScoredRule[] = [];
        const manualReviewNotes: string[] = [];
        let requiresManualReview = false;
        // Shared variables for test chaining across multiple HTTP Probe rules in this session
        const sharedVariables: Record<string, any> = {};

        // Fix legacy assignments where sum of weights > totalWeight
        const rawSum = rubric.rules.reduce((sum, r) => sum + (r.weight || 0), 0);
        if (Math.abs(rawSum - rubric.totalWeight) > 0.05 && rawSum > 0) {
            console.log(`[RubricEvaluator] Normalizing legacy weights. Sum: ${rawSum}, Expected: ${rubric.totalWeight}`);
            rubric.rules.forEach(r => {
                r.weight = Math.round((r.weight / rawSum) * rubric.totalWeight * 100) / 100;
            });
        }

        let currentRuleIndex = 0;
        const totalRules = rubric.rules.length;

        // Attach submissionId to context for engines that support session caching
        context.submissionId = submissionId;

        try {
            for (const rule of rubric.rules) {
                const job = globalJobManager.getJob(submissionId);
            if (job?.isCancelled) {
                throw new Error('Cancelled by user');
            }

            currentRuleIndex++;

            if (onProgress) {
                let hackerMeta: any = null;
                const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                const ruleKeywords = (rule.title + " " + (rule.contextHint || "")).toLowerCase().split(/\s+/).filter(w => w.length > 3);

                const isUI = rule.scoringStrategy === 'AIVision' || rule.category === 'UI';
                const isDoc = rule.scoringStrategy === 'AiTextAnalysis' || rule.category === 'Theory' || rule.category === 'Design';

                if ((isUI || isDoc) && context.extractedDocument) {
                    // Deep Scan Document Sections
                    const scoredSections = context.extractedDocument.sections.map(s => {
                        const sTitle = sanitize(s.title);
                        const sLabel = sanitize(s.partLabel);
                        const sContent = s.textContent.toLowerCase();

                        let score = 0;
                        for (const kw of ruleKeywords) {
                            if (sTitle.includes(kw)) score += 15;
                            if (sLabel.includes(kw)) score += 15;
                            const occurrences = sContent.split(kw).length - 1;
                            score += Math.min(occurrences, 10);
                        }

                        // Give slight bump to sections that actually contain images if this is a UI rule
                        if (isUI && s.images && s.images.length > 0) {
                            score += 5;
                        }

                        return { section: s, score };
                    });

                    scoredSections.sort((a, b) => b.score - a.score);

                    // Pick best section ONLY IF it scored > 0, otherwise we don't confidently know the section yet.
                    let bestSection = scoredSections[0].score > 0 ? scoredSections[0].section : null;

                    if (!bestSection) {
                        bestSection = context.extractedDocument.sections[currentRuleIndex % context.extractedDocument.sections.length];
                    }

                    if (isUI) {
                        let images = bestSection?.images?.filter((img: any) => !img.isMockup) || [];

                        if (scoredSections[0].score > 0 && images.length > 0) {
                            // Take the first image of the confidently matched section
                            const img = images[0];
                            const base64 = `data:${img.contentType};base64,${img.buffer.toString('base64')}`;
                            hackerMeta = { evidence: { screenshotBase64: base64 } };
                        } else {
                            // If no matching section or no images, show the rule description as a snippet
                            // This prevents LiveActivityLog from freezing on the previous rule's image!
                            hackerMeta = { evidence: { snippets: [{ codeSnippet: `// Đang tìm kiếm bằng chứng UI...\n// Tiêu chí: ${rule.title}\n\n${rule.description}` }] } };
                        }
                    } else {
                        // Document Rule
                        const docText = bestSection.title + "\n" + bestSection.textContent;
                        hackerMeta = { evidence: { snippets: [{ codeSnippet: docText.substring(0, 4000) }] } };
                    }
                } else if (context.sourceSnapshot && context.sourceSnapshot.files && context.sourceSnapshot.files.length > 0) {
                    // Code Rule: Exact Content Deep Scanning
                    // Calculate a relevance score for each file based on keyword matches in content and path
                    const scoredFiles = context.sourceSnapshot.files.map(f => {
                        const pathLower = f.relativePath.toLowerCase();
                        const contentLower = f.content.toLowerCase();
                        let score = 0;
                        for (const kw of ruleKeywords) {
                            if (pathLower.includes(kw)) score += 10; // Path matches are highly relevant
                            // Count occurrences safely without regex
                            const occurrences = contentLower.split(kw).length - 1;
                            score += Math.min(occurrences, 20); // Cap content matches to prevent huge files from dominating
                        }
                        return { file: f, score };
                    });

                    // Sort by highest score
                    scoredFiles.sort((a, b) => b.score - a.score);

                    // Pick the best file (or fallback if no keywords matched)
                    let bestFile = scoredFiles[0].file;
                    if (scoredFiles[0].score === 0) {
                        bestFile = context.sourceSnapshot.files[currentRuleIndex % context.sourceSnapshot.files.length];
                    }

                    const combinedCode = `// ${bestFile.relativePath}\n${bestFile.content}`;
                    hackerMeta = { evidence: { snippets: [{ codeSnippet: combinedCode.substring(0, 5000) }] } };
                }

                // Send currentRuleIndex - 1 so % only increases AFTER completion of previous tasks
                onProgress(currentRuleIndex - 1, totalRules, `Đang phân tích: ${rule.title}`, hackerMeta);
            }

            const executionScore = consoleFunctionalScore(rule, context.consoleVerification);
            const ruleResult = executionScore ? { ruleId: rule.id, ...executionScore } : await this.evaluateRuleAsync(rule, context, sharedVariables);
            if (ruleResult.reviewWarning) {
                requiresManualReview = true;
                manualReviewNotes.push(`${rule.title}: ${ruleResult.reviewWarning}`);
            }

            if (ruleResult.needsReview) {
                requiresManualReview = true;
                manualReviewNotes.push(`Rule '${rule.title}' requires manual review: ${ruleResult.reason}`);
                continue;
            }

            // Senior Safety Net: Prevent NaN from contaminating the total score
            if (isNaN(ruleResult.score) || ruleResult.score === null || ruleResult.score === undefined) {
                ruleResult.score = 0;
            }

            // Academic Rounding: Round to nearest 0.05 step to eliminate weird values like 0.19 or 0.13
            // Valid partial scores for 0.25 max weight will be: 0.05, 0.15, 0.20, 0.25
            const SCORE_STEP = 0.05;
            ruleResult.score = Math.round(ruleResult.score / SCORE_STEP) * SCORE_STEP;

            // Prevent rounding up from exceeding the max weight
            if (ruleResult.score > rule.weight) {
                ruleResult.score = rule.weight;
            }

            // Fix floating point precision issues (e.g. 0.15000000000000002)
            ruleResult.score = Math.round(ruleResult.score * 100) / 100;

            totalScore += ruleResult.score;
            context.onExecutionEvent?.({ stage: 3, status: 'info', message: `[Điểm tiêu chí] ${rule.description?.match(/\bQ\d+\.(?:c|sql)\b/i)?.[0] || rule.title}: ${ruleResult.score}/${rule.weight}. ${ruleResult.reason}` });

            const scoredRule: ScoredRule = {
                ruleId: rule.id,
                title: rule.description?.match(/\bQ\d+\.(?:c|sql)\b/i)?.[0] || rule.title,
                description: rule.description,
                weight: rule.weight,
                earnedScore: ruleResult.score,
                scoringStrategy: executionScore ? 'StdInOutProbe' : rule.scoringStrategy,
                passed: ruleResult.passed,
                evidenceIds: [],
                evidence: ruleResult.evidence || {},
                details: ruleResult.reason
            };

            // Enhance evidence with DOCX extracted images ONLY if not already provided by AIVision
            if (context.extractedDocument && scoredRule.evidence && !scoredRule.evidence.screenshotBase64) {
                // Theory/Code Review rules should NOT extract random images even if they mention 'UI'.
                // Only explicitly UI/UX category or Vision-based rules should show fallback images.
                const isUI = rule.category === ('UI/UX' as any) || rule.scoringStrategy === 'AIVision';
                if (isUI) {
                    const sanitize = (str: string) => str.toLowerCase().replace(/[\s_]/g, '');
                    const hint = rule.contextHint ? sanitize(rule.contextHint) : sanitize(rule.title);

                    const getKeywords = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
                    const ruleKeywords = getKeywords(rule.title + " " + (rule.contextHint || ""));

                    const matchingSections = context.extractedDocument.sections.filter((s, index, arr) => {
                        const pLabel = sanitize(s.partLabel);
                        const sTitle = sanitize(s.title);
                        if (pLabel.includes(hint) || hint.includes(pLabel) || sTitle.includes(hint) || hint.includes(sTitle)) return true;

                        let combinedText = s.title + " " + s.textContent;
                        // Include context from the immediately preceding section to bridge Question (PART D) and Answer (Task D1)
                        if (index > 0) {
                            combinedText += " " + arr[index - 1].title + " " + arr[index - 1].textContent;
                        }

                        const sectionKeywords = getKeywords(combinedText);
                        let matches = 0;
                        for (const kw of ruleKeywords) {
                            if (sectionKeywords.includes(kw)) matches++;
                        }
                        return ruleKeywords.length > 0 && matches >= (ruleKeywords.length * 0.6);
                    });

                    // Take all matching images up to 10 (we no longer slice from the end, we extract everything including mockups so the UI displays the full context)
                    const matchingImages = matchingSections.flatMap(s => s.images || []).slice(0, 10);

                    if (matchingImages.length > 0 && scoredRule.evidence) {
                        scoredRule.evidence.extractedImages = matchingImages.map(img => ({
                            label: img.label,
                            contentType: img.contentType,
                            base64: img.buffer.toString('base64')
                        }));
                    }
                }
            }

            if (ruleResult.passed) {
                passedRules.push(scoredRule);
            } else {
                failedRules.push(scoredRule);
            }
            }
        } catch (err: any) {
            console.warn(`[RubricEvaluator] Evaluation interrupted for ${submissionId}: ${err.message}. Building partial report.`);
            
            totalScore = Math.round(totalScore * 100) / 100;
            if (totalScore > rubric.totalWeight) totalScore = rubric.totalWeight;

            const partialReport: AssessmentReport = {
                submissionId,
                assignmentId,
                studentId,
                totalScore,
                maxPossibleScore: rubric.totalWeight,
                isPass: false,
                passedRules,
                failedRules,
                manualReviewNotes: requiresManualReview ? manualReviewNotes : undefined,
                error: err.message || 'Unknown error occurred during evaluation',
                auditMetadata: {
                    evaluatorVersion: '1.0.0',
                    timestamp: new Date().toISOString(),
                    auditLogIds: []
                }
            };

            err.partialReport = partialReport;
            throw err;
        } finally {
            // Clean up any stateful sessions
            if (context.submissionId) {
                await this.sqlProbe.cleanupSessionAsync(context.submissionId);
            }
        }

        totalScore = Math.round(totalScore * 100) / 100;

        // Senior Safety Net: Cap score at total weight in case of legacy corrupted assignments
        if (totalScore > rubric.totalWeight) {
            totalScore = rubric.totalWeight;
        }

        const isPass = !requiresManualReview && (totalScore / rubric.totalWeight) >= rubric.passThreshold;

        // Generate final overarching feedback
        let overallFeedback: string | undefined;
        try {
            if (onProgress) {
                onProgress(totalRules, totalRules, `Đang tổng hợp nhận xét (AI Feedback)...`, null);
            }
            const feedbackRules = (rules: any[]) => rules.map(rule => rule.scoringStrategy === 'SqlExecutionProbe' ? { ...rule, evidence: {}, details: `SQL đã thực thi: ${rule.earnedScore}/${rule.weight} điểm.` } : rule);
            overallFeedback = await this.aiProvider.generateOverallFeedbackAsync(
                rubric.title || (context as any).assignmentTitle || "Bài tập rèn luyện",
                feedbackRules(passedRules),
                feedbackRules(failedRules),
                totalScore,
                rubric.totalWeight
            );
        } catch (fbErr) {
            console.error(`[RubricEvaluator] Failed to generate overall feedback:`, fbErr);
        }

        return {
            submissionId,
            assignmentId,
            studentId,
            totalScore,
            maxPossibleScore: rubric.totalWeight,
            isPass,
            passedRules,
            failedRules,
            manualReviewNotes: requiresManualReview ? manualReviewNotes : undefined,
            overallFeedback,
            sourceSnapshot: context.sourceSnapshot ? {
                projectType: context.sourceSnapshot.projectType,
                files: context.sourceSnapshot.files.slice(0, 50).map(f => ({
                    relativePath: f.relativePath.replace(/^[/\\]+/, ''),
                    content: f.content
                }))
            } : undefined,
            auditMetadata: {
                evaluatorVersion: '3.1.0',
                timestamp: new Date().toISOString(),
                auditLogIds: []
            }
        };
    }

    private async evaluateRuleAsync(rule: RubricRule, context: EvaluationContext, sharedVariables: Record<string, any> = {}): Promise<RuleScore> {
        const plannedTests = context.evidencePool.filter(e => e.type === 'browser.workflow.planned' && e.source === 'AuthRequirementTemplate' && e.payload?.ruleIds?.includes(rule.id)).map(e => e.payload.testId);
        if (plannedTests.length) return { ruleId: rule.id, ...scoreBrowserWorkflows(plannedTests, context.evidencePool, rule.weight) };
        const formatScore = (s: number) => parseFloat(s.toFixed(3));
        const normSubj = normaliseSubjectCode(context.subjectCode);
        const isStrictMobile = (normSubj && normSubj.startsWith('PRM'))
            || context.sandbox?.projectType === 'mobile'
            || context.sourceSnapshot?.projectType === 'mobile'
            || (context.assignmentTitle && /\bprm\d+/i.test(context.assignmentTitle))
            || (context.sourceSnapshot?.files?.some(f => f.relativePath.endsWith('.dart') || f.relativePath.includes('AndroidManifest.xml') || f.relativePath.includes('pubspec.yaml')) && !context.sourceSnapshot?.files?.some(f => f.relativePath.endsWith('.csproj') || f.relativePath.endsWith('.sln')));
        try {
            switch (rule.scoringStrategy as string) {
                case "AIVision": {
                    const browserTestIds = (rule.requiredEvidence || []).flatMap(spec => spec.browserProbe?.testIds || []);
                    if (browserTestIds.length) {
                        return { ruleId: rule.id, ...scoreBrowserWorkflows(browserTestIds, context.evidencePool, rule.weight) };
                    }
                    if (normSubj === 'FER202' && !context.evidencePool.some(e => e.type === 'browser.screenshot.captured' && ['PlaywrightExecutor', 'PlaywrightPlugin'].includes(e.source))) {
                        return { ruleId: rule.id, passed: false, score: 0, needsReview: true, reason: 'Chưa có ảnh giao diện FER202 từ trình duyệt thực thi. Cần kiểm tra runner và chấm lại; không dùng đọc code thay cho xác minh UI.' };
                    }
                    const ruleText = (rule.title + " " + (rule.description || "")).toLowerCase();

                    // Get ALL screenshots from the pool (captured by Playwright's universal route discovery)
                    const screenshotEvidences = context.evidencePool.filter(e => e.type === 'browser.screenshot.captured');

                    // Fetch all image buffers
                    const imageBuffers: { buffer: Buffer, contentType: string, isMockup?: boolean, sectionIndex?: number }[] = [];
                    for (const ev of screenshotEvidences) {
                        if (ev.payload?.artifactId) {
                            const buffer = await this.artifactStore.getArtifactAsync(ev.payload.artifactId);
                            if (buffer) imageBuffers.push({ buffer, contentType: 'image/png', isMockup: false }); // Playwright defaults to PNG
                        }
                    }

                    // If no Playwright screenshots (e.g. Mobile project), fallback to DOCX extracted images
                    let extractedImages: any[] = [];
                    if (imageBuffers.length === 0 && context.extractedDocument) {
                        const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const hint = rule.contextHint ? sanitize(rule.contextHint) : sanitize(rule.title);
                        const getKeywords = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
                        const ruleKeywords = getKeywords(rule.title + " " + (rule.contextHint || ""));

                        const matchingIndices: number[] = [];
                        const matchScores: { index: number, matches: number }[] = [];
                        context.extractedDocument.sections.forEach((s, index, arr) => {
                            const pLabel = sanitize(s.partLabel);
                            const sTitle = sanitize(s.title);

                            // 1. Direct match on identifiers
                            if (pLabel.includes(hint) || hint.includes(pLabel) || sTitle.includes(hint) || hint.includes(sTitle)) {
                                matchingIndices.push(index);
                                return;
                            }

                            // 2. Fuzzy match on text content (Widen sliding window to include next section)
                            let combinedText = s.title + " " + s.textContent;
                            if (index > 0) {
                                combinedText += " " + arr[index - 1].title + " " + arr[index - 1].textContent;
                            }
                            if (index < arr.length - 1) {
                                combinedText += " " + arr[index + 1].title + " " + arr[index + 1].textContent;
                            }

                            const sectionKeywords = getKeywords(combinedText);
                            let matches = 0;
                            for (const kw of ruleKeywords) {
                                if (sectionKeywords.includes(kw)) matches++;
                            }

                            let studentImageCount = (s.images || []).filter(img => !img.isMockup).length;
                            if (index > 0) studentImageCount += (arr[index - 1].images || []).filter(img => !img.isMockup).length;
                            if (index < arr.length - 1) studentImageCount += (arr[index + 1].images || []).filter(img => !img.isMockup).length;

                            let adjustedMatches = matches;
                            // Since this matching logic is purely for finding Evidence IMAGES to send to Gemini Vision,
                            // we heavily penalize text-only sections (like the teacher's exam prompt) to ensure 
                            // the algorithm anchors onto the student's actual answer section which contains their screenshots.
                            if (studentImageCount === 0) {
                                adjustedMatches = adjustedMatches * 0.1;
                            }

                            matchScores.push({ index, matches: adjustedMatches });

                            // If more than 60% of keywords match AND it has images, consider it the correct section!
                            if (ruleKeywords.length > 0 && matches >= (ruleKeywords.length * 0.6) && studentImageCount > 0) {
                                matchingIndices.push(index);
                            }
                        });

                        // Fallback: If strict 60% threshold failed, find the section with the absolute highest keyword density (Relative Best Match)
                        if (matchingIndices.length === 0 && matchScores.length > 0) {
                            matchScores.sort((a, b) => b.matches - a.matches);
                            const bestMatch = matchScores[0];
                            // If it matches at least 15% of keywords OR at least 3 keywords, we consider it the best guess.
                            if (bestMatch.matches >= (ruleKeywords.length * 0.15) || bestMatch.matches >= 3) {
                                matchingIndices.push(bestMatch.index);
                                console.log(`[RubricEvaluator] Rule '${rule.title}' fell back to relative best match at section ${bestMatch.index} with ${bestMatch.matches} matches.`);
                            }
                        }

                        const expandedIndices = new Set<number>();
                        matchingIndices.forEach(idx => {
                            expandedIndices.add(idx);
                            // Expand up to 2 subsequent sections to capture subheadings containing images.
                            // We stop immediately if we hit a section that looks like a major new requirement heading.
                            for (let i = 1; i <= 2; i++) {
                                const nextIdx = idx + i;
                                if (nextIdx < context.extractedDocument!.sections.length) {
                                    const nextSection = context.extractedDocument!.sections[nextIdx];
                                    const nextPartLabel = (nextSection.partLabel || '').toLowerCase();

                                    // Stop expanding if the next section is a numbered major heading
                                    const isMajorHeading = /^(question|requirement|part|task|bài|câu)\s*[0-9]+/i.test(nextPartLabel) ||
                                        /^[0-9]+[\.\)]\s*(question|requirement|part|task|bài|câu)/i.test(nextPartLabel);

                                    if (isMajorHeading) break;

                                    expandedIndices.add(nextIdx);
                                }
                            }
                        });

                        const matchingSections = Array.from(expandedIndices).sort((a, b) => a - b).map(idx => context.extractedDocument!.sections[idx]);

                        extractedImages = matchingSections.flatMap((s, idx) => (s.images || []).map(img => ({ ...img, sectionIndex: idx })));

                        // If no hint matched, and it's definitely UI, just take all images except from DESCRIPTION or QUESTION sections
                        if (extractedImages.length === 0 && (rule.category?.toUpperCase().includes('UI') || rule.category?.toUpperCase().includes('UX'))) {
                            extractedImages = context.extractedDocument.sections
                                .map((s, idx) => ({ section: s, sectionIndex: idx }))
                                .filter(({ section }) => {
                                    const lbl = (section.partLabel || '').toUpperCase();
                                    return !lbl.includes('DESCRIPTION') && !lbl.includes('QUESTION') && !lbl.includes('PROBLEM');
                                })
                                .flatMap(({ section, sectionIndex }) => (section.images || []).map(img => ({ ...img, sectionIndex })));
                        }

                        // Prioritize student submissions (!isMockup) over teacher mockups
                        extractedImages.sort((a, b) => {
                            if (a.isMockup === b.isMockup) return 0;
                            return a.isMockup ? 1 : -1;
                        });

                        // Take up to 6 images (mockups included, they will be flagged and filtered by the AI prompt)
                        for (const img of extractedImages.slice(0, 6)) {
                            imageBuffers.push({ buffer: img.buffer, contentType: img.contentType, isMockup: img.isMockup, sectionIndex: img.sectionIndex });
                        }
                    }

                    // Determine if this is a HYBRID requirement (UI + Logic) based on LLM classification OR keyword fallback OR Mobile project
                    const logicKeywords = ["logic", "offline", "storage", "debounce", "state", "sqlite", "hive", "sharedpreferences", "api", "integration", "network", "fetch", "ajax"];
                    const isHybrid = (rule as any).isHybrid === true || isStrictMobile || logicKeywords.some(kw => ruleText.includes(kw));

                    if (imageBuffers.length === 0) {
                        if (isStrictMobile && isHybrid) {
                            console.log(`[RubricEvaluator] No screenshot for Hybrid AIVision rule '${rule.title}' in PRM Mobile project. Strict PRM check: UI is missing -> 0 points.`);
                            let codeResult: any = null;
                            if (context.sourceSnapshot) {
                                try {
                                    codeResult = await this.aiCodeReview.evaluateAsync(
                                        context.sourceSnapshot,
                                        `STRICT INSTRUCTION: This is a hybrid UI + Logic rule. Verify that the underlying logic (API integration, state management, offline storage, debouncing, etc.) is correctly implemented in the source code. YOU MUST EXTRACT AT LEAST ONE CODE SNIPPET (via relevantSnippets array) AS EVIDENCE TO PROVE YOUR CONCLUSION. \n\nRequirement: ${rule.description}`,
                                        rule.title
                                    );
                                } catch (codeErr) {
                                    console.warn(`[RubricEvaluator] Code review failed for ${rule.id}:`, codeErr);
                                }
                            }
                            const codePct = codeResult ? (typeof codeResult.percentageComplete === 'number' ? codeResult.percentageComplete : (codeResult.passed ? 1.0 : 0.0)) : 0;
                            return {
                                ruleId: rule.id,
                                passed: false,
                                score: 0,
                                reason: `Phân tích Hybrid (50% UI, 50% Code). Điểm UI: 0/${formatScore(rule.weight * 0.5)}, Điểm Code: 0/${formatScore(rule.weight * 0.5)}. Tổng điểm: 0/${rule.weight}.\n\n❌ Không đạt (0 điểm): Bài nộp thiếu hình ảnh minh chứng giao diện UI (không tìm thấy ảnh chụp màn hình). Theo quy định đánh giá môn PRM (Mobile), tiêu chí Hybrid bắt buộc phải có đầy đủ cả hình ảnh UI thực thi và mã nguồn logic. Thiếu 1 trong 2 thành phần sẽ nhận 0 điểm.\n\n- Nhận xét UI: Không tìm thấy ảnh chụp màn hình giao diện trong bài nộp.\n- Nhận xét Code: ${codeResult?.reasoning || 'Không tìm thấy mã nguồn.'}`,
                                evidence: {
                                    snippets: codeResult?.relevantSnippets || [],
                                    codeExplanation: codeResult?.reasoning,
                                    hybridBreakdown: {
                                        visionPct: 0,
                                        codePct: codePct
                                    }
                                }
                            };
                        } else {
                            console.log(`[RubricEvaluator] No screenshot for AIVision rule '${rule.title}'. Falling back to 100% AICodeReview.`);
                            return this.evaluateRuleAsync({ ...rule, scoringStrategy: "AICodeReview" }, context, sharedVariables);
                        }
                    }

                    if (isHybrid) {
                        console.log(`[RubricEvaluator] Rule '${rule.title}' is HYBRID (UI + Logic). Executing AIVision + AICodeReview in parallel.`);
                    }

                    // --- 1. AIVision Execution ---
                    const visionPromise = (async () => {
                        const minConf = rule.requiredEvidence[0]?.minimumConfidence || 0.9;
                        const aiResult = await (this.aiProvider as any).evaluateImageAsync(imageBuffers.slice(0, 15), rule.description, isHybrid);
                        const aiScorePercentage = aiResult.score;
                        const relevantIndices = aiResult.relevantImageIndices || [0];
                        const primaryIndex = relevantIndices[0] ?? 0;
                        const primaryImage = imageBuffers[primaryIndex] || imageBuffers[0];
                        const primarySectionIndex = primaryImage?.sectionIndex;

                        const selectedImagesForUI = relevantIndices
                            .map((idx: number) => imageBuffers[idx])
                            .filter((img: any) => img); // Keep all images the AI deemed relevant, regardless of section index

                        const evaluatedStudentImages = selectedImagesForUI
                            .filter((img: any) => img && !img.isMockup)
                            .map((img: any) => ({
                                contentType: img.contentType,
                                base64: img.buffer.toString('base64')
                            }));

                        return { aiScorePercentage, aiResult, evaluatedStudentImages, minConf };
                    })();

                    // --- 2. AICodeReview Execution (If Hybrid) ---
                    const codePromise = (async () => {
                        if (isHybrid && context.sourceSnapshot) {
                            return await this.aiCodeReview.evaluateAsync(
                                context.sourceSnapshot,
                                `STRICT INSTRUCTION: This is a hybrid UI + Logic rule. Verify that the underlying logic (API integration, state management, offline storage, debouncing, etc.) is correctly implemented in the source code. YOU MUST EXTRACT AT LEAST ONE CODE SNIPPET (via relevantSnippets array) AS EVIDENCE TO PROVE YOUR CONCLUSION. \n\nRequirement: ${rule.description}`,
                                rule.title
                            );
                        }
                        return null;
                    })();

                    // --- Execute Parallel ---
                    const [visionOutput, codeResult] = await Promise.all([
                        visionPromise.catch(err => {
                            console.error(`[RubricEvaluator] Vision failed for ${rule.id}:`, err);
                            return null;
                        }),
                        codePromise.catch(err => {
                            console.warn(`[RubricEvaluator] Code Review failed for hybrid rule ${rule.id}:`, err);
                            return null;
                        })
                    ]);

                    // --- Combine Scores ---
                    let finalScore = 0;
                    let finalPassed = false;
                    let finalReason = "";
                    const evidencePayload: any = {};

                    if (!visionOutput && !codeResult) {
                        return this.fail(rule, "Cả hai hệ thống AI Vision và AI Code Review đều gặp sự cố hoặc không có dữ liệu.");
                    }

                    if (isHybrid) {
                        // 50% Vision, 50% Code
                        let visionPct = 0;
                        let codePct = 0;

                        if (visionOutput) {
                            visionPct = visionOutput.aiScorePercentage || 0;
                        }
                        if (codeResult) {
                            codePct = typeof codeResult.percentageComplete === 'number' ? codeResult.percentageComplete : (codeResult.passed ? 1.0 : 0.0);
                        }

                        if (visionOutput) {
                            evidencePayload.extractedImages = visionOutput.evaluatedStudentImages;
                            evidencePayload.visionExplanation = visionOutput.aiResult?.explanation;
                        }

                        if (codeResult) {
                            evidencePayload.snippets = codeResult.relevantSnippets;
                            evidencePayload.codeExplanation = codeResult.reasoning;
                        }

                        evidencePayload.hybridBreakdown = {
                            visionPct: visionPct,
                            codePct: codePct
                        };

                        if (isStrictMobile) {
                            // STRICT PRM HYBRID RULE (Mobile only):
                            // Bắt buộc phải có cả hình ảnh UI và Mã nguồn logic.
                            // Thiếu 1 trong 2 (hoặc 1 trong 2 = 0) -> Cho 0 điểm luôn!
                            if (visionPct <= 0 || codePct <= 0) {
                                finalScore = 0;
                                finalPassed = false;

                                let missingReason = "";
                                if (visionPct <= 0 && codePct <= 0) {
                                    missingReason = "Không tìm thấy cả hình ảnh giao diện UI và mã nguồn triển khai đạt yêu cầu.";
                                } else if (visionPct <= 0) {
                                    missingReason = "Thiếu hình ảnh minh chứng giao diện UI (hoặc UI không đạt yêu cầu). Sinh viên có mã nguồn nhưng không có ảnh UI đạt chuẩn.";
                                } else {
                                    missingReason = "Thiếu mã nguồn (Code) triển khai logic tương ứng (hoặc mã nguồn không đạt yêu cầu). Sinh viên có ảnh UI nhưng không có mã nguồn đạt chuẩn.";
                                }

                                finalReason = `Phân tích Hybrid (50% UI, 50% Code). Điểm UI: 0/${formatScore(rule.weight * 0.5)}, Điểm Code: 0/${formatScore(rule.weight * 0.5)}. Tổng điểm: 0/${rule.weight}.\n\n❌ Không đạt (0 điểm): ${missingReason} Theo quy định môn PRM (Mobile), tiêu chí Hybrid bắt buộc phải có đầy đủ cả hình ảnh UI và mã nguồn; thiếu 1 trong 2 thành phần sẽ nhận 0 điểm.\n\n- Nhận xét UI: ${visionOutput?.aiResult?.explanation || 'Không có minh chứng UI'}\n- Nhận xét Code: ${codeResult?.reasoning || 'Không có mã nguồn'}`;
                            } else {
                                // CẢ HAI ĐỀU CÓ (> 0)
                                const visionScore = visionPct * (rule.weight * 0.5);
                                const codeScore = codePct * (rule.weight * 0.5);
                                finalScore = Math.round((visionScore + codeScore) * 100) / 100;
                                finalPassed = finalScore >= (rule.weight * 0.7); // 70% threshold for mobile hybrid

                                finalReason = `Phân tích Hybrid (50% UI, 50% Code). Điểm UI: ${formatScore(visionScore)}/${formatScore(rule.weight * 0.5)}, Điểm Code: ${formatScore(codeScore)}/${formatScore(rule.weight * 0.5)}. Tổng điểm: ${formatScore(finalScore)}/${rule.weight}.\n\n- Nhận xét UI: ${visionOutput?.aiResult?.explanation || 'Giao diện đạt yêu cầu'}\n- Nhận xét Code: ${codeResult?.reasoning || 'Mã nguồn đạt yêu cầu'}`;
                            }
                        } else {
                            // Standard Hybrid for Web (PRN212, PRJ301, WDP301...) and other courses:
                            // Smart Compensation: UI states (Loading, Debounce, Empty, Error) are hard to capture in static screenshots.
                            // If student provided main UI (visionPct > 0) but Code Review shows complete logic, compensate UI score.
                            if (visionPct > 0 && codePct > visionPct) {
                                console.log(`[RubricEvaluator] Smart Compensation triggered: Code (${codePct}) > UI (${visionPct}). Compensating UI score.`);
                                visionPct = codePct;
                            }

                            const visionScore = visionPct * (rule.weight * 0.5);
                            const codeScore = codePct * (rule.weight * 0.5);
                            finalScore = Math.round((visionScore + codeScore) * 100) / 100;
                            finalPassed = finalScore >= (rule.weight * 0.5);

                            finalReason = `Phân tích Hybrid (50% UI, 50% Code). Điểm UI: ${formatScore(visionScore)}/${formatScore(rule.weight * 0.5)}, Điểm Code: ${formatScore(codeScore)}/${formatScore(rule.weight * 0.5)}. Tổng điểm: ${formatScore(finalScore)}/${rule.weight}.\n\n- Nhận xét UI: ${visionOutput?.aiResult?.explanation || 'Không có minh chứng UI'}\n- Nhận xét Code: ${codeResult?.reasoning || 'Không có mã nguồn'}`;
                        }
                    } else {
                        // 100% Vision
                        if (!visionOutput) return this.fail(rule, "Lỗi phân tích hình ảnh.");
                        finalScore = Math.round((visionOutput.aiScorePercentage * rule.weight) * 100) / 100;
                        finalPassed = visionOutput.aiScorePercentage >= visionOutput.minConf;
                        finalReason = `Đánh giá Giao diện (Vision confidence: ${visionOutput.aiScorePercentage.toFixed(2)}): ${visionOutput.aiResult.explanation}`;
                        evidencePayload.extractedImages = visionOutput.evaluatedStudentImages;
                        evidencePayload.explanation = visionOutput.aiResult.explanation;
                    }

                    return {
                        ruleId: rule.id,
                        passed: finalPassed,
                        score: finalScore,
                        reason: finalReason,
                        evidence: evidencePayload
                    };
                }

                case "HTTPProbe": {
                    if (!context.sandbox?.isReady || !context.sandbox.baseUrl) {
                        // Silently fallback to AICodeReview for desktop/algorithm projects
                        console.log(`[RubricEvaluator] Sandbox not ready for HTTPProbe (Rule: ${rule.id}). Falling back to AICodeReview.`);
                        return this.evaluateRuleAsync({ ...rule, scoringStrategy: "AICodeReview" }, context, sharedVariables);
                    }

                    // ═══════════════════════════════════════════════════════
                    // 50/50 HYBRID SCORING: Test Results + Code Review
                    // ═══════════════════════════════════════════════════════

                    // --- PREPARE PARALLEL EXECUTION ---
                    // 1. HTTP Probe Promise (Runs steps sequentially to maintain shared variables state)
                    const probeExecutionPromise = (async () => {
                        const results = [];
                        for (const evidenceSpec of rule.requiredEvidence) {
                            if (evidenceSpec.httpProbe) {
                                const result = await this.httpProbe.evaluateAsync(
                                    context.sandbox!.baseUrl!,
                                    evidenceSpec.httpProbe as any,
                                    sharedVariables
                                );
                                results.push(result);
                            }
                        }
                        return results;
                    })();

                    // 2. AI Code Review Promise
                    const codeReviewPromise = (async () => {
                        if (context.sourceSnapshot) {
                            return await this.aiCodeReview.evaluateAsync(
                                context.sourceSnapshot,
                                rule.description,
                                rule.title,
                                context.crashLogs,
                                context.runtimeTestSummary
                            );
                        }
                        return null;
                    })();

                    // --- EXECUTE HYBRID ENGINE IN PARALLEL ---
                    const [probeResults, codeResult] = await Promise.all([
                        probeExecutionPromise,
                        codeReviewPromise.catch(err => {
                            console.warn(`[RubricEvaluator] AI Code Review failed for hybrid rule ${rule.id}:`, err);
                            return null;
                        })
                    ]);

                    // --- PROCESS HTTP PROBE RESULTS (50%) ---
                    let probeScore = 0;
                    let probeEvidence: any = {};
                    if (probeResults.length > 0) {
                        const avgConfidence = probeResults.reduce((s, r) => s + r.confidence, 0) / probeResults.length;
                        probeScore = avgConfidence * (rule.weight * 0.5); // 50% of weight
                        probeEvidence = {
                            httpSteps: probeResults.flatMap(r => r.stepResults.map(s => ({
                                method: s.method || "UNKNOWN",
                                url: s.url || "UNKNOWN",
                                status: s.httpStatus,
                                requestBody: s.requestBody,
                                responseBody: s.responseBody,
                                assertions: (s as any).assertions
                            })))
                        };
                    }

                    // --- PROCESS AI CODE REVIEW RESULTS (50%) ---
                    let codeScore = 0;
                    let codeEvidence: any = {};
                    if (codeResult) {
                        const pct = typeof codeResult.percentageComplete === 'number' ? codeResult.percentageComplete : (codeResult.passed ? 1.0 : 0.0);
                        codeScore = pct * (rule.weight * 0.5); // 50% of weight
                        codeEvidence = {
                            snippets: codeResult.relevantSnippets,
                            explanation: codeResult.reasoning
                        };
                    }

                    // --- COMBINE ---
                    const totalScore = Math.round((probeScore + codeScore) * 100) / 100;

                    return {
                        ruleId: rule.id,
                        passed: totalScore >= rule.weight * 0.7,
                        score: totalScore,
                        reason: codeEvidence.explanation || "Đã kiểm tra qua Test API và Source Code.",
                        evidence: {
                            ...probeEvidence,
                            ...codeEvidence,
                            hybridBreakdown: {
                                codePct: rule.weight > 0 ? (codeScore / (rule.weight * 0.5)) : 0,
                                probePct: rule.weight > 0 ? (probeScore / (rule.weight * 0.5)) : 0
                            }
                        }
                    };
                }


                case "Manual":
                case "ManualReview":
                case "AIReview":
                case "CodeReview":
                case "AICodeReview": {
                    const spec = rule.requiredEvidence ? rule.requiredEvidence[0] : null;
                    if (!context.sourceSnapshot || context.sourceSnapshot.files.length === 0) {
                        if (context.extractedDocument) {
                            return this.evaluateRuleAsync({ ...rule, scoringStrategy: "AiTextAnalysis" }, context, sharedVariables);
                        }
                        return this.fail(rule, "Source code not available for AI evaluation");
                    }
                    const descriptionToEvaluate = spec?.semanticDescription || rule.description || (rule as any).criteria || rule.title;
                    const result = await this.aiCodeReview.evaluateAsync(
                        context.sourceSnapshot,
                        descriptionToEvaluate,
                        rule.title,
                        context.crashLogs,
                        context.runtimeTestSummary
                    );
                    // Use percentageComplete for proportional scoring
                    const pct = typeof result.percentageComplete === 'number'
                        ? result.percentageComplete
                        : (result.passed ? 1.0 : 0.0);
                    const ruleWeight = Number(rule.weight ?? rule.maxPoints ?? 0);
                    const score = Math.round(pct * ruleWeight * 100) / 100;
                    return {
                        ruleId: rule.id,
                        passed: pct >= 0.5,
                        score: score,
                        reason: result.reasoning,
                        reviewWarning: result.reviewWarning,
                        evidence: {
                            snippets: result.relevantSnippets,
                            codeSnippet: result.relevantSnippets?.[0]?.codeSnippet,
                            explanation: result.relevantSnippets?.[0]?.explanation,
                            filePath: result.relevantFiles?.join(", ")
                        }
                    };
                }

                case "UniversalStatic": {
                    if (!context.sourceSnapshot) return this.fail(rule, "Source code not available for static analysis");
                    if (!rule.staticPatterns || rule.staticPatterns.length === 0) return this.fail(rule, "No static patterns defined for rule");

                    // Map sourceSnapshot format to UniversalStaticAnalyzer format
                    const sourceFiles = context.sourceSnapshot.files.map(f => ({
                        relativePath: f.relativePath,
                        content: f.content
                    }));

                    const report = this.staticAnalyzer.analyze(sourceFiles, rule.staticPatterns as any);

                    // Simple scoring: percentage of passed patterns
                    const passedCount = report.passedPatterns.length;
                    const totalCount = rule.staticPatterns.length;
                    const scorePct = totalCount > 0 ? passedCount / totalCount : 0;

                    const evidenceSnippets = report.results
                        .filter(r => r.matches.length > 0)
                        .flatMap(r => r.matches.map(m => ({
                            codeSnippet: m.lineContent,
                            filePath: m.filePath,
                            explanation: `Found pattern: ${r.patternId}`
                        })));

                    return {
                        ruleId: rule.id,
                        passed: scorePct === 1.0, // Strictly require all patterns
                        score: Math.round((scorePct * rule.weight) * 100) / 100,
                        reason: report.summary,
                        evidence: {
                            snippets: evidenceSnippets.slice(0, 5) // Limit to top 5 snippets
                        }
                    };
                }

                case "AiTextAnalysis": {
                    if (!rule.referenceAnswer) return this.fail(rule, "No reference answer provided for AiTextAnalysis");

                    const isHybrid = (rule as any).isHybrid === true;

                    if (isHybrid) {
                        console.log(`[RubricEvaluator] Rule '${rule.title}' is HYBRID (Text + Code). Executing AiTextAnalysis + AICodeReview in parallel.`);
                    }

                    // --- 1. AiTextAnalysis Execution ---
                    const textPromise = (async () => {
                        let studentAnswer = "";

                        if (context.extractedDocument) {
                            const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const hint = rule.contextHint ? sanitize(rule.contextHint) : sanitize(rule.title);

                            const getKeywords = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
                            const ruleKeywords = getKeywords(rule.title + " " + (rule.contextHint || ""));

                            const matchingIndices: number[] = [];
                            context.extractedDocument.sections.forEach((s, index, arr) => {
                                const pLabel = sanitize(s.partLabel);
                                const sTitle = sanitize(s.title);
                                if (pLabel.includes(hint) || hint.includes(pLabel) || sTitle.includes(hint) || hint.includes(sTitle)) {
                                    matchingIndices.push(index);
                                    return;
                                }

                                let combinedText = s.title + " " + s.textContent;
                                if (index > 0) combinedText += " " + arr[index - 1].title + " " + arr[index - 1].textContent;

                                const sectionKeywords = getKeywords(combinedText);
                                let matches = 0;
                                for (const kw of ruleKeywords) {
                                    if (sectionKeywords.includes(kw)) matches++;
                                }
                                if (ruleKeywords.length > 0 && matches >= (ruleKeywords.length * 0.6)) {
                                    matchingIndices.push(index);
                                }
                            });

                            const expandedIndices = new Set<number>();
                            matchingIndices.forEach(idx => {
                                expandedIndices.add(idx);
                                // Expand up to 15 subsequent sections to capture heavily fragmented answers (e.g., each bullet point is a heading)
                                // AI will naturally ignore irrelevant subsequent questions.
                                for (let i = 1; i <= 15; i++) {
                                    if (idx + i < context.extractedDocument!.sections.length) {
                                        expandedIndices.add(idx + i);
                                    }
                                }
                            });

                            const matchingSections = Array.from(expandedIndices).sort((a, b) => a - b).map(idx => context.extractedDocument!.sections[idx]);

                            if (matchingSections.length > 0) {
                                studentAnswer = matchingSections.map(s => {
                                    let content = s.partLabel + ": " + s.title + "\n" + s.textContent;
                                    if (s.codeBlocks && s.codeBlocks.length > 0) {
                                        content += "\n" + s.codeBlocks.map(cb => `\`\`\`${cb.language}\n${cb.code}\n\`\`\``).join('\n');
                                    }
                                    return content;
                                }).join("\n\n");
                            } else {
                                studentAnswer = context.extractedDocument.rawText;
                                // Truncate to save tokens if we have to send the whole thing. Increased to 100,000 to prevent cutting off the end of long documents.
                                if (studentAnswer.length > 100000) studentAnswer = studentAnswer.substring(0, 100000) + "\n...[TRUNCATED]";
                            }
                        } else if (context.sourceSnapshot) {
                            const readme = context.sourceSnapshot.files.find(f => f.relativePath.toLowerCase().endsWith('readme.md'));
                            if (readme) {
                                studentAnswer = readme.content;
                            }
                        }

                        if (!studentAnswer || studentAnswer.trim().length === 0) {
                            return null;
                        }

                        let studentName = "Sinh viên";
                        if (context.submissionPath) {
                            const parts = context.submissionPath.split(/[\/\\]/);
                            const folderWithID = parts.find(p => /^[SsA-Za-z]+\d+_.+/.test(p));
                            if (folderWithID) {
                                const nameParts = folderWithID.split('_')[1]?.split(/(?=[A-Z])/);
                                if (nameParts && nameParts.length > 0) {
                                    studentName = nameParts[nameParts.length - 1]; // "Khanh"
                                }
                            }
                        }

                        return await this.textAnalysisEngine.evaluateAsync({
                            studentAnswer: studentAnswer,
                            referenceAnswer: rule.referenceAnswer!,
                            criterionDescription: rule.description,
                            maxPoints: rule.weight,
                            context: {
                                partLabel: rule.contextHint,
                                instruction: `IMPORTANT: Please refer to the student as "${studentName} đã nêu rõ" instead of "Sinh viên đã nêu rõ". Be strict but fair.`
                            }
                        });
                    })();

                    // --- 2. AICodeReview Execution (If Hybrid) ---
                    const codePromise = (async () => {
                        if (isHybrid && context.sourceSnapshot) {
                            return await this.aiCodeReview.evaluateAsync(
                                context.sourceSnapshot,
                                `STRICT INSTRUCTION: This is a hybrid Text + Code rule. The student was asked to design or explain an architecture/feature in text, AND implement it in code. Verify that the underlying code implementation matches the requirement. YOU MUST EXTRACT AT LEAST ONE CODE SNIPPET (via relevantSnippets array) AS EVIDENCE TO PROVE YOUR CONCLUSION. \n\nRequirement: ${rule.description}`,
                                rule.title,
                                context.crashLogs,
                                context.runtimeTestSummary
                            );
                        }
                        return null;
                    })();

                    // --- Execute Parallel ---
                    const [textResult, codeResult] = await Promise.all([
                        textPromise,
                        codePromise
                    ]);

                    if (isHybrid && !textResult && !codeResult) {
                        return this.fail(rule, "Không tìm thấy tài liệu lý thuyết và mã nguồn của sinh viên.");
                    }
                    if (!isHybrid && !textResult) {
                        return this.fail(rule, "Không tìm thấy tài liệu báo cáo (Word/PDF/MD) của sinh viên trong bài nộp.");
                    }

                    let finalScore = 0;
                    let finalPassed = false;
                    let finalReason = "";
                    const evidencePayload: any = {};

                    if (isHybrid) {
                        // 50% Text, 50% Code
                        let textPct = 0;
                        let codePct = 0;

                        if (textResult) {
                            textPct = typeof textResult.percentage === 'number' ? textResult.percentage : 0;
                            evidencePayload.textExplanation = `Lý thuyết: Điểm ${formatScore(textPct * (rule.weight * 0.5))}/${rule.weight * 0.5}\n` + textResult.reasoning;
                            evidencePayload.studentText = textResult.studentAnswerExtracted;
                        }

                        if (codeResult) {
                            codePct = typeof codeResult.percentageComplete === 'number' ? codeResult.percentageComplete : (codeResult.passed ? 1.0 : 0.0);
                            evidencePayload.snippets = codeResult.relevantSnippets;
                            evidencePayload.codeExplanation = `Mã nguồn: Điểm ${formatScore(codePct * (rule.weight * 0.5))}/${rule.weight * 0.5}\n` + codeResult.reasoning;
                        }

                        evidencePayload.hybridBreakdown = {
                            textPct: textPct,
                            codePct: codePct
                        };

                        if (isStrictMobile) {
                            // STRICT HYBRID REQUIREMENT (PRM Mobile only):
                            // Thiếu 1 trong 2 (hoặc 1 trong 2 = 0) -> Cho 0 điểm luôn!
                            if (textPct <= 0 || codePct <= 0) {
                                finalScore = 0;
                                finalPassed = false;
                                let missingReason = "";
                                if (textPct <= 0 && codePct <= 0) {
                                    missingReason = "Không tìm thấy cả lý thuyết và mã nguồn đạt yêu cầu.";
                                } else if (textPct <= 0) {
                                    missingReason = "Thiếu phần phân tích lý thuyết / báo cáo (hoặc lý thuyết không đạt yêu cầu). Sinh viên có mã nguồn nhưng không có lý thuyết.";
                                } else {
                                    missingReason = "Thiếu mã nguồn (Code) triển khai logic (hoặc mã nguồn không đạt yêu cầu). Sinh viên có lý thuyết nhưng không có mã nguồn.";
                                }
                                finalReason = `Phân tích Hybrid (50% Lý thuyết, 50% Mã nguồn). Tổng điểm: 0/${rule.weight}.\n\n❌ Không đạt (0 điểm): ${missingReason} Theo quy định môn PRM (Mobile), tiêu chí Hybrid bắt buộc phải có đầy đủ cả hai phần; thiếu 1 trong 2 sẽ nhận 0 điểm.\n\n- Lý thuyết: ${textResult ? textResult.reasoning : 'Không có dữ liệu'}\n\n- Mã nguồn: ${codeResult ? codeResult.reasoning : 'Không có dữ liệu'}`;
                            } else {
                                const textScore = textPct * (rule.weight * 0.5);
                                const codeScore = codePct * (rule.weight * 0.5);
                                finalScore = Math.round((textScore + codeScore) * 100) / 100;
                                finalPassed = finalScore >= (rule.weight * 0.5);
                                finalReason = `Phân tích Hybrid (50% Lý thuyết, 50% Mã nguồn). Tổng điểm: ${finalScore}/${rule.weight}.\n\n- Lý thuyết: ${textResult ? textResult.reasoning : 'Không có dữ liệu'}\n\n- Mã nguồn: ${codeResult ? codeResult.reasoning : 'Không có dữ liệu'}`;
                            }
                        } else {
                            // Standard Proportional Hybrid for Web and other courses:
                            const textScore = textPct * (rule.weight * 0.5);
                            const codeScore = codePct * (rule.weight * 0.5);
                            finalScore = Math.round((textScore + codeScore) * 100) / 100;
                            finalPassed = finalScore >= (rule.weight * 0.5);
                            finalReason = `Phân tích Hybrid (50% Lý thuyết, 50% Mã nguồn). Điểm Lý thuyết: ${formatScore(textScore)}/${formatScore(rule.weight * 0.5)}, Điểm Mã nguồn: ${formatScore(codeScore)}/${formatScore(rule.weight * 0.5)}. Tổng điểm: ${formatScore(finalScore)}/${rule.weight}.\n\n- Lý thuyết: ${textResult ? textResult.reasoning : 'Không có dữ liệu'}\n\n- Mã nguồn: ${codeResult ? codeResult.reasoning : 'Không có dữ liệu'}`;
                        }
                    } else {
                        // 100% Text
                        if (!textResult) return this.fail(rule, "Không tìm thấy câu trả lời của sinh viên trong bài nộp.");
                        finalScore = Math.round(textResult.score * 100) / 100;
                        finalPassed = textResult.percentage >= 0.5;
                        finalReason = textResult.reasoning;
                        evidencePayload.explanation = `Key Concepts Covered: ${textResult.keyConceptsCovered.join(', ')}\nMissing: ${textResult.keyConceptsMissing.join(', ')}\n\nFeedback: ${textResult.suggestions}`;
                        evidencePayload.studentText = textResult.studentAnswerExtracted || "Đã phân tích toàn bộ tài liệu để tìm kiếm câu trả lời.";
                    }

                    return {
                        ruleId: rule.id,
                        passed: finalPassed,
                        score: finalScore,
                        reason: finalReason,
                        evidence: evidencePayload
                    };
                }

                case "SqlExecutionProbe": {
                    if (!context.submissionPath) {
                        return this.fail(rule, "Submission path not available for SqlExecutionProbe");
                    }
                    const sqlSpec = rule.requiredEvidence?.find(e => e.sqlProbe);
                    if (!sqlSpec?.sqlProbe || sqlSpec.sqlProbe.testCases.length === 0) {
                        console.log(`[RubricEvaluator] No SQL test cases defined for SqlExecutionProbe on rule '${rule.title}'. Returning 0 score instead of falling back to AICodeReview.`);
                        return {
                            ruleId: rule.id,
                            passed: false,
                            score: 0,
                            reason: `Hệ thống chưa tạo test case tự động cho câu hỏi này. (Vui lòng re-upload Answer Key để cập nhật lại bộ test case).`,
                            evidence: {}
                        };
                    }
                    const sqlResult = await this.sqlProbe.evaluateAsync(
                        context.submissionPath,
                        sqlSpec.sqlProbe,
                        context.submissionId,
                        context.onExecutionEvent
                    );
                    const sqlProportionalScore = sqlResult.totalPoints > 0
                        ? (sqlResult.earnedPoints / sqlResult.totalPoints) * rule.weight
                        : 0;
                    return {
                        ruleId: rule.id,
                        passed: sqlResult.passed,
                        score: Math.round(sqlProportionalScore * 100) / 100,
                        reason: `Passed ${sqlResult.passedCases}/${sqlResult.totalCases} SQL test cases (Setup: ${sqlResult.setupMs}ms). ` +
                            sqlResult.caseResults
                                .map(c => `${c.passed ? '✓' : '✗'} ${c.title}: ${c.diffSummary}`)
                                .join('\n'),
                        evidence: {
                            sqlTestCases: sqlResult.caseResults.map(c => ({
                                entryFile: sqlSpec.sqlProbe.studentFile,
                                executionMs: c.executionMs,
                                caseId: c.caseId,
                                title: c.title,
                                passed: c.passed,
                                diffSummary: c.diffSummary,
                                actualColumns: c.actualColumns,
                                actualRows: c.actualRows,
                                expectedColumns: c.expectedColumns,
                                expectedRows: c.expectedRows,
                                errorMessage: c.errorMessage,
                                points: c.points,
                                earnedPoints: c.earnedPoints
                            }))
                        }
                    };
                }

                case "StdInOutProbe": {
                    if (!context.submissionPath) {
                        return this.fail(rule, "Submission path not available for StdInOutProbe");
                    }
                    const spec = rule.requiredEvidence?.find(e => e.stdInOutProbe);
                    if (!spec?.stdInOutProbe || spec.stdInOutProbe.testCases.length === 0) {
                        return this.fail(rule, "No test cases defined for StdInOutProbe");
                    }
                    if (spec.stdInOutProbe.testCases.length < 3) {
                        console.warn(`[RubricEvaluator] Rule ${rule.id} has only ${spec.stdInOutProbe.testCases.length} test cases (minimum 3 recommended)`);
                    }
                    const stdResult = await this.stdInOutProbe.evaluateAsync(
                        context.submissionPath,
                        spec.stdInOutProbe,
                        rule.title,
                        context.onExecutionEvent
                    );
                    // Proportional scoring: (passed / total) * weight
                    const proportionalScore = stdResult.totalCases > 0
                        ? (stdResult.passedCases / stdResult.totalCases) * rule.weight
                        : 0;
                    return {
                        ruleId: rule.id,
                        passed: stdResult.passed,
                        score: Math.round(proportionalScore * 100) / 100,
                        reason: `Passed ${stdResult.passedCases}/${stdResult.totalCases} test cases. ` +
                            stdResult.caseResults
                                .filter(c => !c.passed)
                                .map(c => c.isHidden ? `Case ${c.caseId}: hidden test failed` : `Case ${c.caseId}: expected "${c.expected.substring(0, 50)}" got "${c.actual.substring(0, 50)}"${c.timedOut ? ' [TIMEOUT]' : ''}`)
                                .join('; '),
                        evidence: {
                            compilationPassed: stdResult.compilationPassed,
                            ioTestCases: stdResult.caseResults.map(c => ({
                                entryFile: c.entryFile,
                                executionMs: c.executionMs,
                                caseId: c.caseId,
                                isHidden: c.isHidden,
                                input: c.input,
                                expected: c.expected,
                                actual: c.actual,
                                passed: c.passed,
                                timedOut: c.timedOut,
                                compilationPassed: c.compilationPassed,
                                stderr: c.stderr
                            }))
                        }
                    };
                }

                default: {
                    console.warn(`[RubricEvaluator] Strategy '${rule.scoringStrategy}' not explicitly matched. Falling back to AICodeReview.`);
                    if (context.sourceSnapshot && context.sourceSnapshot.files.length > 0) {
                        return this.evaluateRuleAsync({ ...rule, scoringStrategy: "AICodeReview" }, context, sharedVariables);
                    }
                    return this.fail(rule, `Unknown scoring strategy: ${rule.scoringStrategy}`);
                }
            }
        } catch (error: any) {
            console.error(`[RubricEvaluator] System/Infrastructure error evaluating rule ${rule.id}:`, error);
            throw error;
        }
    }

    private fail(rule: RubricRule, reason: string): RuleScore {
        return { ruleId: rule.id, passed: false, score: 0, reason };
    }

    private extractTagHints(title: string, category: string): string[] {
        const keywords = title.toLowerCase().split(/[\s\W]+/);
        keywords.push(category.toLowerCase());

        // Common mappings for architectural concepts
        const lower = title.toLowerCase();
        if (lower.includes("dependency")) keywords.push("di", "dependency-injection");
        if (lower.includes("repository")) keywords.push("repository", "data-access");
        if (lower.includes("controller")) keywords.push("controller", "api");
        if (lower.includes("interface")) keywords.push("interface", "abstraction");
        if (lower.includes("dbcontext")) keywords.push("dbcontext", "ef-core");
        if (lower.includes("service")) keywords.push("service", "business-logic");
        if (lower.includes("naming")) keywords.push("naming-convention", "csharp");
        if (lower.includes("method") && lower.includes("length")) keywords.push("method-length", "code-quality");
        if (lower.includes("layered") || lower.includes("separation")) keywords.push("mvc", "architecture");
        if (lower.includes("mvc") || lower.includes("model-view")) keywords.push("controller", "architecture");
        if (lower.includes("async")) keywords.push("async", "ef-core");

        return keywords.filter(k => k.length > 2);
    }
}
