import React from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';

export default function EmployeesView({
  authUser,
  employees = [],
  setEmployees,
  showToast = () => {}
}) {
  const companyId = authUser?.companyId || 'default_tenant';
  const { config } = useModuleRegistry(companyId, 'employees');

  return (
    <LayoutEngine
      moduleConfig={config}
      records={employees}
      setRecords={setEmployees}
      authUser={authUser}
      showToast={showToast}
    />
  );
}
