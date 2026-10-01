/**
 * What project types each subject is allowed to produce.
 *
 * projectType decides how a submission is graded - SqlExecutionProbe runs SQL against a real
 * database, StdInOutProbe judges stdin/stdout like a programming contest, AICodeReview and
 * AIVision read source and screenshots. Getting it wrong does not mislabel an assignment, it
 * marks it the wrong way.
 *
 * Reading it off the subject is the only deterministic signal available: the lecturer picks the
 * subject code on the upload form, and DBI202 is a SQL course whatever words appear in the
 * prompt. Keyword scoring stays as the fallback for a subject nobody has mapped yet.
 *
 * `allowed` is a set rather than one value on purpose, and mirrors the SubjectProjectType
 * junction table in the schema: a PRJ301 assignment may be pure backend or fullstack depending
 * on whether it asks for UI, and the AI is better placed to tell those apart than a keyword is.
 * `fallback` only applies when the AI picks something the subject cannot plausibly produce.
 */

export interface SubjectProjectTypePolicy {
    /** Types the AI may legitimately choose for this subject; its choice is kept. */
    allowed: string[];
    /** Used when the AI chooses a type outside `allowed`. */
    fallback: string;
}

export const SUBJECT_PROJECT_TYPES: Record<string, SubjectProjectTypePolicy> = {
    // SQL is the deliverable
    DBI202: { allowed: ['database'], fallback: 'database' },

    // Console programs judged on input/output
    PRF192: { allowed: ['algorithm'], fallback: 'algorithm' },
    PRO192: { allowed: ['algorithm', 'desktop'], fallback: 'algorithm' },
    CSD201: { allowed: ['algorithm'], fallback: 'algorithm' },

    // Web: backend when it is servlets and APIs, fullstack once UI is graded too
    PRJ301: { allowed: ['backend', 'fullstack'], fallback: 'backend' },
    // .NET / C# applications (Desktop for PRN211/PRN212, Backend/Web for PRN221/PRN231)
    PRN211: { allowed: ['desktop', 'backend', 'fullstack'], fallback: 'desktop' },
    PRN212: { allowed: ['desktop', 'backend', 'fullstack'], fallback: 'desktop' },
    PRN221: { allowed: ['backend', 'fullstack', 'desktop'], fallback: 'backend' },
    PRN231: { allowed: ['backend', 'fullstack', 'desktop'], fallback: 'backend' },

    // Android
    PRM392: { allowed: ['mobile', 'backend'], fallback: 'mobile' },
    PRM393: { allowed: ['mobile', 'backend'], fallback: 'mobile' },

    // Team projects can be any shape
    SWP391: { allowed: ['fullstack', 'backend', 'frontend', 'mobile'], fallback: 'fullstack' },
    SWD392: { allowed: ['backend', 'fullstack'], fallback: 'backend' }
};

/**
 * Pull the subject code out of whatever the caller has: "DBI202", "dbi202",
 * "DBI202-SE1701", " DBI202 ". A UUID or an unknown code returns null, which leaves the
 * decision to keyword scoring exactly as before.
 */
export function normaliseSubjectCode(subject: string | null | undefined): string | null {
    if (!subject) return null;
    const match = String(subject).trim().toUpperCase().match(/^[A-Z]{2,4}\d{3}/);
    return match ? match[0] : null;
}

export function getSubjectPolicy(subject: string | null | undefined): SubjectProjectTypePolicy | null {
    const code = normaliseSubjectCode(subject);
    return code ? SUBJECT_PROJECT_TYPES[code] ?? null : null;
}
