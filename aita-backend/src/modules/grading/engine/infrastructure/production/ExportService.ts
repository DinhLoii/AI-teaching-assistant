// @ts-nocheck
import { AssessmentReport } from '../../core/domain/review/AssessmentReport';
import { PdfReportGenerator } from './PdfReportGenerator';

export class ExportService {
    constructor(private readonly pdfGenerator: PdfReportGenerator) {}

    public async exportReportAsync(report: AssessmentReport, format: 'json' | 'pdf' | 'csv'): Promise<string | Buffer> {
        switch (format) {
            case 'json':
                return JSON.stringify(report, null, 2);
            case 'csv':
                return this.generateCsv(report);
            case 'pdf':
                return await this.pdfGenerator.generatePdfAsync(report);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    private generateCsv(report: AssessmentReport): string {
        let csv = 'RuleId,Title,Passed,Score\n';
        report.passedRules.forEach((r: any) => csv += `${r.ruleId},${r.title},true,${r.earnedScore}\n`);
        report.failedRules.forEach((r: any) => csv += `${r.ruleId},${r.title},false,0\n`);
        return csv;
    }
}

