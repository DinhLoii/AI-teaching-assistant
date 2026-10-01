/**
 * Centralized assignment HTML sanitizer & style normalizer.
 * Ensures:
 * 1. Full-width container layout across all assignment types.
 * 2. Removes all global-polluting <style>, <link>, <script>, <html>, <head>, <body> tags.
 * 3. Keeps clean, high-contrast text and tables.
 */
export function cleanAssignmentHtml(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';

  let cleaned = rawHtml;

  // 1. Strip markdown code fences if AI accidentally wrapped it
  cleaned = cleaned.replace(/^```html\s*/gi, '').replace(/^```\s*/g, '').replace(/```$/g, '').trim();

  // 2. Strip embedded <style>...</style> blocks that pollute global page rules
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');

  // 3. Strip <script>, <link>, <meta>, <title>, <!DOCTYPE> and document tags
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<head[\s\S]*?<\/head>/gi, '');
  cleaned = cleaned.replace(/<link[\s\S]*?>/gi, '');
  cleaned = cleaned.replace(/<meta[\s\S]*?>/gi, '');
  cleaned = cleaned.replace(/<title[\s\S]*?<\/title>/gi, '');
  cleaned = cleaned.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  cleaned = cleaned.replace(/<\/?(?:html|head|body|meta|title)[^>]*>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 4. Process inline styles on tags to fix text colors, widths, zooms, paper sizing
  cleaned = cleaned.replace(/\s*style\s*=\s*(["'])([\s\S]*?)\1/gi, (_, __, styleContent: string) => {
    let s = styleContent;

    s = s.replace(/(?:max-width|min-width)\s*:\s*[^;"]+;?/gi, 'max-width: 100%;');
    s = s.replace(/\bwidth\s*:\s*(?:[0-9]+(?:\.[0-9]+)?(?:px|rem|em|mm|cm|in|pt|vw|%)|[0-9]+);?/gi, 'width: 100%;');
    s = s.replace(/\bheight\s*:\s*(?:297mm|100vh|[0-9]+(?:mm|cm|in|pt));?/gi, '');
    s = s.replace(/(?:margin|margin-left|margin-right)\s*:\s*(?:0\s+auto|auto|center);?/gi, '');
    s = s.replace(/zoom\s*:\s*[^;"]+;?/gi, '');
    s = s.replace(/(?:-webkit-)?transform\s*:\s*scale\([^)]+\);?/gi, '');
    s = s.replace(/word-break\s*:\s*break-all;?/gi, '');
    s = s.replace(/white-space\s*:\s*nowrap;?/gi, '');

    return s.trim() ? ` style="${s.trim()}"` : '';
  });

  // 5. Ensure all tables have 100% width and clean border collapse
  cleaned = cleaned.replace(/<table([^>]*)>/gi, (match, p1) => {
    if (/style=/i.test(p1)) {
      return match.replace(/style=(["'])([\s\S]*?)\1/i, 'style="width: 100% !important; border-collapse: collapse; $2"');
    }
    return `<table style="width: 100% !important; border-collapse: collapse;"${p1}>`;
  });

  return cleaned.trim();
}
