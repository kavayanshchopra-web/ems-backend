# SANDBOX-FIRST & PRODUCTION SAFETY RULE (STRICT ENFORCEMENT)

## MANDATORY PROTOCOL: ZERO UNAPPROVED PRODUCTION CHANGES

1. **PROHIBITED ACTIONS:**
   - NEVER checkout or switch to `main` branch autonomously.
   - NEVER run `git push origin main`.
   - NEVER run `npx vercel --prod` or any production deployment tool.
   - NEVER run `DEPLOY_TO_VERCEL.bat` without explicit, written confirmation from the user in chat.

2. **AUTHORIZED ACTIONS:**
   - Always stay on `staging` branch (`git checkout staging`).
   - All feature work, bug fixes, database schema updates, and refactoring MUST be done exclusively on `staging`.
   - All deployments MUST use `DEPLOY_TO_SANDBOX.bat` targeting:
     `https://sandbox.employeemanagementsystems.com`

3. **PRODUCTION MERGE REQUIREMENT:**
   - Only when the user has verified the feature on `sandbox.employeemanagementsystems.com` and explicitly commands: "Merge to production" or "Deploy to live", may the agent propose a production merge.
