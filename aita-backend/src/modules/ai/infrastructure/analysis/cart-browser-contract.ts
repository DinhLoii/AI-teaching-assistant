/** Compile the explicit cart UI contract in the document. Unknown UI contracts stay unconfigured. */
export function extractCartBrowserContract(text: string): any | null {
 const flat=text.replace(/\s+/g,' ')
 if(!/giỏ hàng/i.test(text)||!['data-testid','cart-total','quantity-P01','clear-cart','localStorage'].every(s=>text.includes(s)))return null
 const markers=[...text.matchAll(/\b(TC\d{2})\s*[-–]\s*([^\n]+?)\s*\((\d+(?:[.,]\d+)?)\s*điểm\)/g)]
 if(markers.length!==9||markers.some((m,i)=>m[1]!==`TC${String(i+1).padStart(2,'0')}`))return null
 const products=[...flat.matchAll(/\b(P0[123])\s+(Bàn phím|Chuột|Tai nghe)\s+(\d+)\s+(\d+)/g)].map(m=>({id:m[1],name:m[2],price:Number(m[3]),stock:Number(m[4])}))
 if(products.length!==3||products.some((p,i)=>p.id!==`P0${i+1}`)||products.some(p=>p.price<=0||p.stock<=0))return null
 const scenarios=markers.map((m,i)=>{
  const body=text.slice(m.index!+m[0].length,markers[i+1]?.index??text.length).split(/5\.\s*Barem/i)[0].replace(/^FER202\s*\|.*$|^Trang\s+\d+.*$|^KIỂM THỬ.*$/gm,'').trim()
  const parts=body.match(/Thao tác:\s*([\s\S]*?)Kết quả mong đợi:\s*([\s\S]*)/)
  return parts?{id:m[1],name:m[2].trim(),points:Number(m[3].replace(',','.')),steps:parts[1].trim(),expectedResult:parts[2].trim(),sourceQuote:m[0]+'\n'+body}:null
 })
 if(scenarios.some(s=>!s||s.points!==1))return null
 // This compiler handles the declared actions only; changes require another supported compiler.
 const required=[/giỏ trống/i,/P01.*một lần/i,/P01.*hai lần/i,/số lượng.*3/i,/xóa P01/i,/P01 hai lần.*P02 một lần.*P03 một lần/i,/Xóa toàn bộ/i,/P02 hai lần.*tải lại/i,/P01 sáu lần/i]
 if(scenarios.some((s,i)=>!required[i].test((s!.steps+' '+s!.expectedResult).replace(/\s+/g,' '))))return null
 const [a,b,c]=products
 if(a.stock!==5||!flat.includes('Không đủ hàng trong kho.'))return null
 const totals=[0,a.price,a.price*2,a.price*3,b.price,a.price*2+b.price+c.price,0,b.price*2,a.price*a.stock]
 if(scenarios.some((s,i)=>!s!.expectedResult.replace(/\s+/g,' ').includes(String(totals[i]))))return null
 const visible=(target:string)=>({action:'assertVisible',target})
 const click=(target:string)=>({action:'click',target})
 const add=(id:string,n=1)=>Array.from({length:n},()=>click(`[data-testid=add-${id}]`))
 const total=(n:number)=>visible(`[data-testid=cart-total]:text-is("${n}")`)
 const qty=(id:string,n:number)=>visible(`[data-testid=quantity-${id}][value="${n}"]`)
 const actions=[
  products.flatMap(p=>[visible(`[data-testid=product-${p.id}]:has-text("${p.name}")`),visible(`[data-testid=price-${p.id}]:text-is("${p.price}")`) ]).concat([visible('[data-testid=cart-empty]'),total(0)]),
  [...add(a.id),qty(a.id,1),total(totals[1])],
  [...add(a.id,2),qty(a.id,2),total(totals[2])],
  [...add(a.id),{action:'fill',target:'[data-testid=quantity-P01]',value:'3'},click('[data-testid=cart-total]'),qty(a.id,3),visible(`[data-testid=line-total-P01]:text-is("${totals[3]}")`),total(totals[3])],
  [...add(a.id),...add(b.id),click('[data-testid=remove-P01]'),qty(b.id,1),total(totals[4])],
  [...add(a.id,2),...add(b.id),...add(c.id),qty(a.id,2),qty(b.id,1),qty(c.id,1),total(totals[5])],
  [...add(a.id),...add(b.id),visible('[data-testid=cart-row-P01]'),visible('[data-testid=cart-row-P02]'),click('[data-testid=clear-cart]'),visible('[data-testid=cart-empty]'),total(0)],
  [...add(b.id,2),{action:'reload'},qty(b.id,2),total(totals[7])],
  [...add(a.id,6),qty(a.id,5),total(totals[8]),visible('[data-testid=cart-error]:text-is("Không đủ hàng trong kho.")')],
 ]
 const tests=scenarios.map((s,i)=>({id:s!.id,name:s!.name,startUrl:`/?case=${s!.id}`,steps:[click('[data-testid=clear-cart]'),...actions[i]],source:'EXTRACTED',evidence:s!.sourceQuote}))
 const criteria=scenarios.map(s=>({id:s!.id,name:s!.id+' - '+s!.name,description:s!.steps+' '+s!.expectedResult,maxPoints:s!.points,method:'ai_assessment',passCondition:s!.expectedResult,failCondition:'Không đạt '+s!.id+' khi thực thi trình duyệt.',aiGuidance:'Dùng kết quả testcase đã liên kết; không thay bằng nhận xét mã nguồn.',source:'EXTRACTED',evidence:s!.sourceQuote,reviewNeeded:false,browserProbe:{testIds:[s!.id],description:s!.name,path:'/'}}))
 const visual=text.match(/Giao diện và chất lượng React:\s*1 điểm\.([\s\S]*?)(?=HỢP ĐỒNG|FER202\s*\||$)/)
 if(!visual)return null
 criteria.push({id:'cart-ui',name:'Giao diện và chất lượng React',description:visual[0].trim(),maxPoints:1,method:'ai_assessment',passCondition:visual[0].trim(),failCondition:'Không đáp ứng các yêu cầu giao diện và chất lượng React trong đề.',aiGuidance:'Đối chiếu ảnh giao diện và mã nguồn, không cộng điểm testcase lần nữa.',source:'EXTRACTED',evidence:visual[0].trim(),reviewNeeded:false,browserProbe:{testIds:[],description:'Giao diện React',path:'/'}})
 return {testSuites:{browser:tests},rubricCriteria:criteria,acceptanceTests:scenarios.map(s=>({...s,execution:'browser_probe',level:'required'}))}
}

