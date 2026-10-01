'use client'

import React, { useState } from 'react'
import { UploadCloud, FileType, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  accept?: string
  errorMessage?: string
  isUploading?: boolean
}

const DEFAULT_ACCEPT = '.zip,.pdf,.docx,.doc,.sql,.txt'

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function FileUpload({
  onUpload,
  accept = DEFAULT_ACCEPT,
  errorMessage = 'Vui lòng chọn tập tin hợp lệ',
  isUploading = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase())

      if (acceptedTypes.some((type) => fileExtension === type || type === '*/*')) {
        setSelectedFile(file)
      } else {
        alert(errorMessage)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) return
    try {
      await onUpload(selectedFile)
    } catch {
      // error handled in caller
    }
  }

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragActive
            ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept={accept}
          onChange={handleChange}
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 text-orange-500">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Kéo thả tập tin đề bài vào đây, hoặc{' '}
              <label
                htmlFor="file-upload"
                className="text-orange-600 hover:text-orange-700 dark:text-orange-400 font-semibold cursor-pointer underline underline-offset-2"
              >
                chọn từ máy tính
              </label>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hỗ trợ định dạng: {accept} (tối đa 50MB)
            </p>
          </div>

          {selectedFile && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-md w-full text-left">
              <FileType className="w-8 h-8 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-rose-600"
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
              >
                Hủy
              </Button>
            </div>
          )}

          {selectedFile && (
            <div className="pt-2">
              <Button
                type="button"
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                onClick={handleSubmit}
                isLoading={isUploading}
              >
                Trích xuất & Tạo đề bài AI
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
