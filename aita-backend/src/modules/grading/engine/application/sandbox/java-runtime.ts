export function javaRuntimePlan(pom: string, runDir: string) {
  const content = pom.replace(/<!--[\s\S]*?-->/g, '');
  const quote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;
  const setup = `set -eu\ncp -a /app /sandbox\ncd ${quote(runDir.replace(/^\/app(?=\/|$)/, '/sandbox'))}\n`;
  if (/<packaging>\s*war\s*<\/packaging>/i.test(content)) {
    // Jakarta EE 8 still uses javax; the package rename starts at Servlet 5 / EE 9.
    const resolved = content.replace(/\$\{([^}]+)\}/g, (original, key: string) => {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return content.match(new RegExp(`<${escaped}>\\s*([^<]+)\\s*</${escaped}>`))?.[1]?.trim() || original;
    });
    const jakarta = [...resolved.matchAll(/<(?:dependency|parent)>[\s\S]*?<\/(?:dependency|parent)>/g)].some(([block]) => {
      const group = block.match(/<groupId>\s*([^<]+?)\s*<\/groupId>/)?.[1];
      const version = Number(block.match(/<version>\s*(\d+)/)?.[1]);
      return (group === 'jakarta.servlet' && version >= 5)
        || (group === 'jakarta.platform' && version >= 9)
        || (group === 'org.springframework.boot' && version >= 3);
    });
    const tomcatVersion = jakarta ? '10.1' : '9.0';
    return {
      image: `aita-java-war:tomcat-${tomcatVersion}-jdk21`,
      dockerfile: `FROM tomcat:${tomcatVersion}-jdk21-temurin AS tomcat\nFROM maven:3.9-eclipse-temurin-21\nCOPY --from=tomcat /usr/local/tomcat /usr/local/tomcat\nENV CATALINA_HOME=/usr/local/tomcat\n`,
      command: setup + `mvn -B -ntp clean package -DskipTests\nset -- target/*.war\nif [ "$#" -ne 1 ] || [ ! -f "$1" ]; then echo 'Sandbox: expected exactly one WAR in target/' >&2; exit 1; fi\ncp "$1" "$CATALINA_HOME/webapps/ROOT.war"\nexec "$CATALINA_HOME/bin/catalina.sh" run`,
    };
  }
  return {
    image: 'maven:3.9-eclipse-temurin-21',
    dockerfile: null,
    command: setup + `(mvn -B -ntp spring-boot:run -Dspring-boot.run.arguments="--server.port=8080" || (mvn -B -ntp clean package -DskipTests && java -jar target/*.jar))`,
  };
}

/** Docker non-TTY logs carry an eight-byte header for each stdout/stderr frame. */
export function decodeSandboxLogs(raw: Buffer | string): string {
  if (typeof raw === 'string') return raw;
  const chunks: Buffer[] = [];
  let offset = 0;
  while (offset + 8 <= raw.length) {
    if (![1, 2].includes(raw[offset]) || raw.readUIntBE(offset + 1, 3) !== 0) break;
    const size = raw.readUInt32BE(offset + 4);
    if (offset + 8 + size > raw.length) break;
    chunks.push(raw.subarray(offset + 8, offset + 8 + size));
    offset += 8 + size;
  }
  return (offset === raw.length ? Buffer.concat(chunks) : raw).toString('utf8');
}
