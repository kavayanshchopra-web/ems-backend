# 🏍️ Field Employee / Agent User Training Manual (EMS System)

Welcome to the **Field Employee Mobile App Guide**. This manual details how to register attendance shifts, log client visits with signatures, record shift expenses, and handle network disconnects.

---

## 🔑 Key Responsibilities & Flows

### 1. **Clock-In & Clock-Out (Shift Attendance)**
- **What it is:** Record the start and end of your workday with GPS tracking.
- **How to perform:**
  - Go to **`GPS & Field Attendance`** -> Locate the **`Attendance Clock Console`** on the left.
  - Click the green **`Clock In (Start Shift)`** button.
  - Your status changes to `🟢 CLOCKED IN`, and the background GPS tracker starts tracking your mileage.
  - At the end of your shift, return here and click the red **`Clock Out (End Shift)`** button.

---

### 2. **Logging Client Visits & Capturing Signatures**
- **What it is:** Record a client meeting, verifying your coordinates and obtaining client signature proof.
- **How to perform:**
  - At the meeting spot, click **`📸 + Log Client Visit`** (top right of the GPS page).
  - Fill in the **Client / Company Name** and **Meeting Location Address**.
  - Type a brief description of the discussion under **Meeting Notes**.
  - Attach a proof photo of the site if required.
  - **Client Digital Signature Canvas:** Ask the client to sign directly inside the dashed canvas box using their finger (on mobile screens) or mouse pointer. Click `Clear 🧹` if they want to sign again.
  - Ensure the geofence indicator says **`🟢 GEOFENCE VERIFIED`**.
  - Click **`Save Visit`**.

---

### 3. **Logging Daily Shift Expenses & Toll slips**
- **What it is:** Log tolls, breakfasts, lunches, and dinner claims to receive vehicle allowances.
- **How to perform:**
  - Go to the **Odometer & Travel Allowance** panel (left side).
  - Click the blue **`💰 Log Daily Shift Expenses`** button.
  - If you passed a toll booth: Check the **Toll Gate Encountered** checkbox, type the toll amount (₹), and upload the toll slip receipt photo.
  - Enter costs for meals (Breakfast, Lunch, Dinner) and other miscellaneous costs.
  - Review the calculated estimate at the bottom.
  - Click **`⭐ Submit Claim`** to send it to the manager for payout approval.

---

### 4. **Handling Offline Network drops (Offline Cache)**
- **What it is:** Keep tracking your coordinates and visits even when the internet drops.
- **How to perform:**
  - If you lose internet connection, toggle the **`OFFLINE SIMULATION`** switch to **`OFFLINE`**.
  - The app will enter offline cache mode.
  - Keep performing client check-ins. You will see: `📦 Pings stored locally: X points`.
  - Once your internet signal returns, toggle the switch back to **`ONLINE`**.
  - The app will show a **`🔄 Syncing...`** indicator and upload your cached points to the server.
