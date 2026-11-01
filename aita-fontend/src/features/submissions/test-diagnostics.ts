export interface SourceFile { path: string; content: string }
export interface CodeFinding { path: string; line: number; endLine: number; focusLine: number; snippet: string; label: string; exact: boolean }
const display = (value: any): string => value == null ? 'Chưa có dữ liệu được lưu' : typeof value === 'string' ? value || '(Rỗng)' : typeof value.count === 'number' ? value.description || (value.count===0?'Không tìm thấy phần tử khớp điều kiện kiểm tra.':`Tìm thấy ${value.count} phần tử. ${value.visible===false?'Phần tử chưa hiển thị.':''}${value.value!=null?' Giá trị: '+value.value: value.text?' Nội dung: '+value.text:''}`) : JSON.stringify(value, null, 2)
const normalize = (path: string) => path.replaceAll('\\', '/').replace(/^\.\//, '')

/** Locations always resolve against this upload's source files; suggestions never establish pass/fail. */
export function diagnoseTest(test: any, files: SourceFile[], rules: any[] = [], allowHidden = false) {
 const hidden = test.isHidden === true && !allowHidden
 const status: 'blocked'|'failed'|'passed'|'pending' = test.executionError ? 'blocked' : test.compilationPassed === false ? 'failed' : test.passed === true ? 'passed' : test.passed === false ? 'failed' : 'pending'
 const error = hidden ? '' : String(test.error || test.errorMessage || test.stderr || '')
 const reason = hidden ? 'Dữ liệu và đáp án của testcase ẩn được bảo vệ.' : test.executionError ? 'Môi trường thực thi bị gián đoạn; cần chạy lại trước khi kết luận về bài làm.' : test.compilationPassed === false ? 'Chương trình chưa biên dịch thành công.' : test.timedOut ? 'Chương trình vượt giới hạn thời gian.' : test.failedStep ? `Không đạt ở bước ${test.failedStep.index}: ${test.failedStep.action}${test.failedStep.target ? ' · ' + test.failedStep.target : ''}` : test.diffSummary || (status === 'failed' ? 'Kết quả thực tế chưa đáp ứng điều kiện kiểm tra.' : status === 'passed' ? 'Đạt điều kiện của testcase đã thực thi.' : 'Chưa có kết quả thực thi hợp lệ.')
 const findings: CodeFinding[] = []
 const add = (file: SourceFile, line: number, label: string, exact: boolean) => {
  const lines = file.content.split(/\r?\n/)
  if (!Number.isInteger(line) || line < 1 || line > lines.length || findings.some(f => f.path === file.path && f.line === line)) return
  const first = Math.max(1,line-2), last = Math.min(lines.length,line+5)
  findings.push({path:file.path,line:first,endLine:last,focusLine:line,snippet:lines.slice(first-1,last).join('\n'),label:label+` (dòng ${line})`,exact})
 }
 const resolve = (path: string) => {
  const requested=normalize(path)
  const exact=files.filter(f=>normalize(f.path)===requested)
  const matches=exact.length?exact:files.filter(f=>normalize(f.path).endsWith('/'+requested)||normalize(f.path).split('/').pop()===requested.split('/').pop())
  return matches.length===1?matches[0]:null
 }
 if (!hidden && status !== 'passed') {
  for (const match of error.matchAll(/([\w./\\-]+\.(?:c|cpp|cc|h|java|py|js|jsx|ts|tsx|cs|sql|kt|dart|swift|go|rs|php))(?::(\d+)(?::\d+)?|\((\d+)(?:,\d+)?\))/gi)) {
   const file=resolve(match[1]); if(file)add(file,Number(match[2]||match[3]),'Vị trí do trình biên dịch / runtime báo',true)
  }
  for(const match of error.matchAll(/File\s+["']([^"']+)["'],\s*line\s+(\d+)/g)) {
   const file=resolve(match[1]);if(file)add(file,Number(match[2]),'Vị trí do Python runtime báo',true)
  }
  const entry = test.entryFile || test.studentFile
  if (entry) { const file=resolve(entry); if(file&&!findings.length)add(file,1,'File đã được dùng để thực thi testcase; chưa xác định dòng gây lỗi',false) }
  const targets=[test.failedStep?.target,...(test.steps||[]).filter((s:any)=>s.action==='click'||s.action==='fill').map((s:any)=>s.target)].filter(Boolean)
  for (const target of targets) {
   const token=String(target).match(/data-testid\s*=\s*["']?([\w-]+)/)?.[1]
   if(!token)continue
   const prefix=token.replace(/P\d+$/,'')
   const matches=files.filter(file=>file.content.includes(token)||(prefix.length>3&&file.content.includes(prefix)))
   if(matches.length===1) {
    const file=matches[0],lines=file.content.split(/\r?\n/)
    const stub=lines.findIndex(line=>/on\w+\s*=\s*\{\s*\([^)]*\)\s*=>\s*\{\s*\}\s*\}/.test(line))
    add(file,stub>=0?stub+1:lines.findIndex(line=>line.includes(token)||line.includes(prefix))+1,stub>=0?'Callback rỗng trong file giao diện liên quan; cần kiểm tra luồng xử lý':'Đoạn giao diện khớp phần tử được kiểm thử; chưa kết luận nguyên nhân',false)
    break
   }
  }
  for(const rule of rules.filter(rule=>(test.ruleIds||[test.ruleId]).includes(rule.ruleId))) {
   for(const snippet of rule.evidence?.snippets||[]) {
    const file=resolve(snippet.filePath||''); if(!file||!snippet.codeSnippet)continue
    const offset=file.content.indexOf(snippet.codeSnippet)
    if(offset>=0)add(file,file.content.slice(0,offset).split('\n').length,'Đoạn mã của tiêu chí liên kết, khớp bài nộp',false)
   }
  }
 }
 let solutions: string[] = []
 if (!hidden && status !== 'passed') {
  if(status==='blocked')solutions=['Kiểm tra môi trường chạy, khôi phục phiên kiểm thử và chạy lại cùng bài nộp. Chưa sửa logic hoặc trừ điểm vì gián đoạn hệ thống.']
  else if(test.compilationPassed===false||/syntax error|cannot find|undefined reference|not defined|error CS\d/i.test(error))solutions=['Mở vị trí lỗi do trình biên dịch báo ở trên; sửa cú pháp, tên biến/hàm hoặc khai báo còn thiếu theo thông báo lỗi.','Biên dịch lại thành công trước, sau đó chạy lại testcase này và các test liên quan.']
  else if(test.timedOut)solutions=['Kiểm tra điều kiện dừng vòng lặp, việc đọc đủ dữ liệu và các thao tác chờ không có giới hạn.','Giảm độ phức tạp hoặc sửa điều kiện chờ, rồi chạy lại với cùng dữ liệu kiểm thử.']
  else if(test.kind==='Trình duyệt')solutions=[findings.some(f=>f.label.includes('Callback rỗng'))?'Thay callback rỗng bằng hàm xử lý thực sự và cập nhật state tương ứng; kiểm tra component nhận đúng callback.':'Kiểm tra handler của thao tác cuối trước khi lỗi và điều kiện hiển thị ở phần tử được đánh dấu.','Đối chiếu kết quả mong đợi với trạng thái DOM thực tế; kiểm tra cập nhật state, tính toán, điều hướng hoặc lưu dữ liệu theo yêu cầu testcase.','Chạy lại testcase lỗi và các luồng có dùng chung trạng thái sau khi sửa.']
  else if(test.kind==='SQL')solutions=[/cột|column/i.test(reason+' '+error)?'Kiểm tra các cột SELECT, thứ tự cột và alias theo yêu cầu.':'Đối chiếu truy vấn với các dòng kết quả sai; kiểm tra điều kiện WHERE, JOIN và GROUP BY.','Với procedure/trigger/UPDATE, kiểm tra cả dữ liệu sau thực thi và trường hợp biên; tránh JOIN làm nhân bản số liệu.','Chạy lại trên dữ liệu khởi tạo sạch, không dùng kết quả từ database đã bị thay đổi để kết luận.']
  else if(test.kind==='HTTP')solutions=['Đối chiếu method, đường dẫn, mã trạng thái và nội dung response với điều kiện kiểm tra.','Kiểm tra validation, quyền truy cập và nhánh xử lý của endpoint liên quan, rồi chạy lại request.']
  else solutions=['Chạy lại bằng đúng input được ghi; so sánh từng dòng output, định dạng số và thứ tự kết quả.','Kiểm tra công thức, điều kiện biên và nhánh xử lý tương ứng trong file thực thi; đoạn mã liên quan ở trên chưa tự chứng minh nguyên nhân.','Sau khi sửa, chạy lại testcase này và các testcase còn lại để tránh làm hỏng chức năng đã đạt.']
 }
 return {status,hidden,reason,error,findings:findings.slice(0,3),solutions,expected:display(hidden?undefined:test.expected??test.failedStep?.expected),actual:display(hidden?undefined:test.actual??test.failedStep?.actual),input:display(hidden?undefined:test.input),steps:hidden?[]:test.steps||[]}
}
