throw new Error('Historical migration script: targets the old source structure. Read scripts/archive/README.md before adapting.');

const fs = require('fs');

const langPath = './lib/language-context.tsx';
const langContent = fs.readFileSync(langPath, 'utf8');

// Find the start of en: { ... } and vi: { ... }
// We can just iterate line by line!

const lines = langContent.split('\n');
const newLines = [];

let inBlock = null;
const seenKeys = { vi: new Set(), en: new Set() };

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.match(/^\s*vi:\s*\{/)) {
    inBlock = 'vi';
    newLines.push(line);
    continue;
  }
  
  if (line.match(/^\s*en:\s*\{/)) {
    inBlock = 'en';
    newLines.push(line);
    continue;
  }
  
  if (inBlock && line.match(/^\s*\},?/)) {
    inBlock = null;
    newLines.push(line);
    continue;
  }
  
  if (inBlock) {
    const match = line.match(/^\s*'([^']+)'\s*:/);
    if (match) {
      const key = match[1];
      if (seenKeys[inBlock].has(key)) {
        // Skip duplicate
        continue;
      }
      seenKeys[inBlock].add(key);
    }
    newLines.push(line);
  } else {
    newLines.push(line);
  }
}

fs.writeFileSync(langPath, newLines.join('\n'));
console.log('Fixed duplicates in language-context.tsx');
