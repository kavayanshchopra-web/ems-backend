@echo off
echo Starting OmniFlow WA CRM Backend and Frontend...

start "OmniFlow Backend" cmd /k "cd /d d:\AG Projects\whatsapp-crm\backend && node server.js"
start "OmniFlow Frontend" cmd /k "cd /d d:\AG Projects\whatsapp-crm\frontend && npm run dev"

echo App servers starting! Please open http://localhost:5173 in your browser.
