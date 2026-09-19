# ⚡ VOLTFLOW — Smart EV Microgrid Charging System (160 kVA)

An intelligent Electric Vehicle (EV) microgrid charging management system tailored for **residential complexes** and **commercial buildings**. It orchestrates real-time power balancing between a **160 kVA Transformer**, household/building energy demand, urgent/standard vehicle slots, and **100% free rooftop solar generation** — packaged in a state-of-the-art **Liquid Glass Morphism** user interface with a top **GooeyNav** component.

---

## 🌟 Key Updates & Features Implemented

### 1. Top GooeyNav Navigation Component
- Implemented sticky top header inspired by `@react-bits/GooeyNav-JS-CSS` with smooth SVG gooey filter (`#gooey-filter`) and liquid pill indicator that glides fluidly behind the active navigation item.
- Top header includes branding, GooeyNav links, and user profile switcher.

### 2. 160 kVA Transformer Output & Dynamic Power Balancing
- **Transformer Rating**: **160.0 kVA** (3-Phase 415V microgrid).
- **Dynamic Load Sharing**: Real-time continuous power variation between household/building demand (~60% = 96 kVA base) and EV charging points (40% = 64 kVA base).
- **5-Point Smart Grid Allocation**:
  - Urgent priority vehicles receive maximum equal power shares (with up to 1.3x multiplier).
  - Standard vehicles receive balanced eco-tier supply.
  - When the 5th point is plugged in with an urgent vehicle, allocations adjust dynamically (dropping 2–4% on urgent and 1% on standard), with the deficit covered by rooftop solar.

### 3. Live Power Variation Graph
- Replaced the static block with a **real-time dynamic multi-line spline chart** (`chart-live-power-variation`) showing:
  - **Household / Building Load** (kVA/kW)
  - **EV Charging Points Load** (kW)
  - **Rooftop Solar Output** (kW)
  - Live continuous time-series updating every few seconds with smooth bezier interpolation.

### 4. Dedicated Solar Savings & Green Energy Section
- Prominent 3rd section in the dashboard and history pages showing:
  - **Cumulative Money Saved** (₹ Amount) with green highlight
  - **Total Solar Energy Generated & Dispatched** (kWh)
  - **Carbon Emissions Prevented** ($CO_2$ kg offset)
  - **100% Free Green Tariff Guarantee**

### 5. Signature Green Color `#53854C`
- Applied the specific green tone `#53854C` (RGB: `83, 133, 76`) across all panels, badges, chart curves, progress bars, and glowing status indicators.

---

## 🚀 How to Run the Project

1. Open `index.html` in any modern web browser:
   ```
   c:\Users\AJAY SANTHOSH\OneDrive\Desktop\EV SYSTEM\index.html
   ```
2. Or serve it locally with any server:
   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```
3. Visit `http://localhost:8080` in your browser.

---

## 📂 Project Architecture

```
EV SYSTEM/
├── index.html              # Top GooeyNav SPA Shell with SVG Filters
├── README.md               # Complete System Documentation
├── css/
│   ├── variables.css       # Design tokens & #53854C green palette
│   ├── glass.css           # Liquid glass morphism & specular reflections
│   ├── layout.css          # Top GooeyNav header & responsive grid
│   ├── components.css      # Buttons, inputs, circular gauges, modals
│   └── animations.css      # Shimmers, pulses, charging arcs, CSS particles
└── js/
    ├── db.js               # IndexedDB 9-store database & JSON exporter
    ├── power-engine.js     # 160 kVA dynamic load balancer & time-series
    ├── utils.js            # Formatting (kVA, kW, ₹), validation, toasts
    ├── dashboard.js        # 160 kVA dashboard, live variation graph & solar section
    ├── registration.js     # Multi-vehicle pre-registration with phone validation
    ├── booking.js          # 5-point grid booking & battery swapping
    ├── user-dashboard.js   # Live charging gauge & solar savings counter
    ├── history.js          # Historical logs with solar savings & CSV exporter
    ├── payment.js          # Payment settlement modal with green credits
    └── app.js              # Router, state manager & GooeyNav animator
```
