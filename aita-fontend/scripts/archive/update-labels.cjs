throw new Error('Historical migration script: targets the old source structure. Read scripts/archive/README.md before adapting.');

const fs = require('fs');
const path = require('path');

const replaceInFile = (file, regex, replacement) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.match(regex)) {
    fs.writeFileSync(file, content.replace(regex, replacement));
    console.log('Updated', file);
  }
};

const walk = (dir, ext) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file, ext));
    } else if (file.endsWith(ext)) {
      results.push(file);
    }
  });
  return results;
};

const adminFiles = walk('./app/admin', '.tsx');
for (const f of adminFiles) {
  replaceInFile(f, /roleLabel="[^"]+"/g, "roleLabel={t('profile.role_admin', 'Quản trị viên')}");
}

const lecturerFiles = walk('./app/lecturer', '.tsx');
for (const f of lecturerFiles) {
  replaceInFile(f, /roleLabel="[^"]+"/g, "roleLabel={t('profile.role_lecturer', 'Giảng viên')}");
}

const studentFiles = walk('./app/student', '.tsx');
for (const f of studentFiles) {
  replaceInFile(f, /roleLabel="[^"]+"/g, "roleLabel={t('profile.role_student', 'Sinh viên')}");
}

const profileFiles = walk('./app/profile', '.tsx');
for (const f of profileFiles) {
  replaceInFile(f, /roleLabel="[^"]+"/g, "roleLabel={t('nav.profile', 'Hồ sơ cá nhân')}");
}

// Update Navbar.tsx
const navbarPath = './components/layout/Navbar.tsx';
let navbar = fs.readFileSync(navbarPath, 'utf8');
navbar = navbar.replace(/> Admin\s*<\/button>/g, "> {t('nav.fast_admin', 'Admin')}</button>");
navbar = navbar.replace(/> GV\s*<\/button>/g, "> {t('nav.fast_lecturer', 'GV')}</button>");
navbar = navbar.replace(/> SV\s*<\/button>/g, "> {t('nav.fast_student', 'SV')}</button>");
fs.writeFileSync(navbarPath, navbar);
console.log('Updated Navbar.tsx');

// Add keys to language-context.tsx
const langPath = './lib/language-context.tsx';
let lang = fs.readFileSync(langPath, 'utf8');
if (!lang.includes("'nav.fast_admin'")) {
  lang = lang.replace(/en: \{/, "en: {\n    'nav.fast_admin': 'Admin',\n    'nav.fast_lecturer': 'Lecturer',\n    'nav.fast_student': 'Student',");
  lang = lang.replace(/vi: \{/, "vi: {\n    'nav.fast_admin': 'Admin',\n    'nav.fast_lecturer': 'GV',\n    'nav.fast_student': 'SV',");
  fs.writeFileSync(langPath, lang);
  console.log('Updated language-context.tsx');
}