export function applyCartBrowserContract(output:any,contract:any) {
 Object.assign(output,{testSuites:contract.testSuites,rubricCriteria:contract.rubricCriteria,acceptanceTests:contract.acceptanceTests,detectedLanguage:'JavaScript',allowedLanguages:['JavaScript','TypeScript'],suggestedTitle:'FER202 - Giỏ hàng',modelUsed:'Trích xuất hợp đồng kiểm thử trình duyệt từ đề',testCases:[]})
 Object.assign(output.runtimeConfig,{language:'JavaScript',version:'Node.js 20 / React / Vite',buildCommand:'npm run build',runCommand:'npm run dev -- --host 0.0.0.0',submissionStyle:'project_archive'})
 output.submissionFormat.requiredLanguage='JavaScript'
 output.summaryExplanation='Đã trích 9 testcase trình duyệt, 9 tiêu chí chức năng và 1 tiêu chí giao diện, tổng 10 điểm từ đề. Testcase chưa chạy cho đến khi chấm bài nộp. Cần giảng viên đối chiếu và duyệt.'
 output.analysisReview={status:'needs_teacher_review',acknowledged:false,profile:{language:'JavaScript',platform:'Web',mode:'project',reviewNeeded:false},warnings:[output.summaryExplanation]}
 Object.assign(output.provenanceReport,{rubricSourceType:'ORIGINAL_DOCUMENT',rubricDetectionStatus:'DETECTED_COMPLETE',rubricAnalysisNotes:output.summaryExplanation,originalTotalPoints:10,statedTotalPoints:10,rawRubricEvidence:contract.rubricCriteria.map((r:any)=>r.evidence).join('\n'),pointsSumDelta:0})
 const field=(value:any,evidence:string)=>({value,evidence,source:'EXTRACTED',confidence:1,validationStatus:'valid',reviewNeeded:false})
 Object.assign(output.provenanceReport.fields,{title:field(output.suggestedTitle,'FER202 - GIỎ HÀNG'),language:field('JavaScript','Dùng React và JavaScript/TypeScript'),allowedLanguages:field(output.allowedLanguages,'Dùng React và JavaScript/TypeScript'),rubricCriteriaCount:field(10,'TC01-TC09 và 1 tiêu chí giao diện'),testCasesCount:field(9,'TC01-TC09'),totalPoints:field(10,'Tổng điểm: 10')})
 return output
}
