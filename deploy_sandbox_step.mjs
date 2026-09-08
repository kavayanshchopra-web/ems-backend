import { execSync } from 'child_process';

try {
  console.log('🚀 Deploying to Vercel Sandbox...');
  const output = execSync('npx vercel --yes', { cwd: './frontend', encoding: 'utf-8' });
  console.log(output);

  // Match the preview URL
  const matches = output.match(/https:\/\/[a-zA-Z0-9\-]+-ems15\.vercel\.app/g) || output.match(/https:\/\/[a-zA-Z0-9\-]+\.vercel\.app/g);
  if (matches && matches.length > 0) {
    const previewUrl = matches[0];
    console.log(`🔗 Setting permanent alias: ${previewUrl} -> sandbox.employeemanagementsystems.com`);
    execSync(`npx vercel alias set ${previewUrl} sandbox.employeemanagementsystems.com`, { cwd: './frontend', stdio: 'inherit' });
    console.log(`\n🎉 SUCCESS: Permanent Sandbox URL Updated!`);
    console.log(`👉 Access URL: https://sandbox.employeemanagementsystems.com`);
  } else {
    console.warn('⚠️ Preview URL not matched from output.');
  }
} catch (err) {
  console.error('❌ Deployment error:', err.message);
  process.exit(1);
}
