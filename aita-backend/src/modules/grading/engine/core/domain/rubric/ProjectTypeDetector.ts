import { getSubjectPolicy, normaliseSubjectCode } from './SubjectProjectTypes.js';

/**
 * Keyword evidence for the project types that can be recognised from prompt text.
 *
 * The AI classifies a prompt on its own; this is the safety net for when it misreads one.
 * The net used to count algorithm keywords only and rewrite anything that was not already
 * "algorithm", which meant a DBI202 prompt asking students to analyse "Time Complexity" and
 * "Space Complexity" scored two signals and was graded as an algorithm through a stdin/stdout
 * judge - while the SQL vocabulary filling the same prompt counted for nothing.
 *
 * Each detectable type brings its own signals and a rewrite needs a clear win, so adding a
 * type means adding a row here rather than another special case at the call site.
 */
export const PROJECT_TYPE_SIGNALS: Record<string, RegExp[]> = {
    algorithm: [
        // I/O patterns
        /\bstdin\b/, /\bstdout\b/, /\bstandard input\b/, /\bstandard output\b/,
        /\bread.*input\b/, /\bprint.*output\b/, /\bconsole.*input\b/,
        // Classic algorithm names
        /\btwo sum\b/, /\bthree sum\b/, /\bfibonacci\b/, /\bprime\b/,
        /\bpalindrome\b/, /\banagram\b/, /\bsubstring\b/, /\bsubarray\b/,
        /\bknapsack\b/, /\blongest common\b/, /\bshortest path\b/,
        // Data structures & techniques
        /\blinked list\b/, /\bbinary tree\b/, /\bgraph\b/, /\bheap\b/, /\bstack\b/, /\bqueue\b/,
        /\bsort(ing)?\b/, /\bbinary search\b/, /\bbfs\b/, /\bdfs\b/,
        /\bdynamic programming\b/, /\bhash\s*map\b/, /\bhash\s*table\b/,
        /\bgreedy\b/, /\brecursion\b/, /\bbacktracking\b/, /\bdivide and conquer\b/,
        // Complexity analysis
        /\bo\(n\)/, /\bo\(n\^2\)/, /\bo\(log\s*n\)/, /\bo\(n\s*log\s*n\)/,
        /\btime complexity\b/, /\bspace complexity\b/,
        // Vietnamese patterns
        /đọc input/, /in ra màn hình/, /nhập.*từ bàn phím/, /xuất.*kết quả/
    ],
    // Only signals that mean "writing SQL is the deliverable". Using a database is not the
    // same thing: a Java web app or an Android app with Room hits "cơ sở dữ liệu", "primary
    // key", "transaction" and even "index" (from index.jsp) without being a SQL exercise, and
    // counting those relabelled PRJ301 and PRM392 assignments as database work.
    database: [
        // Query language written by the student
        /\bsql\b/, /\bselect\b[\s\S]{0,80}\bfrom\b/, /\binner join\b/, /\bleft join\b/,
        /\bouter join\b/, /\bgroup by\b/, /\bhaving\b/, /\bsubquer(y|ies)\b/, /\bctes?\b/,
        /\bddl\b/, /\bdml\b/,
        // Database objects authored as the answer
        /\bstored procedure/, /\bcreate trigger\b/, /\bcreate index\b/, /\bindexing\b/,
        /\bnormaliz/, /\berd\b/, /\bdeadlock\b/, /\bacid\b/, /\bquery optimi[sz]/,
        // Engines and dialects
        /\bsql server\b/, /\bmysql\b/, /\bpostgres(ql)?\b/, /\bt-sql\b/, /\bpl\/sql\b/,
        // Vietnamese patterns
        /câu lệnh sql/, /truy vấn sql/, /chuẩn hoá/, /chuẩn hóa/, /lược đồ quan hệ/,
        /lược đồ cơ sở dữ liệu/, /thủ tục lưu trữ/
    ]
};

/** Signals needed before the detector will contradict a type that has signals of its own. */
export const MIN_SIGNALS = 2;
/**
 * Bar for contradicting a type with no signal list - backend, frontend, fullstack, mobile,
 * desktop, unity. Those score 0 by definition, so a low bar would let any two stray keywords
 * relabel them. The AI read the whole prompt; overruling it needs more than a passing mention.
 */
export const MIN_SIGNALS_VS_UNSCORED = 3;
/** How far ahead the challenger must be. A prompt covering both subjects keeps the AI's call. */
export const MIN_LEAD = 2;

export interface ProjectTypeDecision {
    /** The type to use: either the AI's, or the challenger when it clearly wins. */
    projectType: string;
    changed: boolean;
    /** Human-readable tally, for the log line at the call site. */
    reason: string;
}

/**
 * Decide the project type from the AI's classification and the prompt text.
 *
 * A type with no signal list (backend, frontend, mobile, unity, desktop, fullstack) scores 0,
 * so a well-evidenced algorithm or database prompt still overrides it - the case this fallback
 * was written for.
 */
export function detectProjectType(aiProjectType: string, prompt: string, subject?: string | null): ProjectTypeDecision {
    // The subject is the one deterministic fact here: the lecturer picked it on the form, and
    // DBI202 is a SQL course no matter which words the prompt happens to contain. Where a
    // subject is mapped, its policy settles the question and the keyword table is not consulted.
    const policy = getSubjectPolicy(subject);
    if (policy) {
        const code = normaliseSubjectCode(subject);
        if (policy.allowed.includes(aiProjectType)) {
            return {
                projectType: aiProjectType,
                changed: false,
                reason: `subject ${code} allows "${aiProjectType}"`
            };
        }
        return {
            projectType: policy.fallback,
            changed: true,
            reason: `subject ${code} cannot produce "${aiProjectType}" (allowed: ${policy.allowed.join('/')}), using "${policy.fallback}"`
        };
    }

    const lowerPrompt = (prompt || '').toLowerCase();

    const scores = Object.entries(PROJECT_TYPE_SIGNALS).map(([type, signals]) => ({
        type,
        score: signals.filter(rx => rx.test(lowerPrompt)).length
    }));

    const best = scores.reduce((a, b) => (b.score > a.score ? b : a));
    const aiTypeHasSignals = Object.prototype.hasOwnProperty.call(PROJECT_TYPE_SIGNALS, aiProjectType);
    const currentScore = scores.find(s => s.type === aiProjectType)?.score ?? 0;
    const tally = scores.map(s => `${s.type}=${s.score}`).join(', ');

    if (best.type === aiProjectType) {
        return { projectType: aiProjectType, changed: false, reason: `AI classification agrees with the text (${tally})` };
    }

    const required = aiTypeHasSignals ? MIN_SIGNALS : MIN_SIGNALS_VS_UNSCORED;

    if (best.score >= required && best.score - currentScore >= MIN_LEAD) {
        return {
            projectType: best.type,
            changed: true,
            reason: `"${best.type}" outscored "${aiProjectType}" by ${best.score - currentScore} (${tally})`
        };
    }

    return {
        projectType: aiProjectType,
        changed: false,
        reason: `kept "${aiProjectType}"; no clear winner (${tally})`
    };
}
