import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { javaRuntimePlan, decodeSandboxLogs } from '../src/modules/grading/engine/application/sandbox/java-runtime.js';
import { ExecutionSandboxService } from '../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.js';

const warPom = (group = 'javax.servlet', version = '4.0.1') => `<project>
<modelVersion>4.0.0</modelVersion><groupId>edu.prj</groupId><artifactId>prj-basic</artifactId><version>1.0.0</version>
<packaging>war</packaging><properties><maven.compiler.release>17</maven.compiler.release><servlet.version>${version}</servlet.version></properties>
<dependencies><dependency><groupId>${group}</groupId><artifactId>${group === 'javax.servlet' ? 'javax.servlet-api' : 'jakarta.servlet-api'}</artifactId><version>\${servlet.version}</version><scope>provided</scope></dependency></dependencies>
<build><plugins><plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-war-plugin</artifactId><version>3.4.0</version></plugin></plugins></build></project>`;

test('WAR uses a servlet-compatible Tomcat and preserves nested submission paths', () => {
  const legacy = javaRuntimePlan(warPom(), '/app/PRJ Submit');
  assert.match(legacy.image, /tomcat-9\.0/);
  assert.match(legacy.command, /cd '\/sandbox\/PRJ Submit'/);
  assert.match(legacy.command, /mvn -B -ntp clean package/);
  assert.match(legacy.command, /webapps\/ROOT.war/);
  assert.doesNotMatch(legacy.command, /spring-boot:run|java -jar/);
  assert.match(javaRuntimePlan(warPom('jakarta.servlet', '6.0.0'), '/app').image, /tomcat-10\.1/);
  assert.match(javaRuntimePlan(warPom('jakarta.servlet', '4.0.4'), '/app').image, /tomcat-9\.0/);
  assert.match(javaRuntimePlan(warPom() + '<!-- jakarta.servlet version 6 -->', '/app').image, /tomcat-9\.0/);
  assert.match(javaRuntimePlan('<project/>', '/app').command, /spring-boot:run/);
});

test('container diagnostics decode stdout and stderr headers without dropping UTF-8', () => {
  const frame = (type: number, text: string) => {
    const payload = Buffer.from(text);
    const header = Buffer.alloc(8);
    header[0] = type;
    header.writeUInt32BE(payload.length, 4);
    return Buffer.concat([header, payload]);
  };
  assert.equal(decodeSandboxLogs(Buffer.concat([frame(1, 'BUILD SUCCESS\n'), frame(2, 'Lỗi khởi động\n')])), 'BUILD SUCCESS\nLỗi khởi động\n');
  assert.equal(decodeSandboxLogs(Buffer.from('plain logs')), 'plain logs');
});

test('sandbox provisions a nested WAR with the Tomcat plan', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aita-war-test-'));
  try {
    const nested = path.join(root, 'PRJ_Submit_3_4_Diem');
    await fs.mkdir(nested);
    await fs.writeFile(path.join(nested, 'pom.xml'), warPom());
    const service = new ExecutionSandboxService() as any;
    let config: any;
    let builtImage = '';
    service.getFreePort = async () => 18080;
    service.ensureJavaWarImage = async (image: string) => { builtImage = image; };
    service.waitUntilReady = async () => {};
    service.docker = {
      getImage: () => ({ inspect: async () => ({}) }),
      createContainer: async (options: any) => {
        config = options;
        return { id: 'war-container', start: async () => {} };
      },
    };
    const result = await service.startAsync(root, 'backend');
    assert.equal(result.isReady, true);
    assert.equal(config.Image, builtImage);
    assert.match(config.Cmd[2], /\/sandbox\/PRJ_Submit_3_4_Diem/);
    assert.match(config.Cmd[2], /catalina.sh/);
    assert.doesNotMatch(config.Cmd[2], /spring-boot:run|target\/\*\.jar/);
    assert.ok(config.HostConfig.Binds.some((bind: string) => bind.endsWith(':/app:ro')));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

for (const [namespace, group, version] of [['javax', 'javax.servlet', '4.0.1'], ['jakarta', 'jakarta.servlet', '6.0.0']]) {
test(`real Docker serves a packaged ${namespace} servlet WAR`, { skip: process.env.TEST_JAVA_DOCKER !== 'true', timeout: 600000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aita-war-docker-'));
  const service = new ExecutionSandboxService();
  let handle;
  try {
    const nested = path.join(root, 'PRJ_Submit_3_4_Diem');
    const source = path.join(nested, 'src/main/java/edu/prj/basic');
    await fs.mkdir(source, { recursive: true });
    await fs.writeFile(path.join(nested, 'pom.xml'), warPom(group, version));
    await fs.writeFile(path.join(source, 'BookServlet.java'), `package edu.prj.basic;
import ${namespace}.servlet.annotation.WebServlet;
import ${namespace}.servlet.http.*;
@WebServlet("/books") public class BookServlet extends HttpServlet {
protected void doGet(HttpServletRequest req, HttpServletResponse res) throws java.io.IOException { res.getWriter().print("WAR_OK"); }
}`);
    handle = await service.startAsync(root, 'backend');
    assert.equal(handle.isReady, true, handle.crashLogs);
    // Tomcat can listen before application deployment finishes.
    let body = '';
    for (let attempt = 0; attempt < 30; attempt++) {
      body = await (await fetch(`${handle.baseUrl}/books`)).text();
      if (body === 'WAR_OK') break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.equal(body, 'WAR_OK');
  } finally {
    if (handle) await service.stopAsync(handle);
    await fs.rm(root, { recursive: true, force: true });
  }
});
}
