import test from 'node:test'
import assert from 'node:assert/strict'
import {createLoader} from './helpers/load-typescript.mjs'
const {diagnoseTest}=createLoader()('features/submissions/test-diagnostics.ts')
test('compiler locations must match a unique file and valid source line',()=>{
 const files=[{path:'project/main.c',content:'#include <stdio.h>\nint main(){\n return missing;\n}'}]
 const d=diagnoseTest({passed:null,compilationPassed:false,stderr:'main.c:3:9: error: missing undeclared'},files)
 assert.equal(d.status,'failed');assert.equal(d.findings[0].exact,true);assert.match(d.findings[0].snippet,/return missing/)
 assert.equal(diagnoseTest({passed:false,error:'main.c:300:9: error'},files).findings.length,0)
 assert.equal(diagnoseTest({passed:false,error:'main.c:3:9: error'},[...files,{path:'other/main.c',content:files[0].content}]).findings.length,0)
})
test('browser failures expose actual failed step and verified related empty handler',()=>{
 const d=diagnoseTest({kind:'Trình duyệt',passed:false,failedStep:{index:3,action:'assertVisible',target:'[data-testid=quantity-P01]',expected:'Visible',actual:{count:0}},steps:[{action:'click',target:'[data-testid=add-P01]'}]},[{path:'src/App.jsx',content:'function Products(){return <button data-testid={"add-"+id}>Add</button>}\nconst app=<Products onAdd={()=>{}}/>;'}])
 assert.match(d.reason,/bước 3/);assert.equal(d.findings.length,1);assert.equal(d.findings[0].exact,false)
 assert.match(d.solutions[0],/callback rỗng/)
})
test('SQL results remain structured and file association does not claim a faulty line',()=>{
 const d=diagnoseTest({kind:'SQL',passed:false,entryFile:'Q2.sql',expected:{columns:['price'],rows:[['10']]},actual:{columns:['price'],rows:[]}},[{path:'material_0/Q2.sql',content:'SELECT price FROM Service WHERE price > 30;'}])
 assert.match(d.expected,/columns/);assert.equal(d.findings[0].exact,false);assert.match(d.solutions.join(' '),/WHERE/)
})
test('hidden tests never reveal inputs, expected values, traces, source findings or solutions',()=>{
 const d=diagnoseTest({isHidden:true,passed:false,error:'secret',expected:'answer',input:'secret input',steps:[{target:'secret'}]},[{path:'main.c',content:'secret'}])
 assert.equal(d.hidden,true);assert.equal(d.error,'');assert.equal(d.steps.length,0);assert.equal(d.findings.length,0);assert.equal(d.solutions.length,0);assert.doesNotMatch(JSON.stringify(d),/secret|answer/)
})
test('unknown failures do not invent locations and infrastructure interruption is distinct',()=>{
 assert.equal(diagnoseTest({passed:false},[{path:'main.c',content:'int main(){}'}]).findings.length,0)
 const d=diagnoseTest({passed:false,executionError:true},[])
 assert.equal(d.status,'blocked');assert.match(d.solutions[0],/môi trường/)
})
