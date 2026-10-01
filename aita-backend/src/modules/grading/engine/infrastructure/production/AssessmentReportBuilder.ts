// @ts-nocheck
import { AssessmentReport } from '../../core/domain/review/AssessmentReport';

export class AssessmentReportBuilder {
    private report: Partial<AssessmentReport> = {
        passedRules: [],
        failedRules: [],
        manualReviewNotes: []
    };

    public withSubmissionData(submissionId: string, assignmentId: string, studentId: string): this {
        this.report.submissionId = submissionId;
        this.report.assignmentId = assignmentId;
        this.report.studentId = studentId;
        return this;
    }

    public addPassedRule(rule: any): this {
        this.report.passedRules!.push(rule);
        return this;
    }

    public addFailedRule(rule: any): this {
        this.report.failedRules!.push(rule);
        return this;
    }

    public setTotalScore(score: number, max: number, isPass: boolean): this {
        this.report.totalScore = score;
        this.report.maxPossibleScore = max;
        this.report.isPass = isPass;
        return this;
    }

    public build(): AssessmentReport {
        if (!this.report.submissionId) throw new Error("Incomplete report");
        
        this.report.auditMetadata = {
            evaluatorVersion: '5.0.0',
            timestamp: new Date().toISOString(),
            auditLogIds: []
        };
        
        return this.report as AssessmentReport;
    }
}

