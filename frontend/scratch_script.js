const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'DashboardShell.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = "{/* 25. SYSTEM DROPDOWNS CONFIG - 2-COLUMN MASTER LAYOUT */}";
const endMarker = "{/* 26. RECYCLE BIN VAULT & SOFT DELETE RECOVERY */}";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found!", { startIndex, endIndex });
  process.exit(1);
}

const replacement = `{/* 25. SYSTEM DROPDOWNS CONFIG - 2-COLUMN MASTER LAYOUT */}
        {activeTab === 'system_dropdowns' && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#0d9488', fontWeight: 'bold' }}>⏳ Loading System Dropdowns...</div>}>
            <DropdownsPage
              handleSaveMasterDropdowns={handleSaveMasterDropdowns}
              dropdownCategorySearch={dropdownCategorySearch}
              setDropdownCategorySearch={setDropdownCategorySearch}
              systemDropdowns={systemDropdowns}
              setSystemDropdowns={setSystemDropdowns}
              selectedDropdownCategory={selectedDropdownCategory}
              setSelectedDropdownCategory={setSelectedDropdownCategory}
              dropdownSortConfig={dropdownSortConfig}
              setDropdownSortConfig={setDropdownSortConfig}
              openInputModal={openInputModal}
              showToast={showToast}
              softDeleteRecord={softDeleteRecord}
              atsCandidates={atsCandidates}
              stages={stages}
              setStages={setStages}
              allowedTags={allowedTags}
              setAllowedTags={setAllowedTags}
            />
          </Suspense>
        )}

        `;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully extracted system_dropdowns block into lazy loaded DropdownsPage!");
