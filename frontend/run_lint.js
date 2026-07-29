const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx eslint src/App.jsx', { cwd: 'D:\\AG Projects\\whatsapp-crm\\frontend', encoding: 'utf-8' });
  fs.writeFileSync('lint_output.txt', output);
} catch (e) {
  fs.writeFileSync('lint_output.txt', e.stdout || e.message);
}
console.log('Linting done.');
