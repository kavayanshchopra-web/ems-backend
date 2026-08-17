import React from 'react';
import { Settings } from 'lucide-react';

export default function DropdownsPage({
  handleSaveMasterDropdowns,
  dropdownCategorySearch = '',
  setDropdownCategorySearch,
  systemDropdowns = {},
  setSystemDropdowns,
  selectedDropdownCategory = 'departments',
  setSelectedDropdownCategory,
  dropdownSortConfig = { key: 'index', dir: 'asc' },
  setDropdownSortConfig,
  openInputModal,
  showToast,
  softDeleteRecord,
  atsCandidates = [],
  stages = [],
  setStages,
  allowedTags = [],
  setAllowedTags
}) {

  // Category Configuration Mapping
  const categoriesList = [
    { id: 'departments', label: 'Departments', key: 'departments' },
    { id: 'designations', label: 'Designations', key: 'designations' },
    { id: 'ats_stages', label: 'Recruitment ATS Stages', key: 'atsStages' },
    { id: 'employment_types', label: 'Employment Types', key: 'employmentTypes' },
    { id: 'genders', label: 'Genders', key: 'genders' },
    { id: 'marital_statuses', label: 'Marital Statuses', key: 'maritalStatuses' },
    { id: 'blood_groups', label: 'Blood Groups', key: 'bloodGroups' },
    { id: 'leave_categories', label: 'Leave Types', key: 'leaveCategories' },
    { id: 'crm_stages', label: 'CRM Pipeline Stages', key: 'crmStages' },
    { id: 'crm_tags', label: 'CRM Contact Tags', key: 'crmTags' },
    { id: 'expenses', label: 'Expense Categories', key: 'expenseCategories' },
    { id: 'priorities', label: 'Task Priority Levels', key: 'taskPriorities' },
    { id: 'custom_engine', label: 'Custom Categories Engine', key: 'customCategories' }
  ];

  // Helper to extract array for current category
  const getCategoryItems = (catId) => {
    if (catId === 'crm_stages') {
      if (Array.isArray(stages) && stages.length > 0) {
        return stages.map(s => typeof s === 'object' ? s : { id: String(s), title: String(s), color: '#0d9488' });
      }
      return [
        { id: 'new', title: 'New Leads', color: '#0d9488' },
        { id: 'contacted', title: 'Contacted', color: '#0ea5e9' },
        { id: 'interested', title: 'Interested', color: '#eab308' },
        { id: 'proposal', title: 'Proposal Sent', color: '#ec4899' },
        { id: 'won', title: 'Closed Won', color: '#10b981' }
      ];
    }

    if (catId === 'crm_tags') {
      const list = (Array.isArray(allowedTags) && allowedTags.length > 0) ? allowedTags : ['VIP', 'Hot', 'Follow Up', 'Won', 'Cold', 'Warm'];
      return list.map(t => typeof t === 'object' ? t : { name: String(t), archived: false });
    }

    if (catId === 'designations') {
      const defaultList = ['Software Engineer', 'Sales Representative', 'HR Specialist', 'Field Agent', 'Accountant', 'Team Lead'];
      const raw = systemDropdowns.designations || defaultList;
      return raw.map(i => typeof i === 'object' ? i : { name: String(i), archived: false });
    }

    if (catId === 'employment_types') {
      const defaultList = ['Full-Time Permanent', 'Part-Time', 'Contractual', 'Internship', 'Freelance / Consultant'];
      const raw = systemDropdowns.employmentTypes || defaultList;
      return raw.map(i => typeof i === 'object' ? i : { name: String(i), archived: false });
    }

    if (catId === 'genders') {
      const defaultList = ['Male', 'Female', 'Non-Binary', 'Prefer Not to Say'];
      const raw = systemDropdowns.genders || defaultList;
      return raw.map(i => typeof i === 'object' ? i : { name: String(i), archived: false });
    }

    if (catId === 'marital_statuses') {
      const defaultList = ['Single', 'Married', 'Divorced', 'Widowed'];
      const raw = systemDropdowns.maritalStatuses || defaultList;
      return raw.map(i => typeof i === 'object' ? i : { name: String(i), archived: false });
    }

    if (catId === 'blood_groups') {
      const defaultList = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
      const raw = systemDropdowns.bloodGroups || defaultList;
      return raw.map(i => typeof i === 'object' ? i : { name: String(i), archived: false });
    }

    if (catId === 'leave_categories') {
      const raw = systemDropdowns.leaveCategories || [
        { id: 'sick', name: 'Sick Leave', quota: 12 },
        { id: 'casual', name: 'Casual Leave', quota: 12 },
        { id: 'earned', name: 'Earned Leave', quota: 15 },
        { id: 'maternity', name: 'Maternity/Paternity Leave', quota: 90 }
      ];
      return raw.map(i => typeof i === 'object' ? i : { name: String(i), archived: false });
    }

    if (catId === 'expenses') {
      const defaultList = ['Toll Charges', 'Meals (Breakfast/Lunch)', 'Fuel & Mileage', 'Hotel & Lodging', 'Miscellaneous'];
      const raw = systemDropdowns.expenseCategories || defaultList;
      return raw.map(i => typeof i === 'object' ? i : { name: String(i), archived: false });
    }

    if (catId === 'priorities') {
      const defaultList = ['Low', 'Medium', 'High', 'Critical Urgent'];
      const raw = systemDropdowns.taskPriorities || defaultList;
      return raw.map(i => typeof i === 'object' ? i : { name: String(i), archived: false });
    }

    // Default Departments
    const defaultDepts = ['IT & Engineering', 'Sales & Marketing', 'Field Operations', 'HR & Administration', 'Finance & Accounting'];
    const rawDepts = systemDropdowns.departments || defaultDepts;
    return rawDepts.map(i => typeof i === 'object' ? i : { name: String(i), archived: false });
  };

  // Helper to handle Add Option
  const handleAddOption = (catId) => {
    if (!openInputModal) return;

    if (catId === 'crm_stages') {
      openInputModal({
        title: 'Add CRM Pipeline Stage',
        subtitle: 'Enter title for the new sales pipeline stage',
        placeholder: 'e.g. Negotiation / Demo Scheduled',
        onSave: (val) => {
          const trimmed = val.trim();
          const newStage = { id: 'stage_' + Date.now(), title: trimmed, color: '#0d9488' };
          const updatedStages = [...stages, newStage];
          if (setStages) setStages(updatedStages);
          if (setSystemDropdowns) setSystemDropdowns(prev => ({ ...prev, crmStages: updatedStages }));
          try { localStorage.setItem('omnilflow_crm_stages', JSON.stringify(updatedStages)); } catch (e) {}
          if (showToast) showToast(`Added CRM Stage "${trimmed}"`, 'success');
        }
      });
      return;
    }

    if (catId === 'crm_tags') {
      openInputModal({
        title: 'Add CRM Contact Tag',
        subtitle: 'Enter name for the new lead/contact tag',
        placeholder: 'e.g. High Value Lead',
        onSave: (val) => {
          const trimmed = val.trim();
          const updatedTags = [...allowedTags, trimmed];
          if (setAllowedTags) setAllowedTags(updatedTags);
          if (setSystemDropdowns) setSystemDropdowns(prev => ({ ...prev, crmTags: updatedTags }));
          try { localStorage.setItem('omnilflow_crm_tags', JSON.stringify(updatedTags)); } catch (e) {}
          if (showToast) showToast(`Added Tag "${trimmed}"`, 'success');
        }
      });
      return;
    }

    // Generic Category Add Option
    const selectedCatObj = categoriesList.find(c => c.id === catId);
    openInputModal({
      title: `Add New ${selectedCatObj?.label || 'Option'}`,
      subtitle: `Enter title for the new item in ${selectedCatObj?.label || 'category'}`,
      placeholder: 'e.g. New Option Item',
      onSave: (val) => {
        const trimmed = val.trim();
        const items = getCategoryItems(catId);
        const updated = [...items, { name: trimmed, archived: false }];
        const key = selectedCatObj?.key || catId;
        if (setSystemDropdowns) setSystemDropdowns(prev => ({ ...prev, [key]: updated }));
        if (showToast) showToast(`Added "${trimmed}" to ${selectedCatObj?.label}`, 'success');
      }
    });
  };

  const currentCategoryObj = categoriesList.find(c => c.id === selectedDropdownCategory) || categoriesList[0];
  const activeItems = getCategoryItems(selectedDropdownCategory);

  return (
    <div style={{ overflowY: 'auto', flexGrow: 1 }} className="glass-panel system-dropdowns-container">
      {/* Header Banner */}
      <div className="page-header system-dropdowns-header-banner" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="sys-header-icon-box" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(13,148,136,0.15) 0%, rgba(15,118,110,0.25) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(13,148,136,0.2)', flexShrink: 0 }}>
              <Settings size={20} style={{ color: '#0d9488' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 className="page-header-title" style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>System Dropdowns</h1>
                <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.12)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                  13 Categories Active
                </span>
              </div>
              <p className="page-header-subtitle sys-header-sub" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
                Configure global categories, job roles, leave types, CRM pipeline stages, contact tags, and expense types
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary sys-header-save-btn"
            type="button"
            onClick={handleSaveMasterDropdowns}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: '700', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)', cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            Save All Changes
          </button>
        </div>
      </div>

      {/* 2-Column Master Layout Grid */}
      <div className="system-dropdowns-grid">

        {/* LEFT COLUMN: Categories Navigation Panel */}
        <div className="payroll-table-card system-dropdowns-left-panel" style={{ padding: 'var(--space-5)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 className="payroll-table-title" style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Categories</h3>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488', background: 'rgba(13, 148, 136, 0.1)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
              13 Total
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Select a category to manage its options
          </p>

          {/* Quick Search Bar for Categories */}
          <div style={{ marginBottom: '12px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search categories..."
              value={dropdownCategorySearch}
              onChange={e => setDropdownCategorySearch && setDropdownCategorySearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box',
                color: '#0f172a',
                fontWeight: '600'
              }}
            />
          </div>

          {/* Category List */}
          <div className="system-dropdowns-categories-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '460px', overflowY: 'auto', paddingRight: '4px' }}>
            {categoriesList
              .filter(cat => cat.label.toLowerCase().includes((dropdownCategorySearch || '').toLowerCase().trim()))
              .map(cat => {
                const isSelected = selectedDropdownCategory === cat.id;
                const itemsCount = getCategoryItems(cat.id).length;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedDropdownCategory && setSelectedDropdownCategory(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: isSelected ? '700' : '500',
                      textAlign: 'left',
                      border: isSelected ? '1px solid rgba(13,148,136,0.35)' : '1px solid transparent',
                      background: isSelected ? 'rgba(13,148,136,0.08)' : 'transparent',
                      color: isSelected ? '#0d9488' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 6px rgba(13,148,136,0.12)' : 'none'
                    }}
                  >
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.label}</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', background: isSelected ? 'rgba(13,148,136,0.2)' : '#f1f5f9', color: isSelected ? '#0d9488' : '#64748b', padding: '2px 8px', borderRadius: '10px' }}>
                      {itemsCount}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Category Workspace */}
        <div className="payroll-table-card system-dropdowns-right-panel" style={{ padding: 'var(--space-6)', minHeight: '520px', maxHeight: '620px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>

          {selectedDropdownCategory === 'ats_stages' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Recruitment ATS Stages</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Manage candidate evaluation steps & hiring pipeline stages</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddOption('ats_stages')}
                  style={{ fontSize: '13px', padding: '8px 16px', fontWeight: '700', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  + Add Stage
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>#</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>STAGE NAME</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map((stg, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#64748b' }}>#{i + 1}</td>
                        <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f2b26' }}>{stg.emoji || '📋'} {stg.name || stg.title}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(13,148,136,0.1)', color: '#0d9488', padding: '4px 10px', borderRadius: '12px' }}>Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedDropdownCategory === 'custom_engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Custom Category Engine</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Define custom dropdowns & options for special modules</p>
                </div>
              </div>
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Use "+ Add Custom Category" to define personalized option lists.
              </div>
            </div>
          )}

          {/* Standard Renderer for all other 11 categories */}
          {selectedDropdownCategory !== 'ats_stages' && selectedDropdownCategory !== 'custom_engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{currentCategoryObj.label} Options</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Manage dropdown options for {currentCategoryObj.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddOption(selectedDropdownCategory)}
                  style={{ fontSize: '13px', padding: '8px 16px', fontWeight: '700', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)' }}
                >
                  + Add Option
                </button>
              </div>

              <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white' }}>
                <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ width: '60px', padding: '12px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>#</th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>OPTION TITLE</th>
                      <th style={{ width: '120px', padding: '12px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>STATUS</th>
                      <th style={{ textAlign: 'right', width: '200px', padding: '12px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc' }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No Options Configured</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Click "+ Add Option" above to create your first item.</div>
                        </td>
                      </tr>
                    ) : (
                      activeItems.map((item, idx) => {
                        const titleText = typeof item === 'object' ? (item.title || item.name || item.label || item.id) : String(item);
                        const isArchived = typeof item === 'object' ? Boolean(item.archived) : false;

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: isArchived ? '#f8fafc' : 'white' }}>
                            <td style={{ padding: '12px 14px', fontWeight: '800', color: '#64748b' }}>#{idx + 1}</td>
                            <td style={{ padding: '12px 14px', fontWeight: '700', color: isArchived ? '#94a3b8' : '#0f2b26', textDecoration: isArchived ? 'line-through' : 'none' }}>
                              {titleText}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px', background: isArchived ? '#f1f5f9' : 'rgba(13, 148, 136, 0.1)', color: isArchived ? '#64748b' : '#0d9488', border: isArchived ? '1px solid #e2e8f0' : '1px solid rgba(13, 148, 136, 0.2)' }}>
                                {isArchived ? 'Archived' : 'Active'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (openInputModal) {
                                      openInputModal({
                                        title: `Edit ${currentCategoryObj.label} Option`,
                                        subtitle: `Update name for "${titleText}"`,
                                        defaultValue: titleText,
                                        placeholder: 'Option title',
                                        onSave: (val) => {
                                          const newTitle = val.trim();
                                          if (selectedDropdownCategory === 'crm_stages') {
                                            const updated = stages.map((st, i) => i === idx ? { ...st, title: newTitle } : st);
                                            if (setStages) setStages(updated);
                                            if (setSystemDropdowns) setSystemDropdowns(prev => ({ ...prev, crmStages: updated }));
                                          } else if (selectedDropdownCategory === 'crm_tags') {
                                            const updated = allowedTags.map((tg, i) => i === idx ? newTitle : tg);
                                            if (setAllowedTags) setAllowedTags(updated);
                                            if (setSystemDropdowns) setSystemDropdowns(prev => ({ ...prev, crmTags: updated }));
                                          } else {
                                            const updated = activeItems.map((it, i) => i === idx ? (typeof it === 'object' ? { ...it, name: newTitle } : newTitle) : it);
                                            if (setSystemDropdowns) setSystemDropdowns(prev => ({ ...prev, [currentCategoryObj.key]: updated }));
                                          }
                                          if (showToast) showToast(`Updated to "${newTitle}"`, 'success');
                                        }
                                      });
                                    }
                                  }}
                                  style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', cursor: 'pointer' }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedDropdownCategory === 'crm_stages') {
                                      const updated = stages.filter((_, i) => i !== idx);
                                      if (setStages) setStages(updated);
                                      if (setSystemDropdowns) setSystemDropdowns(prev => ({ ...prev, crmStages: updated }));
                                    } else if (selectedDropdownCategory === 'crm_tags') {
                                      const updated = allowedTags.filter((_, i) => i !== idx);
                                      if (setAllowedTags) setAllowedTags(updated);
                                      if (setSystemDropdowns) setSystemDropdowns(prev => ({ ...prev, crmTags: updated }));
                                    } else {
                                      const updated = activeItems.filter((_, i) => i !== idx);
                                      if (setSystemDropdowns) setSystemDropdowns(prev => ({ ...prev, [currentCategoryObj.key]: updated }));
                                    }
                                    if (showToast) showToast(`Deleted "${titleText}"`, 'info');
                                  }}
                                  style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
