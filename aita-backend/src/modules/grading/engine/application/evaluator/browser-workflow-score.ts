/** Score only explicitly linked workflows; never borrow results from another criterion. */
export function scoreBrowserWorkflows(testIds: string[], evidencePool: any[], weight: number) {
  const ids = [...new Set(testIds)]
  const workflows = evidencePool.filter(evidence => evidence.type === 'browser.workflow.completed')
  const missing = ids.filter(id => !workflows.some(evidence => evidence.payload?.testId === id))
  const interrupted = workflows.some(evidence => ids.includes(evidence.payload?.testId) && evidence.payload?.executionError === true)
  const passed = ids.filter(id => {
    const results = workflows.filter(evidence => evidence.payload?.testId === id)
    return results.length > 0 && results.every(evidence => evidence.payload?.success === true)
  }).length
  return {
    passed: ids.length > 0 && passed === ids.length,
    score: ids.length ? Number((weight * passed / ids.length).toFixed(2)) : 0,
    needsReview: missing.length > 0 || interrupted,
    reason: interrupted ? 'Trình duyệt kiểm thử bị đóng hoặc gián đoạn; cần chạy lại, không kết luận lỗi bài nộp.' : missing.length ? `Chưa thực thi đủ kiểm thử giao diện: ${missing.join(', ')}.` : `${passed}/${ids.length} kiểm thử giao diện đạt; tính điểm theo tiêu chí đã liên kết.`,
    evidence: { browserWorkflows: workflows.filter(evidence => ids.includes(evidence.payload?.testId)) },
  }
}
