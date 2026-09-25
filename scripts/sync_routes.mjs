import fs from 'fs';

const backendRoutes = fs.readFileSync('backend/routes.js', 'utf8');
const rootRoutes = fs.readFileSync('routes.js', 'utf8');

console.log('backend/routes.js length:', backendRoutes.length);
console.log('routes.js length:', rootRoutes.length);

if (!rootRoutes.includes('/telephony/plivo/inbound')) {
  console.log('Updating root routes.js with Phase 4 endpoints...');
  // Find where Plivo Phase 2 is in root routes.js
  if (rootRoutes.includes('// 🌐 PLIVO UNIVERSAL WEBRTC & WALLET ENDPOINTS (PHASE 2)')) {
    // Replace the block or copy
    fs.writeFileSync('routes.js', backendRoutes, 'utf8');
    console.log('✅ routes.js synced cleanly with backend/routes.js');
  } else {
    fs.writeFileSync('routes.js', backendRoutes, 'utf8');
    console.log('✅ routes.js replaced with backend/routes.js');
  }
} else {
  console.log('root routes.js already up to date.');
}
