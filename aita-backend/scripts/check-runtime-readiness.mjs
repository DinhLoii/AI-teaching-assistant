import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { StdInOutProbeEngine } from '../src/modules/grading/engine/application/evaluator/StdInOutProbeEngine.ts'
import { ExecutionSandboxService } from '../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.ts'
import { HTTPProbeEngine } from '../src/modules/grading/engine/application/evaluator/HTTPProbeEngine.ts'

const root = path.resolve('../tmp/runtime-readiness-' + Date.now())
await fs.mkdir(root, { recursive: true })
const results = []
async function files(name, content) {
  const dir = path.join(root, name)
  for (const [filename, text] of Object.entries(content)) {
    const destination = path.join(dir, filename)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.writeFile(destination, text)
  }
  return dir
}
async function consoleCheck(name, language, content) {
  const dir = await files(name, content)
  try {
    const result = await new StdInOutProbeEngine().evaluateAsync(dir, {
      description: 'Runtime readiness arithmetic', requiredLanguage: language,
      testCases: [{ id: 'sum', input: '7 5', expectedOutput: '12', comparisonMode: 'exact' }],
    })
    const summary = { name, passed: result.passed, compilationPassed: result.compilationPassed, cases: result.passedCases, stderr: result.caseResults?.[0]?.stderr?.slice(-1800), actual: result.caseResults?.[0]?.actual }
    results.push(summary); console.log('READINESS ' + JSON.stringify(summary))
  } catch (error) { results.push({ name, passed: false, error: error.message }); console.log('READINESS FAIL ' + name + ' ' + error.message) }
}
await consoleCheck('C-console', 'C', { 'main.c': '#include <stdio.h>\nint main(void){int a,b;if(scanf("%d %d",&a,&b)!=2)return 1;printf("%d\\n",a+b);return 0;}' })
await consoleCheck('Java-Maven-console', 'Java', {
  'pom.xml': '<project><modelVersion>4.0.0</modelVersion><groupId>edu.audit</groupId><artifactId>readiness</artifactId><version>1.0</version><properties><maven.compiler.source>17</maven.compiler.source><maven.compiler.target>17</maven.compiler.target></properties></project>',
  'src/main/java/Main.java': 'import java.util.Scanner; public class Main { public static void main(String[] args){ Scanner s=new Scanner(System.in);System.out.println(s.nextInt()+s.nextInt());} }',
})
await consoleCheck('CSharp-net8-console', 'C#', {
  'Readiness.csproj': '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>',
  'Program.cs': 'using System; var parts=Console.ReadLine()!.Split(); Console.WriteLine(int.Parse(parts[0])+int.Parse(parts[1]));',
})

async function webCheck(name, content) {
  const dir = await files(name, content)
  const service = new ExecutionSandboxService()
  let handle
  try {
    handle = await service.startAsync(dir, 'backend')
    if (!handle.isReady) throw new Error((handle.crashLogs || 'runtime not ready').slice(-2000))
    const probe = await new HTTPProbeEngine().evaluateAsync(handle.baseUrl, { steps: [
      { stepId: 'health', method: 'GET', pathTemplate: '/health', expectedStatus: 200, assertions: [{ jsonPath: '$.status', assertType: 'equals', value: 'UP' }] },
      { stepId: 'input-output', method: 'GET', pathTemplate: '/sum?a=7&b=5', expectedStatus: 200, assertions: [{ jsonPath: '$.result', assertType: 'equals', value: 12 }] },
    ] })
    const summary = { name, passed: probe.passed, runtime: handle.runtimeStack, stepsPassed: probe.stepResults.filter(x => x.passed).length }
    results.push(summary); console.log('READINESS ' + JSON.stringify(summary))
  } catch (error) { results.push({ name, passed: false, error: error.message }); console.log('READINESS FAIL ' + name + ' ' + error.message) }
  finally { if (handle) await service.stopAsync(handle) }
}
await webCheck('Node20-WebAPI', {
  'package.json': JSON.stringify({ name: 'readiness-node', version: '1.0.0', scripts: { start: 'node index.js' } }),
  'index.js': 'const http=require("http");http.createServer((req,res)=>{const u=new URL(req.url,"http://localhost");res.setHeader("Content-Type","application/json"); if(u.pathname==="/sum")res.end(JSON.stringify({result:Number(u.searchParams.get("a"))+Number(u.searchParams.get("b"))})); else res.end(JSON.stringify({status:"UP"}));}).listen(process.env.PORT||8080,"0.0.0.0");',
})
await webCheck('ASPNet8-WebAPI', {
  'Readiness.csproj': '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings></PropertyGroup></Project>',
  'Program.cs': 'var app=WebApplication.CreateBuilder(args).Build();app.MapGet("/",()=>new{status="UP"});app.MapGet("/health",()=>new{status="UP"});app.MapGet("/sum",(int a,int b)=>new{result=a+b});app.Run();',
})
await fs.writeFile(path.resolve('../tmp/runtime-readiness-results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2))
console.log('READINESS_DONE ' + JSON.stringify(results.map(({ name, passed }) => ({ name, passed }))))
