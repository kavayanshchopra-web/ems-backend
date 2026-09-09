# 🔒 SAAS MULTI-TENANT ISOLATION ARCHITECTURAL LOCK
**Status: PERMANENTLY LOCKED & ENFORCED**  
**Authorized Date: 2026-09-09**  

---

## 📌 CORE MANDATE: ZERO CROSS-TENANT DATA LEAKAGE

All code modifications across Frontend, Backend, Database, and Companion Apps must strictly abide by these immutable rules. Any change that bypasses tenant isolation is prohibited.

---

### 1. STRICT DATABASE & QUERY ISOLATION
1. **Mandatory Tenant Scoping:**
   - Every database query (Supabase SQL / REST / Backend / SQLite) MUST include `tenant_id = eq.<tenantId>`.
   - No query may fetch, list, count, or mutate records without an explicit `tenant_id` filter.
2. **Canonical Tenant ID Fallback:**
   - When resolving the current tenant identity, always use:
     ```javascript
     const tenantId = Number(authUser?.tenantId || authUser?.companyId || authUser?.tenant_id) || 1;
     ```
   - Fallback is strictly **Tenant `1` (`#TEN-0001-KAVYANSH-CHOPRA`)**.
   - NEVER fall back to legacy `999` or arbitrary test integers.
3. **Type Safety Requirement:**
   - In PostgreSQL / Supabase, `tenant_id` is stored as an integer, while slugs and tokens are strings.
   - NEVER call `.startsWith()`, `.toLowerCase()`, or `.split()` directly on `tenant_id` without wrapping:
     ```javascript
     String(record.tenant_id || '').startsWith('...')
     ```

---

### 2. CLIENT-SIDE STORAGE & CACHE ISOLATION
1. **Mandatory Namespacing via `TenantStorage`:**
   - All browser storage MUST be namespaced: `omni_${tenantId}_${key}`.
   - Global or un-namespaced storage of leads, contacts, call logs, or employee records is strictly forbidden.
2. **Session Hygiene on Startup:**
   - When the app hydrates, any stale dummy caches (e.g. from obsolete `999` or `1002`) are immediately purged.
   - If an active user session references a non-existent or obsolete dummy tenant, it auto-resets to Tenant 1.
3. **Tenant Window Identity:**
   - `window.__omniflow_tenant` must always match the active tenant ID (`'1'` in default Sandbox).

---

### 3. TWO-TIER ENVIRONMENT LOCK
1. **Sandbox Environment:**
   - Domain: `https://sandbox.employeemanagementsystems.com`
   - Database: Supabase Project `omniflow-sandbox` (`mucgmzldgvtblmsurtgo`)
   - Firebase: Sandbox Project `ems-sandbox-60598`
   - Deployments: Deployed exclusively from `staging` branch / preview builds with alias update.
2. **Live Production Environment:**
   - Domain: `https://app.employeemanagementsystems.com`
   - Zero direct pushes. Only promoted after explicit verification on Sandbox.

---

### 4. MODIFICATION POLICY
This architecture is locked. Do not alter tenant isolation logic, default IDs, or storage patterns unless the user provides explicit, direct instructions.
