const assert=require('node:assert/strict')
const fs=require('node:fs/promises')
const {chromium}=require('../../aita-backend/node_modules/playwright')
const id='11111111-1111-4111-8111-111111111111',examId='22222222-2222-4222-8222-222222222222'
;(async()=>{
 const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1050}})
 const user={id:'student-test',role:'student',fullName:'Student Test',email:'test@example.invalid'}
 await context.addInitScript(u=>{localStorage.setItem('aita_token','fixture');localStorage.setItem('aita_user',JSON.stringify(u))},user)
 const files=[{path:'src/Cart.jsx',content:'function Products(){return <button data-testid={"add-"+id}>Thêm</button>}\nconst app=<Products onAdd={()=>{}}/>;'}, {path:'Q2.sql',content:'SELECT price FROM Service WHERE price > 30;'}, {path:'main.c',content:'#include <stdio.h>\nint main(){\n return missing;\n}'}]
 const report={submissionId:id,assignmentId:examId,totalScore:4,maxPossibleScore:10,passedRules:[{ruleId:'io',title:'Console',weight:1,earnedScore:1,evidence:{ioTestCases:[{caseId:'C01',passed:true,input:'1',expected:'2',actual:'2',executionMs:20}]}}],failedRules:[
  {ruleId:'ui',title:'Thêm vào giỏ',weight:1,earnedScore:0,evidence:{browserWorkflows:[{type:'browser.workflow.completed',payload:{testId:'TC02',testName:'Thêm sản phẩm vào giỏ',success:false,executionMs:1200,error:'Expected cart item visible',failedStep:{index:2,action:'assertVisible',target:'[data-testid=quantity-P01]',expected:'Có sản phẩm trong giỏ',actual:{count:0}},steps:[{index:1,action:'click',target:'[data-testid=add-P01]',status:'passed'},{index:2,action:'assertVisible',target:'[data-testid=quantity-P01]',status:'failed',error:'Không tìm thấy dòng sản phẩm'}]}}]}},
  {ruleId:'sql',title:'Truy vấn',weight:1,earnedScore:0,evidence:{sqlTestCases:[{caseId:'SQL02',title:'Lọc giá dịch vụ',passed:false,entryFile:'Q2.sql',expectedColumns:['price'],expectedRows:[['10']],actualColumns:['price'],actualRows:[],diffSummary:'Thiếu dòng kết quả'}]}},
  {ruleId:'compile',title:'Biên dịch',weight:1,earnedScore:0,evidence:{ioTestCases:[{caseId:'BUILD01',passed:null,compilationPassed:false,stderr:'main.c:3:9: error: missing undeclared'}]}}
 ]}
 await context.route('**/api/**',async route=>{const p=new URL(route.request().url()).pathname.replace('/api','');let data=[];if(p==='/auth/me')data=user;if(p==='/notifications/unread-count')data={count:0};if(p===`/submissions/${id}`)data={id,examId,assignment:'Báo cáo kiểm thử',filename:'student.zip',isPublished:true,reviewStatus:'PUBLISHED',gradingStatus:'Graded',score:4,maxScore:10,reportData:report};if(p===`/submissions/${id}/source`)data={files,archiveSha256:'a'.repeat(64)};await route.fulfill({json:{success:true,data}})})
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 const out='../output/testcase-redesign';await fs.mkdir(out,{recursive:true})
 try{
  await page.goto((process.env.TEST_BASE_URL||'http://localhost:5174')+`/student/grading/result/${id}`)
  await page.getByRole('tab',{name:'Test cases',exact:true}).click()
  await page.getByText('Kết quả từng testcase',{exact:true}).waitFor()
  await page.getByText(/Thay callback rỗng/).waitFor()
  await page.getByText(/Vị trí lỗi từ bộ chạy, đã đối chiếu với ZIP/).waitFor()
  await page.getByRole('button',{name:/Q2.sql:.*Mở file/}).waitFor()
  await page.screenshot({path:out+'/desktop.png',fullPage:true})
  await page.getByRole('button',{name:/src\/Cart.jsx:.*Mở file/}).click()
  await page.getByRole('dialog',{name:'Mã nguồn bài nộp'}).waitFor();await page.getByRole('button',{name:'Đóng mã nguồn'}).click()
  await page.getByRole('textbox',{name:'Tìm testcase'}).fill('SQL02');assert.equal(await page.getByText('Lọc giá dịch vụ',{exact:true}).count(),1);assert.equal(await page.getByText('Thêm sản phẩm vào giỏ',{exact:true}).count(),0)
  await page.getByRole('button',{name:'Hiện tất cả'}).click()
  await page.setViewportSize({width:390,height:844})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
  await page.screenshot({path:out+'/mobile.png',fullPage:true})
  assert.deepEqual(errors,[])
  console.log('PASS: UI/SQL/compiler detail, verified code, solutions, filtering, source dialog and mobile layout')
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
