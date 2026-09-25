import fs from 'fs';

const content = fs.readFileSync('backend/routes.js', 'utf8');
const lines = content.split('\n');
console.log('Total lines in backend/routes.js:', lines.length);

lines.forEach((l, idx) => {
  if (
    l.toLowerCase().includes('telephony') || 
    l.toLowerCase().includes('callingservice') ||
    l.toLowerCase().includes('/calls') ||
    l.toLowerCase().includes('/calling') ||
    l.toLowerCase().includes('plivo')
  ) {
    console.log(`${idx + 1}: ${l.trim()}`);
  }
});
