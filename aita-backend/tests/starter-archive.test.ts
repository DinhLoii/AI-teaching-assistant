import test from 'node:test'
import assert from 'node:assert/strict'
import AdmZip from 'adm-zip'
import { buildStarterArchive, starterSourceFiles } from '../src/modules/exams/application/starter-archive.js'
import { canAccessExamDocument } from '../src/modules/exams/application/document-access.js'
const exam = {
 description: Array.from({length:7},(_,i)=>`Question ${i+1}\n(1 mark, file to be edited: Q${i+1}.c)`).join('\n'),
 aiGeneratedContent: JSON.stringify({testCases:[{entryFile:'Q1.c',isHidden:true,input:'secret input',expectedOutput:'secret answer'}]}),
 status:'Published', classLecturers:[{studentIds:['student']}],
}
test('seven questions produce one ZIP with seven editable C sources in material folders',()=>{
 const zip=new AdmZip(buildStarterArchive(exam))
 assert.deepEqual(zip.getEntries().map(e=>e.entryName).sort(), Array.from({length:7},(_,i)=>`material_${i}/Q${i+1}.c`))
 for(const entry of zip.getEntries()) {
  const source=entry.getData().toString('utf8')
  assert.match(source,/int main\(void\)/)
  assert.match(source,/STUDENT/)
  assert.doesNotMatch(source,/secret input|secret answer|system\(/)
 }
})
test('saved testcase filenames support existing assignments, deduplicate and sort numerically',()=>{
 assert.deepEqual(starterSourceFiles({aiGeneratedContent:{testCases:[{entryFile:'Q7.c'},{entryFile:'Q2.c'},{entryFile:'Q7.c'},{entryFile:'../../Q1.c'},{entryFile:'solution.c'}]}}),['Q2.c','Q7.c'])
 assert.throws(()=>buildStarterArchive({description:'No source filenames'}))
})
test('starter access follows document enrollment and publication policy',()=>{
 assert.equal(canAccessExamDocument(exam,{id:'student',role:'STUDENT'}),true)
 assert.equal(canAccessExamDocument(exam,{id:'other',role:'STUDENT'}),false)
 assert.equal(canAccessExamDocument({...exam,status:'Draft'},{id:'student',role:'STUDENT'}),false)
})
