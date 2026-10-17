'use client'

import * as React from 'react'
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
  Copy,
  CheckCheck,
  AlertCircle,
  XCircle,
  AlertTriangle,
  GitBranch,
  Terminal,
  Maximize2,
  Minimize2,
  Code2
} from 'lucide-react'

export interface CodeErrorAnnotation {
  line: number
  title?: string
  message: string
  severity?: 'error' | 'warning'
  deduction?: string
}

export interface VirtualFile {
  id: string
  path: string
  name: string
  language: string
  content: string
  errorAnnotations?: CodeErrorAnnotation[]
}

interface VsCodeExplorerViewerProps {
  initialFiles?: VirtualFile[]
  activeFileName?: string
  archiveName?: string
  sourceCode?: string
  filename?: string
  height?: string
  readOnly?: boolean
  className?: string
}

// Sample realistic project files with explicit AI error markers
interface TreeNode {
  name: string
  path: string
  isFolder: boolean
  children?: TreeNode[]
  file?: VirtualFile
}

function buildTree(files: VirtualFile[]): TreeNode {
  const root: TreeNode = {
    name: 'root',
    path: '',
    isFolder: true,
    children: []
  }

  files.forEach(file => {
    const parts = file.path.split('/')
    let current = root

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1
      const currentPath = parts.slice(0, index + 1).join('/')

      if (!current.children) {
        current.children = []
      }

      let child = current.children.find(c => c.name === part)
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          isFolder: !isFile,
          children: isFile ? undefined : [],
          file: isFile ? file : undefined
        }
        current.children.push(child)
      }
      current = child
    })
  })

  // Sort folders first, then files
  const sortChildren = (node: TreeNode) => {
    if (!node.children) return
    node.children.sort((a, b) => {
      if (a.isFolder === b.isFolder) {
        return a.name.localeCompare(b.name)
      }
      return a.isFolder ? -1 : 1
    })
    node.children.forEach(sortChildren)
  }
  sortChildren(root)

  return root
}

