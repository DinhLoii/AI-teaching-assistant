import { dbi202Reference } from '../../ai/infrastructure/analysis/dbi202-reference.js'
import AdmZip from 'adm-zip'
import { examConfiguration } from '../../submissions/application/submission-language.js'

/** Only declared C source filenames enter the archive; no test data or solutions. */
export function starterSourceFiles(exam: any): string[] {
  const config = examConfiguration(exam)
  if (config.sqlConfig?.referenceId === 'dbi202-hotel') return Array.from({length:10},(_,i)=>'Q'+(i+1)+'.sql')
  const declared: string[] = []
  const text = String(exam?.description ?? exam?.Description ?? '')
  for (const match of text.matchAll(/file\s+to\s+be\s+edited\s*:\s*([\w.-]+\.c)\b/gi)) declared.push(match[1])
  for (const test of config.testCases || []) if (typeof test.entryFile === 'string') declared.push(test.entryFile)
  return [...new Set(declared.filter(file => /^Q[1-9]\d*\.c$/i.test(file)).map(file => 'Q' + Number(file.slice(1,-2)) + '.c'))]
    .sort((a,b) => Number(a.slice(1,-2)) - Number(b.slice(1,-2)))
}

export function buildStarterArchive(exam: any): Buffer {
  const files = starterSourceFiles(exam)
  if (!files.length) throw new Error('Đề chưa có danh sách file C theo từng câu để tạo bộ khung bài làm.')
  const zip = new AdmZip()
  if (examConfiguration(exam).sqlConfig?.referenceId === 'dbi202-hotel') {
    zip.addFile('material_0/DBscript.sql',Buffer.from(dbi202Reference.setupScript,'utf8'))
    files.forEach(file=>zip.addFile('material_0/'+file,Buffer.from('-- '+file+'\n-- Write your SQL answer for this question here.\n','utf8')))
    return zip.toBuffer()
  }
  files.forEach((file, index) => {
    const source = [
      '#include <stdio.h>', '#include <stdlib.h>', '#include <string.h>', '#include <math.h>', '#include <ctype.h>', '',
      '// ' + file + ' - Complete this question according to the assignment.',
      '// Keep this filename. Read stdin and print only the required stdout.',
      'int main(void)', '{',
      '    // INPUT - STUDENT: Read the input here.', '',
      '    // PROCESS - STUDENT: Implement your solution here.', '',
      '    // OUTPUT - STUDENT: Print the required result here.', '',
      '    return 0;', '}', ''
    ].join('\n')
    zip.addFile('material_' + index + '/' + file, Buffer.from(source, 'utf8'))
  })
  return zip.toBuffer()
}
