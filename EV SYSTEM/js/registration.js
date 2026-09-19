/* ============================================
   REGISTRATION — User & Multi-Vehicle Registration
   ============================================ */

/* ── EV Vehicle Database (from spreadsheet) ── */
const EV_VEHICLE_DB = {
  cars: {
    'Tata': [
      { model: 'Tiago EV', battery: '19.2 / 24.0', batteryDefault: 24.0, dcCharging: '~57 min via DC Fast Charger' },
      { model: 'Punch EV', battery: '25 / 30 / 40', batteryDefault: 35.0, dcCharging: '~26–56 min' },
      { model: 'Nexon EV', battery: '30 / 45', batteryDefault: 45.0, dcCharging: '~40 min (45 kWh Long Range)' },
      { model: 'Curvv.ev', battery: '45 / 55', batteryDefault: 55.0, dcCharging: '~40 min' }
    ],
    'Mahindra': [
      { model: 'BE 6', battery: '59 / 70 / 79', batteryDefault: 79.0, dcCharging: '~20–25 min (up to 175 kW)' },
      { model: 'XEV 9e', battery: '59 / 70 / 79', batteryDefault: 79.0, dcCharging: '~20 min (up to 175 kW)' }
    ],
    'Maruti Suzuki': [
      { model: 'e Vitara', battery: '49 / 61', batteryDefault: 61.0, dcCharging: '~39–58 min' }
    ],
    'MG': [
      { model: 'Comet EV', battery: '17.3', batteryDefault: 17.3, dcCharging: 'AC only (No DC fast charging)' },
      { model: 'Windsor EV', battery: '38 / 52.9', batteryDefault: 52.9, dcCharging: '~45–50 min (~50 kW DC)' },
      { model: 'ZS EV', battery: '50.3', batteryDefault: 50.3, dcCharging: '~60 min (~50 kW DC)' }
    ],
    'Hyundai': [
      { model: 'Creta Electric', battery: '42 / 51.4', batteryDefault: 51.4, dcCharging: '~58 min (~50 kW DC)' },
      { model: 'Ioniq 5', battery: '72.6', batteryDefault: 72.6, dcCharging: '~18 min (800V, up to 350 kW)' }
    ],
    'BYD': [
      { model: 'Atto 3', battery: '49.92 / 60.48', batteryDefault: 60.48, dcCharging: '~50 min (~80 kW DC)' },
      { model: 'Seal', battery: '61.44 / 82.56', batteryDefault: 82.56, dcCharging: '~30 min (up to 150 kW)' }
    ]
  },
  bikes: {
    'Raptee.HV': [
      { model: 'T30', battery: '5.4', batteryDefault: 5.4, dcCharging: 'CCS2 DC Fast Charging (20–80% ~36 min)' }
    ],
    'Ultraviolette': [
      { model: 'F77 Mach 2', battery: '7.1 / 10.3', batteryDefault: 10.3, dcCharging: 'AC + Fast-charging support' },
      { model: 'X47 Crossover', battery: '7.1 / 10.3', batteryDefault: 10.3, dcCharging: 'AC + Fast-charging support' }
    ],
    'Matter': [
      { model: 'Aera', battery: '5.0', batteryDefault: 5.0, dcCharging: 'Liquid-cooled; AC + fast-charging' }
    ],
    'Revolt': [
      { model: 'RV400', battery: '3.24', batteryDefault: 3.24, dcCharging: 'Swappable battery + AC Charging' },
      { model: 'RVX', battery: '3.24', batteryDefault: 3.24, dcCharging: 'Swappable battery + AC Charging' }
    ],
    'Oben': [
      { model: 'Rorr', battery: '4.4', batteryDefault: 4.4, dcCharging: 'AC + Fast-charging support' },
      { model: 'Rorr EZ', battery: '2.6', batteryDefault: 2.6, dcCharging: 'AC + Fast-charging support' },
      { model: 'Evo', battery: '4.4', batteryDefault: 4.4, dcCharging: 'AC + Fast-charging support' }
    ]
  },
  scooters: {
    'TVS': [
      { model: 'Orbiter V1', battery: '1.8', batteryDefault: 1.8, dcCharging: 'AC 650W charger (0–80% ~4h)' },
      { model: 'Orbiter V2', battery: '3.1', batteryDefault: 3.1, dcCharging: 'AC 650W charger (0–80% ~4h)' },
      { model: 'iQube S', battery: '2.2', batteryDefault: 2.2, dcCharging: 'AC Home Charging' },
      { model: 'iQube ST', battery: '3.4', batteryDefault: 3.4, dcCharging: 'AC Home Charging' },
      { model: 'iQube ST X', battery: '5.1', batteryDefault: 5.1, dcCharging: 'AC Home Charging' }
    ],
    'Hero': [
      { model: 'Vida V1 Plus', battery: '3.44', batteryDefault: 3.44, dcCharging: 'AC + Ather Grid (~1.2 km/min)' },
      { model: 'Vida V1 Pro', battery: '3.94', batteryDefault: 3.94, dcCharging: 'AC + Ather Grid (~1.2 km/min)' },
      { model: 'Vida V2', battery: '3.3', batteryDefault: 3.3, dcCharging: 'AC + Public Fast Charging' }
    ],
    'Ather': [
      { model: '450X', battery: '3.7', batteryDefault: 3.7, dcCharging: 'AC + Ather Grid Fast Charging' },
      { model: '450 Apex', battery: '3.7', batteryDefault: 3.7, dcCharging: 'AC + Ather Grid Fast Charging' },
      { model: 'Rizta', battery: '2.9', batteryDefault: 2.9, dcCharging: 'AC + Ather Grid Fast Charging' },
      { model: 'Rizta Z', battery: '3.7', batteryDefault: 3.7, dcCharging: 'AC + Ather Grid Fast Charging' }
    ],
    'Bajaj': [
      { model: 'Chetak 2901', battery: '2.5', batteryDefault: 2.5, dcCharging: 'AC Portable Charger' },
      { model: 'Chetak 3201', battery: '3.0', batteryDefault: 3.0, dcCharging: 'AC Portable Charger' },
      { model: 'Chetak C3501', battery: '3.2', batteryDefault: 3.2, dcCharging: 'AC Portable Charger' }
    ],
    'Ola Electric': [
      { model: 'S1 Pro', battery: '3.97', batteryDefault: 3.97, dcCharging: 'AC + Ola Hypercharging' },
      { model: 'S1 Air', battery: '2.5', batteryDefault: 2.5, dcCharging: 'AC + Ola Hypercharging' },
      { model: 'S1 X', battery: '2.0', batteryDefault: 2.0, dcCharging: 'AC + Ola Hypercharging' },
      { model: 'S1 Z', battery: '5.3', batteryDefault: 5.3, dcCharging: 'AC + Ola Hypercharging' },
      { model: 'Roadster X', battery: '2.5', batteryDefault: 2.5, dcCharging: 'AC + Fast-charging' },
      { model: 'Roadster', battery: '6.0', batteryDefault: 6.0, dcCharging: 'AC + Fast-charging' },
      { model: 'Roadster Pro', battery: '16.0', batteryDefault: 16.0, dcCharging: 'AC + Fast-charging' }
    ],
    'Simple Energy': [
      { model: 'Simple One', battery: '5.0', batteryDefault: 5.0, dcCharging: 'AC + Fast-charging' }
    ]
  }
};