export function VsCodeExplorerViewer({
  initialFiles,
  activeFileName = '',
  archiveName = 'ZIP bài nộp',
  sourceCode,
  filename,
  height = 'h-[560px]',
  className = ''
}: VsCodeExplorerViewerProps) {
  const files = React.useMemo(() => {
    if (initialFiles && initialFiles.length > 0) return initialFiles
    if (sourceCode) {
      const targetName = filename && !filename.endsWith('.zip') && !filename.endsWith('.tar.gz') && !filename.endsWith('.rar')
        ? filename
        : 'source.txt'
      const ext = targetName.split('.').pop()?.toLowerCase() || 'text'
      const langMap: Record<string, string> = {
        cpp: 'cpp', c: 'c', h: 'cpp', hpp: 'cpp', java: 'java', py: 'python',
        cs: 'csharp', kt: 'kotlin', kts: 'kotlin', js: 'javascript', ts: 'typescript', sql: 'sql'
      }
      return [
        {
          id: 'submitted-code',
          path: targetName,
          name: targetName,
          language: langMap[ext] || 'text',
          content: sourceCode,
          errorAnnotations: []
        }
      ]
    }
    return []
  }, [initialFiles, sourceCode, filename])

  const initialSelected = React.useMemo(() => {
    return files.find(f => f.name === activeFileName) ||
      files.find(f => (f.errorAnnotations?.length || 0) > 0) ||
      files[0]
  }, [files, activeFileName])

  const [selectedFile, setSelectedFile] = React.useState<VirtualFile>(initialSelected)

  React.useEffect(() => {
    setSelectedFile(initialSelected)
  }, [initialSelected])
  const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({
    'src': true,
    'src/main': true,
    'src/main/java': true,
    'src/main/java/com': true,
    'src/main/java/com/example': true,
    'src/main/java/com/example/todo': true,
    'src/main/java/com/example/todo/data': true,
    'src/main/java/com/example/todo/viewmodel': true,
    'src/main/java/com/example/todo/ui': true,
  })
  const [copied, setCopied] = React.useState(false)
  const [showExplorer, setShowExplorer] = React.useState(true)

  const tree = React.useMemo(() => buildTree(files), [files])

  // Count total errors
  const totalErrors = React.useMemo(() => {
    return files.reduce((acc, f) => acc + (f.errorAnnotations?.length || 0), 0)
  }, [files])

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }))
  }

  const handleCopy = () => {
    if (!selectedFile) return
    navigator.clipboard.writeText(selectedFile.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.kt')) return <span className="text-purple-400 font-bold text-[11px]">K</span>
    if (fileName.endsWith('.java')) return <span className="text-orange-400 font-bold text-[11px]">J</span>
    if (fileName.endsWith('.xml')) return <span className="text-amber-400 font-bold text-[11px]">&lt;&gt;</span>
    if (fileName.endsWith('.kts') || fileName.endsWith('.gradle')) return <span className="text-teal-400 font-bold text-[11px]">🐘</span>
    return <FileCode className="w-3.5 h-3.5 text-blue-400" />
  }

  // Recursive Tree Node Renderer
  const renderTree = (node: TreeNode, depth: number = 0) => {
    if (node.isFolder) {
      const isExpanded = expandedFolders[node.path] ?? true
      const hasChildErrors = files.some(
        f => f.path.startsWith(node.path + '/') && (f.errorAnnotations?.length || 0) > 0
      )

      return (
        <div key={node.path || node.name} className="select-none">
          {node.name !== 'root' && (
            <div
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft: `${depth * 12 + 6}px` }}
              className="flex items-center gap-1.5 py-1 pr-2 hover:bg-[#2a2d2e] cursor-pointer text-slate-400 hover:text-slate-200 transition-colors text-xs font-mono group"
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
                )}
              </span>
              <span className="shrink-0 text-amber-300">
                {isExpanded ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
              </span>
              <span className="truncate flex-1 font-sans text-xs">{node.name}</span>
              {hasChildErrors && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Chứa file có lỗi" />
              )}
            </div>
          )}

          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderTree(child, node.name === 'root' ? depth : depth + 1))}
            </div>
          )}
        </div>
      )
    }

    // File Node
    const isSelected = selectedFile?.id === node.file?.id
    const errorCount = node.file?.errorAnnotations?.length || 0

    return (
      <div
        key={node.path}
        onClick={() => node.file && setSelectedFile(node.file)}
        style={{ paddingLeft: `${depth * 12 + 10}px` }}
        className={`flex items-center gap-1.5 py-1 pr-2 cursor-pointer transition-colors text-xs font-mono group ${
          isSelected
            ? 'bg-[#37373d] text-white font-medium'
            : 'text-slate-300 hover:bg-[#2a2d2e] hover:text-white'
        }`}
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {getFileIcon(node.name)}
        </span>
        <span className={`truncate flex-1 font-sans ${errorCount > 0 ? 'text-rose-300' : ''}`}>
          {node.name}
        </span>
        {errorCount > 0 && (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            {errorCount}
          </span>
        )}
      </div>
    )
  }

  // Parse code lines & identify errors
  const codeLines = selectedFile ? selectedFile.content.split('\n') : []
  const errorMap = React.useMemo(() => {
    const map = new Map<number, CodeErrorAnnotation>()
    selectedFile?.errorAnnotations?.forEach(err => {
      map.set(err.line, err)
    })
    return map
  }, [selectedFile])

  if (!selectedFile) return <div className="p-8 text-sm text-slate-500">Chưa có mã nguồn được cung cấp.</div>

  return (
    <div className={`rounded-lg overflow-hidden border border-slate-800 bg-[#1e1e1e] text-slate-200 shadow-md font-sans text-xs ${className}`}>
      
      {/* ── VS CODE WINDOW TOP BAR ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#181818] border-b border-slate-800 select-none">
        {/* Window dots */}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block" />
          <span className="ml-2 text-slate-400 text-[11px] font-mono hidden sm:inline">
            {archiveName} — Visual Studio Code (Source Viewer)
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExplorer(!showExplorer)}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
            title="Đóng / mở cây thư mục"
          >
            <Code2 className="w-3 h-3" />
            <span>{showExplorer ? 'Ẩn Explorer' : 'Hiện Explorer'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
            title="Sao chép code"
          >
            {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Đã sao chép' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: EXPLORER (LEFT) + CODE EDITOR (RIGHT) ── */}
      <div className={`flex flex-col sm:flex-row ${height} overflow-hidden`}>
        
        {/* Left Pane: VS Code Explorer */}
        {showExplorer && (
          <div className="w-full h-36 sm:h-auto sm:w-60 shrink-0 bg-[#252526] border-r border-slate-800 flex flex-col overflow-hidden">
            {/* Explorer Title */}
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 flex items-center justify-between select-none">
              <span>EXPLORER</span>
              <span className="text-[10px] font-mono text-slate-500">PROJECT</span>
            </div>

            {/* Tree View Scrollable */}
            <div className="flex-1 overflow-y-auto py-1">
              {renderTree(tree)}
            </div>

            {/* AI Problems Summary in Explorer footer */}
            <div className="p-2 border-t border-slate-800 bg-[#1e1e1e] text-[11px] select-none">
              <div className="flex items-center justify-between text-slate-400 font-semibold mb-1">
                <span>CHÚ THÍCH ĐÁNH GIÁ</span>
                <span className="font-mono text-rose-400">{totalErrors} chú thích</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                Các dòng code tô đỏ là vị trí AI trừ điểm. Nhấp vào file để xem chi tiết.
              </div>
            </div>
          </div>
        )}

        {/* Right Pane: Code Editor Area */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-[#1e1e1e]">
          
          {/* Editor Tab Bar */}
          <div className="flex items-center bg-[#181818] border-b border-slate-800 overflow-x-auto select-none">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border-t-2 border-[#007acc] text-white text-xs font-mono shrink-0">
              {getFileIcon(selectedFile.name)}
              <span className="font-sans">{selectedFile.name}</span>
              {(selectedFile.errorAnnotations?.length || 0) > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              )}
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="px-3 py-1 bg-[#1e1e1e] border-b border-slate-800/60 text-[11px] text-slate-400 font-mono flex items-center gap-1.5 select-none overflow-x-auto">
            {selectedFile.path.split('/').map((part, pIdx, arr) => (
              <React.Fragment key={pIdx}>
                <span className={pIdx === arr.length - 1 ? 'text-slate-200 font-semibold' : ''}>
                  {part}
                </span>
                {pIdx < arr.length - 1 && <span className="text-slate-600">/</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Code Viewer Viewport */}
          <div className="flex-1 overflow-auto font-mono text-[12px] leading-relaxed p-0 select-text">
            <div className="py-2">
              {codeLines.map((lineContent, lineIdx) => {
                const lineNum = lineIdx + 1
                const error = errorMap.get(lineNum)
                const isErrorLine = Boolean(error)

                return (
                  <React.Fragment key={lineNum}>
                    {/* Code Line */}
                    <div
                      className={`flex items-start transition-colors ${
                        isErrorLine
                          ? 'bg-rose-950/70 border-l-4 border-rose-500'
                          : 'hover:bg-[#2a2d2e]/50 border-l-4 border-transparent'
                      }`}
                    >
                      {/* Line Number Gutter */}
                      <span
                        className={`w-12 shrink-0 text-right pr-4 select-none font-mono text-[11px] ${
                          isErrorLine
                            ? 'text-rose-400 font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        {lineNum}
                      </span>

                      {/* Line Content */}
                      <span
                        className={`flex-1 pr-4 whitespace-pre font-mono ${
                          isErrorLine
                            ? 'text-rose-100 font-semibold underline decoration-wavy decoration-rose-500'
                            : 'text-slate-200'
                        }`}
                      >
                        {lineContent || ' '}
                      </span>
                    </div>

                    {/* Inline AI Error Annotation Box (Like VS Code Inline Diagnostic) */}
                    {error && (
                      <div className="my-1.5 mx-4 ml-12 p-3 rounded bg-rose-950/95 border border-rose-600/80 text-rose-100 text-xs shadow-lg space-y-1 select-none animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{error.title || 'Lỗi phát hiện bởi AI'}</span>
                          {error.deduction && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-600 text-white">
                              {error.deduction}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-rose-200 leading-relaxed font-sans pl-6">
                          {error.message}
                        </p>
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* ── VS CODE BOTTOM STATUS BAR ── */}
          <div className="flex items-center justify-between px-3 py-1 bg-[#007acc] text-white text-[11px] font-mono select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <FileCode className="w-3 h-3" />
                <span>ZIP source</span>
              </span>
              <span className="flex items-center gap-1 font-bold">
                <XCircle className="w-3 h-3" />
                <span>{selectedFile.errorAnnotations?.length || 0}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span>Lines: {codeLines.length}</span>
              <span>UTF-8</span>
              <span className="uppercase">{selectedFile.language}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
