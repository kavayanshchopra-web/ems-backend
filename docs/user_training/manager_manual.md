# 💼 Manager User Training Manual (EMS System)

Welcome to the **Manager Portal Control Manual**. As a manager, you supervise field agents, assign client visit beat plans, filter/sort employee directories, and monitor live tracking telemetry alerts.

---

## 🔑 Key Responsibilities & Flows

### 1. **Planning & Dispatching Beat Routes**
- **What it is:** Assign a sequence of target client checkpoints for a field employee to visit today.
- **How to perform:**
  - Go to **`GPS & Field Attendance`** -> Select the employee from the dropdown.
  - In their details card, click the blue **`🗺️ Plan Beat Route`** button.
  - An interactive modal will pop up.
  - **Option A (Custom):** Type a custom landmark name, latitude, and longitude, then click **`➕ Add Checkpoint`**.
  - **Option B (Fast):** Click any of the **`⚡ QUICK LANDMARK SHORTCUTS`** (e.g. *Noida Sec 62*, *Lajpat Nagar*, *Cyber City*) to instantly fill in standard coordinate inputs, then click **`➕ Add Checkpoint`**.
  - Review the sequence under **`📋 ACTIVE SEQUENCE PATH`** (you can click `Remove` to delete points).
  - Click **`💾 Dispatch Route to Field Agent`**.
  - **What happens next:** The map instantly updates to draw blue numbered checkpoints (`⭐1`, `⭐2`) and optimized dotted routing paths. The timeline on the agent's log also updates automatically.

---

### 2. **Filtering, Sorting & Paging the Employees Directory**
- **What it is:** Search team records, sort profiles dynamically, and navigate grid pagination pages.
- **How to perform:**
  - Open the **`All Employees`** tab from the left sidebar navigation menu.
  - **Filter Search:** Type in the search input box (e.g. *Sales*, *Amit*) to filter profiles in real-time.
  - **Column Sorting:** Click sorting buttons: **`Name`**, **`Salary`**, or **`Department`** to toggle ascending or descending sorting order.
  - **Pagination Navigation:** Click page buttons **`[1]`**, **`[2]`**, or **`Prev` / `Next`** at the bottom to transition between pages seamlessly.

---

### 3. **Monitoring Field Telemetry & Safety Alerts**
- **What it is:** Keep track of excessive stops, battery outages, or safety speeding issues.
- **How to monitor:**
  - Review employee cards in the live feed.
  - **Speeding Warning:** If an agent exceeds 50 km/h, a red alert banner: `🚨 SPEED LIMIT VIOLATION ALERT: Agent traveling at X km/h` will display. Instruct them to slow down.
  - **Low Battery Indicator:** If an agent's device drops below 60%, an amber warning: `🔋 LOW BATTERY ALERT` displays. The system automatically shifts ping intervals to `⏱️ 5 Mins` to save power.
  - **Idle Stoppage warning:** If an agent stops at an unscheduled location for more than 30 minutes, a yellow warning: `⚠️ EXCESSIVE IDLE DETECTED` displays.

---

## 🌐 New Global Utilities & Shortcuts

### 4. **Language Selector (English / Hindi / Hinglish)**
- **How to perform:**
  - In the top header panel, locate the **`🌐 LANG`** dropdown box.
  - Swap languages dynamically (e.g., choose **हिंदी** or **Hinglish**). All sidebar links and menus will instantly translate to keep navigation intuitive for local staff.

### 5. **Global Search Console (Ctrl + K)**
- **How to perform:**
  - Press **`Ctrl + K`** (or `Cmd + K` on Mac) or click the search box in the top-header.
  - An search overlay modal will display. Type the query (e.g., "Amit", "Noida", "Audit").
  - Click on the search item to go directly to the target tab.
  - Press **`Esc`** at any time to instantly close this overlay or any other modal dialog boxes.
