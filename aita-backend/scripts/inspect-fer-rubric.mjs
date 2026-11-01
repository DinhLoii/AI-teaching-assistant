import 'dotenv/config'
import {prisma} from '../src/database/prisma.ts'
try {
 const e=await prisma.exam.findUniqueOrThrow({where:{Id:'77e8f7be-b8db-40cc-92e0-24cac8538555'},include:{ExamSection:{include:{RubricRule:{include:{RubricCriterion:true}}}}}})
 console.log(JSON.stringify(e.ExamSection.flatMap(s=>s.RubricRule).map(r=>({id:r.Id,title:r.Description,prompt:r.EvaluationPrompt,weight:r.MaxPoints,criteria:r.RubricCriterion.map(c=>({id:c.Id,description:c.Description,config:c.ValidationConfig}))})),null,2))
}finally{await prisma.$disconnect()}
