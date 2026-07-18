# Antigravity IDE Workspace Rules

## 1. Role-Based User Training Documentation Rule
- **Constraint:** Whenever a new feature, dashboard button, form input, or workflow is added, updated, or removed from the codebase, the agent must automatically update or create corresponding role-specific user training documents inside `backend/docs/user_training/`.
- **Target Persona Files:**
  - `super_admin_manual.md`
  - `company_owner_manual.md`
  - `manager_manual.md`
  - `field_employee_manual.md`
- **Quality Standard:** Manuals must be written in simple, non-technical, step-by-step instructions. They must detail how each user role (Super Admin, Owner, Manager, Employee) interacts with the features.
