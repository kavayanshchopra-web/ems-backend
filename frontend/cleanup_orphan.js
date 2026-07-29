// cleanup_orphan.js — removes orphan lines 7726-7993 (0-indexed: 7725-7992)
// Run from: d:\AG Projects\whatsapp-crm\frontend
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'src/App.jsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Total lines before:', lines.length);

// 1-indexed start=7726, end=7993 → 0-indexed start=7725, end=7992 (inclusive)
// We keep everything OUTSIDE this range
const START = 7725; // 0-indexed inclusive start to DELETE
const END   = 7992; // 0-indexed inclusive end   to DELETE

const kept = lines.filter((_, i) => i < START || i > END);

console.log('Total lines after:', kept.length);
console.log('Lines removed:', lines.length - kept.length);

fs.writeFileSync(filePath, kept.join('\n'), 'utf8');
console.log('Done! File written successfully.');
