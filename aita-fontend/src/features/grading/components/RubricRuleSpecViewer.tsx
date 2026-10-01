'use client'

import React from 'react'
import { Database, Terminal, Table } from 'lucide-react'

interface Props {
  rule: any
  isStudentView?: boolean
}

export function RubricRuleSpecViewer({ rule, isStudentView = false }: Props) {
  if (!rule) return null

  const evidenceList = rule.requiredEvidence || []
  const stdProbe = evidenceList.find((e: any) => e?.stdInOutProbe)?.stdInOutProbe || rule.stdInOutProbe
  const sqlProbe = evidenceList.find((e: any) => e?.sqlProbe)?.sqlProbe || rule.sqlProbe
  const httpProbe = evidenceList.find((e: any) => e?.httpProbe)?.httpProbe || rule.httpProbe
  const referenceImage =
    evidenceList.find((e: any) => e?.referenceImageUrl || e?.mockupUrl || e?.imageUrl)?.referenceImageUrl ||
    rule.referenceImageUrl ||
    rule.mockupUrl

  const hasStdCases = !isStudentView && stdProbe?.testCases && stdProbe.testCases.length > 0
  const hasSqlCases = !isStudentView && sqlProbe?.testCases && sqlProbe.testCases.length > 0
  const hasHttpSteps = !isStudentView && httpProbe?.steps && httpProbe.steps.length > 0

  if (!hasStdCases && !hasSqlCases && !hasHttpSteps && !referenceImage) {
    return null
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* 1. Algorithm I/O Probe */}
      {hasStdCases && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            <Terminal size={14} className="text-purple-500" />
            <span>I/O Test Cases (Input / Output Samples)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {stdProbe.testCases.map((tc: any, i: number) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs font-mono grid grid-cols-2 gap-3 shadow-sm"
              >
                <div>
                  <span className="text-slate-400 font-semibold mb-1 block">Input:</span>
                  <span className="dark:text-slate-200 text-slate-800 whitespace-pre-wrap">{tc.input}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold mb-1 block">Expected Output:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold whitespace-pre-wrap">
                    {tc.expectedOutput}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. SQL Database Probe */}
      {hasSqlCases && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            <Database size={14} className="text-blue-500" />
            <span>SQL Test Specification & Đáp án mẫu</span>
          </div>
          <div className="space-y-3">
            {sqlProbe.testCases.map((tc: any, i: number) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2 text-xs shadow-sm"
              >
                {tc.query && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Reference SQL Query (Đáp án mẫu)
                    </span>
                    <pre className="p-2 bg-slate-900 text-emerald-400 font-mono text-xs rounded overflow-x-auto whitespace-pre-wrap border border-slate-800">
                      {tc.query}
                    </pre>
                  </div>
                )}
                {tc.expectedColumns && tc.expectedColumns.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <Table size={12} className="text-blue-400" />
                        Bảng kết quả kỳ vọng (Expected Output)
                      </span>
                      {tc.expectedRows && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {tc.expectedRows.length} dòng × {tc.expectedColumns.length} cột
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 max-h-48 shadow-inner">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            {tc.expectedColumns.map((col: string, cIdx: number) => (
                              <th
                                key={cIdx}
                                className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                          {tc.expectedRows && tc.expectedRows.length > 0 ? (
                            tc.expectedRows.map((row: string[], rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                                {row.map((cell: string, cellIdx: number) => (
                                  <td
                                    key={cellIdx}
                                    className="px-2.5 py-1 border-r border-slate-100 dark:border-slate-800/40 last:border-r-0"
                                  >
                                    {cell === 'NULL' || cell === null ? (
                                      <span className="italic text-slate-400">NULL</span>
                                    ) : (
                                      cell
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={tc.expectedColumns.length}
                                className="px-2 py-2 text-center text-slate-400 italic"
                              >
                                Dữ liệu kiểm thử được sinh tự động khi chấm điểm sandbox
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