/* Helper: get brands for a vehicle type */
function getEVBrands(vehicleType) {
  const typeMap = { car: 'cars', bike: 'bikes', scooter: 'scooters', bicycle: null };
  const key = typeMap[vehicleType];
  if (!key || !EV_VEHICLE_DB[key]) return [];
  return Object.keys(EV_VEHICLE_DB[key]).sort();
}

/* Helper: get models for a brand under a vehicle type */
function getEVModels(vehicleType, brand) {
  const typeMap = { car: 'cars', bike: 'bikes', scooter: 'scooters', bicycle: null };
  const key = typeMap[vehicleType];
  if (!key || !EV_VEHICLE_DB[key] || !EV_VEHICLE_DB[key][brand]) return [];
  return EV_VEHICLE_DB[key][brand];
}

const RegistrationPage = {
  vehicleCount: 1,

  async render() {
    const container = document.getElementById('page-registration');
    const users = await db.getAll('users');
    const currentUser = await App.getCurrentUser();

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">📝 User & Vehicle Registration</h1>
        <p class="page-subtitle">Register new accounts or add multiple vehicles to a single user account</p>
      </div>

      <div class="grid-2">
        <!-- Registration Form -->
        <div class="glass-panel-elevated" style="padding: var(--space-xl)">
          <div class="flex justify-between items-center mb-lg">
            <h3 class="section-title">Vehicle Registration Form</h3>
            <span class="tag tag-green" style="background: rgba(83, 133, 76, 0.2); color: #69a760;">
              Multi-Vehicle Support
            </span>
          </div>

          <form id="registration-form" onsubmit="RegistrationPage.handleSubmit(event)">
            <!-- User Details -->
            <div class="form-group">
              <label class="form-label">Full Name <span class="required">*</span></label>
              <input type="text" class="glass-input" id="reg-name" placeholder="Enter full name" value="${currentUser ? currentUser.name : ''}" required>
              <span class="form-error">Please enter a valid name</span>
            </div>

            <div class="input-row">
              <div class="form-group">
                <label class="form-label">Phone Number <span class="required">*</span></label>
                <input type="tel" class="glass-input" id="reg-phone" placeholder="10-digit mobile" value="${currentUser ? currentUser.phone : ''}" required>
                <span class="text-xs text-secondary mt-xs">Entering existing phone will add vehicles to that account</span>
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="glass-input" id="reg-email" placeholder="email@example.com" value="${currentUser ? currentUser.email || '' : ''}">
              </div>
            </div>

            <div class="separator"></div>

            <!-- Vehicle Details -->
            <div class="section-header">
              <div>
                <h3 class="section-title">Vehicle Information</h3>
                <p class="text-xs text-secondary">You can add multiple cars, bikes, or e-bicycles at once</p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="RegistrationPage.addVehicleSlot()">
                + Add Another Vehicle
              </button>
            </div>

            <div id="vehicle-slots">
              ${this.renderVehicleSlot(1)}
            </div>

            <div class="separator"></div>

            <button type="submit" class="btn btn-primary btn-lg" style="width:100%; background: linear-gradient(135deg, #53854C, #00d4ff);">
              ✓ Save User & Vehicles to Account
            </button>
          </form>
        </div>

        <!-- Registered Accounts & Vehicles List -->
        <div class="glass-panel-elevated" style="padding: var(--space-xl)">
          <div class="section-header">
            <div>
              <h3 class="section-title">Registered Accounts</h3>
              <p class="text-xs text-secondary">Switch active user or view account fleet</p>
            </div>
            <span class="tag tag-cyan">${users.length} Accounts</span>
          </div>

          ${users.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">👤</div>
              <div class="empty-title">No registrations yet</div>
              <div class="empty-description">Register an account to get started with EV microgrid charging</div>
            </div>
          ` : `
            <div style="max-height: 540px; overflow-y: auto;" class="stagger-list">
              ${await this.renderUserList(users)}
            </div>
          `}
        </div>
      </div>
    `;

    this.vehicleCount = 1;
  },

  renderVehicleSlot(index) {
    return `
      <div class="vehicle-slot mb-lg" id="vehicle-slot-${index}" data-index="${index}" style="background: rgba(255, 255, 255, 0.02); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--glass-border);">
        <div class="flex justify-between items-center mb-md">
          <span class="text-sm font-semibold" style="color: #69a760;">Vehicle #${index}</span>
          ${index > 1 ? `<button type="button" class="btn btn-danger btn-sm" onclick="RegistrationPage.removeVehicleSlot(${index})">✕ Remove</button>` : ''}
        </div>

        <!-- Vehicle Type Selector -->
        <div class="form-group">
          <label class="form-label">Vehicle Category <span class="required">*</span></label>
          <div class="vehicle-type-selector">
            <div class="vehicle-type-option" data-type="car" onclick="RegistrationPage.selectVehicleType(${index}, 'car', this)">
              <div class="type-icon">🚗</div>
              <div class="type-name">Car (AC/DC)</div>
            </div>
            <div class="vehicle-type-option" data-type="bike" onclick="RegistrationPage.selectVehicleType(${index}, 'bike', this)">
              <div class="type-icon">🏍️</div>
              <div class="type-name">E-Bike</div>
            </div>
            <div class="vehicle-type-option" data-type="scooter" onclick="RegistrationPage.selectVehicleType(${index}, 'scooter', this)">
              <div class="type-icon">🛵</div>
              <div class="type-name">E-Scooter</div>
            </div>
            <div class="vehicle-type-option" data-type="bicycle" onclick="RegistrationPage.selectVehicleType(${index}, 'bicycle', this)">
              <div class="type-icon">🚲</div>
              <div class="type-name">E-Bicycle</div>
            </div>
          </div>
          <input type="hidden" id="reg-vehicle-type-${index}" required>
        </div>

        <!-- Brand & Model Dropdowns (cascading) -->
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">Make / Brand</label>
            <div class="ev-dropdown-wrap" id="brand-wrap-${index}">
              <select class="glass-input ev-select" id="reg-vehicle-make-${index}" onchange="RegistrationPage.onBrandChange(${index})" disabled>
                <option value="">— Select category first —</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Model</label>
            <div class="ev-dropdown-wrap" id="model-wrap-${index}">
              <select class="glass-input ev-select" id="reg-vehicle-model-${index}" onchange="RegistrationPage.onModelChange(${index})" disabled>
                <option value="">— Select brand first —</option>
              </select>
            </div>
          </div>
        </div>

        <!-- DC Charging Info (auto-populated) -->
        <div class="ev-charging-info hidden" id="ev-charging-info-${index}"></div>

        <div class="input-row">
          <div class="form-group">
            <label class="form-label">Battery Capacity (kWh)</label>
            <input type="number" class="glass-input" id="reg-vehicle-battery-${index}" placeholder="Auto-filled on model select" step="0.1" min="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Registration Plate Number</label>
            <input type="text" class="glass-input" id="reg-vehicle-number-${index}" placeholder="e.g., KA01EV1234">
          </div>
        </div>

        <!-- Battery Exchange Option (for 2-wheelers) -->
        <div class="battery-exchange-option hidden" id="battery-exchange-${index}">
          <div class="glass-card" style="background: rgba(255, 184, 0, 0.05); border-color: rgba(255, 184, 0, 0.2);">
            <div class="toggle-wrapper">
              <label class="toggle">
                <input type="checkbox" id="reg-battery-exchange-${index}">
                <span class="toggle-track"></span>
                <span class="toggle-thumb"></span>
              </label>
              <div>
                <div class="toggle-label" style="color: var(--color-accent-amber)">🔋 Battery Exchange / Swap Eligible</div>
                <div class="text-xs text-secondary">Enables 2-minute quick battery replacement service</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /* ── Cascading Dropdown Logic ── */

  selectVehicleType(index, type, element) {
    const container = element.parentElement;
    container.querySelectorAll('.vehicle-type-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');

    document.getElementById(`reg-vehicle-type-${index}`).value = type;

    // Populate brand dropdown
    const brandSelect = document.getElementById(`reg-vehicle-make-${index}`);
    const brands = getEVBrands(type);

    if (brands.length > 0) {
      brandSelect.innerHTML = `<option value="">— Select Brand —</option>` +
        brands.map(b => `<option value="${b}">${b}</option>`).join('');
      brandSelect.disabled = false;
    } else {
      // Bicycle or unknown — allow free text
      brandSelect.innerHTML = `<option value="">— No brands in database —</option>`;
      brandSelect.disabled = true;
    }

    // Reset model dropdown
    const modelSelect = document.getElementById(`reg-vehicle-model-${index}`);
    modelSelect.innerHTML = `<option value="">— Select brand first —</option>`;
    modelSelect.disabled = true;

    // Hide charging info
    const infoDiv = document.getElementById(`ev-charging-info-${index}`);
    infoDiv.classList.add('hidden');

    // Set default battery
    const batteryInput = document.getElementById(`reg-vehicle-battery-${index}`);
    batteryInput.value = Utils.getBatteryCapacity(type);

    // Battery exchange
    const exchangeDiv = document.getElementById(`battery-exchange-${index}`);
    if (Utils.isBatteryExchangeEligible(type)) {
      exchangeDiv.classList.remove('hidden');
    } else {
      exchangeDiv.classList.add('hidden');
    }
  },

  onBrandChange(index) {
    const type = document.getElementById(`reg-vehicle-type-${index}`).value;
    const brand = document.getElementById(`reg-vehicle-make-${index}`).value;
    const modelSelect = document.getElementById(`reg-vehicle-model-${index}`);
    const infoDiv = document.getElementById(`ev-charging-info-${index}`);

    if (!brand) {
      modelSelect.innerHTML = `<option value="">— Select brand first —</option>`;
      modelSelect.disabled = true;
      infoDiv.classList.add('hidden');
      return;
    }

    const models = getEVModels(type, brand);
    modelSelect.innerHTML = `<option value="">— Select Model —</option>` +
      models.map(m => `<option value="${m.model}" data-battery="${m.batteryDefault}" data-dc="${m.dcCharging}" data-options="${m.battery}">${m.model} (${m.battery} kWh)</option>`).join('');
    modelSelect.disabled = false;
    infoDiv.classList.add('hidden');
  },

  onModelChange(index) {
    const modelSelect = document.getElementById(`reg-vehicle-model-${index}`);
    const selected = modelSelect.options[modelSelect.selectedIndex];

    if (!selected || !selected.value) return;

    const batteryDefault = parseFloat(selected.dataset.battery);
    const dcInfo = selected.dataset.dc;
    const batteryOptions = selected.dataset.options;

    // Auto-fill battery
    const batteryInput = document.getElementById(`reg-vehicle-battery-${index}`);
    batteryInput.value = batteryDefault;

    // Show charging info card
    const infoDiv = document.getElementById(`ev-charging-info-${index}`);
    infoDiv.innerHTML = `
      <div class="glass-card" style="background: rgba(0, 212, 255, 0.04); border-color: rgba(0, 212, 255, 0.2); padding: 12px; margin-top: 8px;">
        <div class="flex items-center gap-sm mb-xs">
          <span style="color: var(--color-accent-cyan); font-weight: 600; font-size: 0.8rem;">⚡ Charging Specs</span>
        </div>
        <div class="text-xs" style="color: var(--text-secondary); line-height: 1.6;">
          <div><strong>Battery Options:</strong> ${batteryOptions} kWh</div>
          <div><strong>DC Fast Charging:</strong> ${dcInfo}</div>
        </div>
      </div>
    `;
    infoDiv.classList.remove('hidden');
  },

  async renderUserList(users) {
    let html = '';
    const currentUserId = window.currentUserId || localStorage.getItem('currentUserId');

    for (const user of users.reverse()) {
      const vehicles = await db.getUserVehicles(user.id);
      const isCurrent = currentUserId === user.id;

      html += `
        <div class="glass-card mb-md" style="border: 1px solid ${isCurrent ? '#53854C' : 'var(--glass-border)'}; background: ${isCurrent ? 'rgba(83, 133, 76, 0.06)' : 'var(--glass-bg)'};">
          <div class="flex justify-between items-center mb-sm">
            <div class="flex items-center gap-md">
              <div class="avatar" style="background: ${isCurrent ? '#53854C' : 'var(--gradient-secondary)'}">${user.name.charAt(0).toUpperCase()}</div>
              <div>
                <div class="font-semibold text-sm">
                  ${user.name} 
                  ${isCurrent ? '<span class="tag tag-green" style="font-size: 0.65rem; padding: 1px 6px; margin-left: 4px;">Active User</span>' : ''}
                </div>
                <div class="text-xs text-secondary">📱 ${user.phone} ${user.email ? '• ' + user.email : ''}</div>
              </div>
            </div>
            <div class="flex gap-sm">
              <button class="btn ${isCurrent ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="RegistrationPage.loginAsUser('${user.id}')">
                ${isCurrent ? '✓ Active' : 'Login'}
              </button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="RegistrationPage.deleteUser('${user.id}')" title="Delete user">
                🗑
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between flex-wrap gap-xs mt-sm">
            <div class="flex gap-xs flex-wrap">
              ${vehicles.map(v => `
                <span class="tag" style="background: rgba(0, 212, 255, 0.12); color: var(--color-accent-cyan); font-size: 0.75rem;">
                  ${Utils.getVehicleIcon(v.type)} ${v.make || ''} ${v.model || v.type} (${v.batteryCapacity} kWh)
                </span>
              `).join('')}
            </div>
            <button class="btn btn-ghost btn-sm text-xs" style="color: #69a760;" onclick="RegistrationPage.quickAddVehicleFor('${user.id}', '${user.name}', '${user.phone}')">
              + Add Vehicle
            </button>
          </div>
          <div class="text-xs text-secondary mt-xs">Registered: ${Utils.formatDate(user.createdAt)} • Total: ${vehicles.length} Vehicle(s)</div>
        </div>
      `;
    }
    return html;
  },

  quickAddVehicleFor(userId, name, phone) {
    document.getElementById('reg-name').value = name;
    document.getElementById('reg-phone').value = phone;
    window.currentUserId = userId;
    localStorage.setItem('currentUserId', userId);
    Utils.showToast(`Selected account of ${name}. Fill vehicle details to add vehicle.`, 'info');
  },

  addVehicleSlot() {
    this.vehicleCount++;
    const slotsContainer = document.getElementById('vehicle-slots');
    const newSlot = document.createElement('div');
    newSlot.innerHTML = this.renderVehicleSlot(this.vehicleCount);
    slotsContainer.appendChild(newSlot.firstElementChild);
  },

  removeVehicleSlot(index) {
    const slot = document.getElementById(`vehicle-slot-${index}`);
    if (slot) slot.remove();
  },

  async handleSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();

    if (!Utils.validateRequired(name)) {
      Utils.showToast('Please enter a valid name', 'error');
      return;
    }

    if (!Utils.validatePhone(phone)) {
      Utils.showToast('Please enter a valid 10-digit phone number', 'error');
      return;
    }

    // Check if user already exists
    let existingUser = await db.getUserByPhone(phone);
    let userId = existingUser ? existingUser.id : db.generateId();

    if (!existingUser) {
      const user = {
        id: userId,
        name,
        phone,
        email,
        createdAt: new Date().toISOString()
      };
      await db.add('users', user);
    } else {
      // Update name or email if edited
      existingUser.name = name;
      if (email) existingUser.email = email;
      await db.put('users', existingUser);
    }

    // Process & add all vehicles to this userId
    const vehicleSlots = document.querySelectorAll('.vehicle-slot');
    let addedCount = 0;

    for (const slot of vehicleSlots) {
      const index = slot.dataset.index;
      const type = document.getElementById(`reg-vehicle-type-${index}`)?.value;

      if (!type) {
        continue;
      }

      // Get values from selects (or fallback to text value for backward compat)
      const makeEl = document.getElementById(`reg-vehicle-make-${index}`);
      const modelEl = document.getElementById(`reg-vehicle-model-${index}`);

      const vehicle = {
        id: db.generateId(),
        userId,
        type,
        make: makeEl?.value?.trim() || '',
        model: modelEl?.value?.trim() || '',
        batteryCapacity: parseFloat(document.getElementById(`reg-vehicle-battery-${index}`)?.value) || Utils.getBatteryCapacity(type),
        registrationNumber: document.getElementById(`reg-vehicle-number-${index}`)?.value.trim() || '',
        batteryExchangeEligible: document.getElementById(`reg-battery-exchange-${index}`)?.checked || false,
        createdAt: new Date().toISOString()
      };

      await db.add('vehicles', vehicle);
      addedCount++;
    }

    if (addedCount === 0) {
      Utils.showToast('Please select at least one vehicle type to register', 'warning');
      return;
    }

    Utils.showToast(
      existingUser 
        ? `${addedCount} Vehicle(s) added to account of ${name}!` 
        : `Account for ${name} created with ${addedCount} vehicle(s)!`, 
      'success'
    );

    // Set active user
    window.currentUserId = userId;
    localStorage.setItem('currentUserId', userId);

    App.updateCurrentUser();
    await this.render();
  },

  async loginAsUser(userId) {
    window.currentUserId = userId;
    localStorage.setItem('currentUserId', userId);
    const user = await db.get('users', userId);
    Utils.showToast(`Logged in as ${user.name}`, 'success');
    App.updateCurrentUser();
    await this.render();
  },

  async deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user and all their vehicles?')) return;

    const vehicles = await db.getUserVehicles(userId);
    for (const v of vehicles) {
      await db.delete('vehicles', v.id);
    }

    const bookings = await db.getUserBookings(userId);
    for (const b of bookings) {
      await db.delete('bookings', b.id);
    }

    const sessions = await db.getUserSessions(userId);
    for (const s of sessions) {
      await db.delete('sessions', s.id);
    }

    await db.delete('users', userId);

    if (window.currentUserId === userId) {
      window.currentUserId = null;
      localStorage.removeItem('currentUserId');
    }

    Utils.showToast('User and vehicles deleted', 'info');
    App.updateCurrentUser();
    await this.render();
  }
};
