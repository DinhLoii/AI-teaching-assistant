import dotenv from 'dotenv'
dotenv.config({quiet:true})
const {prisma}=await import('../src/database/prisma.ts')
try {
 const s=await prisma.submission.findUnique({where:{Id:'014a8658-423b-4435-a774-86fa15e8a6ba'},include:{Exam:{include:{TestCase:true,ExamAttachment:true}}}})
 const r=JSON.parse(s.ReportData||'{}'),c=JSON.parse(s.Exam.AiGeneratedContent||'{}')
 console.log(JSON.stringify({reportKeys:Object.keys(r),configKeys:Object.keys(c),rubric:c.rubricCriteria,verification:r.consoleVerification,ruleResults:[...(r.passedRules||[]),...(r.failedRules||[])].map(x=>({title:x.title,score:x.earnedScore})),zip:s.ZipFileUrl},null,2))
}finally{await prisma.$disconnect()}
