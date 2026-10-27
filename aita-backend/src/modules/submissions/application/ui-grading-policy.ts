import { examConfiguration } from './submission-language.js'

/** UI runs need the lecturer present to observe the native browser. */
export function requiresManualUiStart(exam: any): boolean {
  const config = examConfiguration(exam)
  const type = String(config.projectType || config.metadata?.projectType || exam?.metadata?.projectType || exam?.SubmissionFormat || exam?.projectType || '').toLowerCase()
  const subject = String(exam?.Subject?.SubjectCode || exam?.subjectCode || exam?.metadata?.subjectCode || config.subjectCode || config.metadata?.subjectCode || '').toUpperCase()
  const rules = config.rubric?.rules || config.rubric || exam?.rubric?.rules || exam?.rubric || []
  return /^FER\d{3}/.test(subject) || ['frontend', 'react', 'angular', 'vue', 'fullstack', 'web'].includes(type)
    || (Array.isArray(rules) && rules.some((rule: any) => /aivision|browser/i.test(String(rule.scoringStrategy || rule.evaluationMethod || ''))))
}
