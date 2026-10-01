import * as pdfjsLib from 'pdfjs-dist'

// Set worker source to unpkg / jsDelivr CDN to guarantee application/javascript MIME type across all environments
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`

export async function renderPdfToImages(file: File, scale = 0.9, maxPages = 30): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // Support multi-page PDFs (up to maxPages, default 30) for full document AI analysis
  const numPages = Math.min(pdf.numPages, maxPages)
  const pageImages: string[] = []

  // Optimize scale and compression dynamically to keep memory footprint light for 10+ page PDFs
  const effectiveScale = numPages > 15 ? Math.min(scale, 0.75) : (numPages > 5 ? Math.min(scale, 0.8) : scale)
  const jpegQuality = numPages > 15 ? 0.55 : (numPages > 5 ? 0.60 : 0.65)

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: effectiveScale })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not get 2d context')

    canvas.width = viewport.width
    canvas.height = viewport.height

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas as any,
    }

    await page.render(renderContext as any).promise

    // Convert to optimized JPEG base64
    const base64Img = canvas.toDataURL('image/jpeg', jpegQuality)
    pageImages.push(base64Img)
  }

  return pageImages
}

export async function processCropImagesInHtml(html: string, pageImages: string[]): Promise<string> {
  const cropRegex = /src="crop:\/\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)"/g

  let match: RegExpExecArray | null
  let finalHtml = html

  const replacements: { old: string; new: string }[] = []

  while ((match = cropRegex.exec(html)) !== null) {
    const fullMatch = match[0]
    const pageIdx = parseInt(match[1], 10)
    const ymin = parseInt(match[2], 10)
    const xmin = parseInt(match[3], 10)
    const ymax = parseInt(match[4], 10)
    const xmax = parseInt(match[5], 10)

    if (pageImages[pageIdx]) {
      const base64Src = pageImages[pageIdx]

      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = base64Src
      })

      const sx = (xmin / 1000) * img.width
      const sy = (ymin / 1000) * img.height
      const sw = ((xmax - xmin) / 1000) * img.width
      const sh = ((ymax - ymin) / 1000) * img.height

      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9)
        replacements.push({ old: fullMatch, new: `src="${croppedBase64}"` })
      }
    }
  }

  for (const r of replacements) {
    finalHtml = finalHtml.replace(r.old, r.new)
  }

  return finalHtml
}
