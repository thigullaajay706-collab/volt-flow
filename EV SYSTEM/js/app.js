/* ============================================
   APP CONTROLLER & SPA ROUTER
   ============================================ */

const App = {
  currentUser: null,
  currentRoute: 'dashboard',

  async init() {
    console.log('⚡ Initializing EV Smart Charging System...');
    
    // Initialize Database & Seed
    await db.init();
    await db.seedInitialData();

    // Check if initial scenario demo seed is needed (3 urgent + 1 standard to match user prompt)
    await this.checkAndSeedPromptScenario();

    // Load active user
    await this.loadActiveUser();

    // Setup Hash Routing
    window.addEventListener('hashchange', () => this.handleRouting());
    
    // Initial Route
    this.handleRouting();

    // Update UI Elements
    this.updateCurrentUser();

    console.log('✅ EV Smart Charging System Ready');
  },

  async checkAndSeedPromptScenario() {
    const existingUsers = await db.getAll('users');
    if (existingUsers.length > 0) return; // already seeded

    console.log('🌱 Seeding scenario from prompt (3 urgent vehicles + 1 standard vehicle on 5 points)...');

    // Create 4 users with vehicles
    const sampleUsers = [
      { name: 'Dr. Arjun Verma', phone: '9876543210', email: 'arjun@hospital.org', vehicle: { type: 'car', make: 'Tata', model: 'Nexon EV Max', battery: 40.5, urgent: true } },
      { name: 'Priya Sundaram', phone: '9845012345', email: 'priya@techcorp.in', vehicle: { type: 'car', make: 'MG', model: 'ZS EV', battery: 50.3, urgent: true } },
      { name: 'Vikram Mehta', phone: '9765432109', email: 'vikram@logistics.com', vehicle: { type: 'car', make: 'Mahindra', model: 'XUV400', battery: 39.4, urgent: true } },
      { name: 'Kavita Nair', phone: '9123456780', email: 'kavita@residence.net', vehicle: { type: 'scooter', make: 'Ather', model: '450X Gen 3', battery: 3.7, urgent: false } }
    ];

    const allPoints = await db.getAll('charging_points');

    for (let i = 0; i < sampleUsers.length; i++) {
      const uData = sampleUsers[i];
      const userId = `usr-${i + 1}`;
      const vehicleId = `veh-${i + 1}`;
      const point = allPoints[i];

      // User
      await db.put('users', {
        id: userId,
        name: uData.name,
        phone: uData.phone,
        email: uData.email,
        createdAt: new Date().toISOString()
      });

      // Vehicle
      await db.put('vehicles', {
        id: vehicleId,
        userId: userId,
        type: uData.vehicle.type,
        make: uData.vehicle.make,
        model: uData.vehicle.model,
        batteryCapacity: uData.vehicle.battery,
        registrationNumber: `KA01EV${1000 + i}`,
        batteryExchangeEligible: uData.vehicle.type !== 'car',
        createdAt: new Date().toISOString()
      });

      // Booking
      const bookingId = `book-${i + 1}`;
      const now = new Date();
      const dep = new Date(now.getTime() + (uData.vehicle.urgent ? 45 : 90) * 60 * 1000);

      await db.put('bookings', {
        id: bookingId,
        userId: userId,
        vehicleId: vehicleId,
        pointId: point.id,
        isUrgent: uData.vehicle.urgent,
        isBatteryExchange: false,
        currentChargePct: 25,
        targetChargePct: 100,
        arrivalTime: now.toISOString(),
        departureTime: dep.toISOString(),
        status: 'active',
        createdAt: now.toISOString()
      });

      // Session
      const reqEnergy = ((100 - 25) / 100) * uData.vehicle.battery;
      const solEnergy = reqEnergy * 0.25;
      const cost = (reqEnergy - solEnergy) * 8;

      await db.put('sessions', {
        id: `sess-${i + 1}`,
        bookingId: bookingId,
        userId: userId,
        vehicleId: vehicleId,
        pointId: point.id,
        startTime: now.toISOString(),
        endTime: dep.toISOString(),
        isUrgent: uData.vehicle.urgent,
        isBatteryExchange: false,
        currentChargePct: 25,
        targetChargePct: 100,
        batteryCapacityKWh: uData.vehicle.battery,
        energyConsumed: reqEnergy,
        solarEnergy: solEnergy,
        cost: reqEnergy * 8,
        solarSavings: solEnergy * 8,
        finalAmount: cost,
        status: 'active',
        createdAt: now.toISOString()
      });

      // Update point
      point.status = 'occupied';
      point.currentVehicleId = vehicleId;
      point.currentBookingId = bookingId;
      await db.put('charging_points', point);
    }

    // Default active user is Dr. Arjun Verma
    window.currentUserId = 'usr-1';
    localStorage.setItem('currentUserId', 'usr-1');
  },

  async loadActiveUser() {
    const storedId = localStorage.getItem('currentUserId') || window.currentUserId;
    if (storedId) {
      this.currentUser = await db.get('users', storedId);
    }
  },

  async getCurrentUser() {
    if (!this.currentUser) {
      await this.loadActiveUser();
    }
    return this.currentUser;
  },

  handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigate(hash, false);
  },

  navigate(pageId, updateHash = true) {
    this.currentRoute = pageId;
    if (updateHash) {
      window.location.hash = pageId;
    }

    // Hide all pages
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));

    // Highlight Gooey Nav items
    let activeNavEl = null;
    document.querySelectorAll('.gooey-nav-item').forEach(el => {
      const target = el.getAttribute('href')?.replace('#', '') || el.dataset.page;
      if (target === pageId) {
        el.classList.add('active');
        activeNavEl = el;
      } else {
        el.classList.remove('active');
      }
    });

    // Animate Gooey Pill Indicator
    this.updateGooeyPill(activeNavEl);

    // Show target page
    const targetEl = document.getElementById(`page-${pageId}`);
    if (targetEl) {
      targetEl.classList.add('active');
    }

    // Render target page
    switch (pageId) {
      case 'dashboard':
        DashboardPage.render();
        break;
      case 'registration':
        RegistrationPage.render();
        break;
      case 'booking':
        BookingPage.render();
        break;
      case 'user-dashboard':
        UserDashboardPage.render();
        break;
      case 'history':
        HistoryPage.render();
        break;
    }
  },

  updateGooeyPill(activeEl) {
    const pill = document.getElementById('gooey-pill');
    if (!pill || !activeEl) return;

    const navContainer = document.getElementById('main-gooey-nav');
    if (!navContainer) return;

    const navRect = navContainer.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();

    const left = itemRect.left - navRect.left;
    const width = itemRect.width;

    pill.style.opacity = '1';
    pill.style.transform = `translateX(${left - 6}px)`;
    pill.style.width = `${width}px`;
  },

  async updateCurrentUser() {
    await this.loadActiveUser();
    const userContainer = document.getElementById('user-profile-badge');
    const allUsers = await db.getAll('users');
    const allVehicles = await db.getAll('vehicles');
    const allSessions = await db.getAll('sessions');

    if (userContainer) {
      if (this.currentUser) {
        // Group vehicles by userId
        const userVehiclesMap = {};
        allVehicles.forEach(v => {
          if (!userVehiclesMap[v.userId]) userVehiclesMap[v.userId] = [];
          userVehiclesMap[v.userId].push(v);
        });

        // Group active sessions by userId
        const activeSessionsMap = {};
        allSessions.forEach(s => {
          if (s.status === 'active') {
            activeSessionsMap[s.userId] = s;
          }
        });

        userContainer.innerHTML = `
          <div class="accounts-dropdown-wrapper">
            <button class="account-trigger-btn" id="account-dropdown-trigger" onclick="App.toggleAccountsDropdown(event)" title="Click to switch account or add new account">
              <div class="avatar">${this.currentUser.name.charAt(0).toUpperCase()}</div>
              <div class="account-meta">
                <div class="font-semibold text-xs text-primary">${this.currentUser.name}</div>
                <div class="text-xs text-secondary">${this.currentUser.phone}</div>
              </div>
              <span class="chevron-icon">▼</span>
            </button>

            <!-- Floating Liquid Glass Accounts Dropdown Menu -->
            <div class="accounts-dropdown-menu" id="accounts-dropdown-menu" onclick="event.stopPropagation()">
              <div class="accounts-dropdown-header">
                <div>
                  <div class="font-bold text-xs uppercase tracking-wider" style="color: #69a760;">Accounts Directory</div>
                  <div class="text-xs text-secondary">${allUsers.length} profiles available</div>
                </div>
                <span class="tag tag-green text-xs" style="font-size: 0.68rem; padding: 2px 8px; background: rgba(83, 133, 76, 0.2); color: #69a760;">
                  ● Active Profile
                </span>
              </div>

              <div class="accounts-dropdown-list">
                ${allUsers.map(u => {
                  const isCurrent = u.id === this.currentUser.id;
                  const uVehicles = userVehiclesMap[u.id] || [];
                  const activeSession = activeSessionsMap[u.id];
                  const vehicleSummary = uVehicles.length > 0 
                    ? `${uVehicles.length} ${uVehicles.length > 1 ? 'Vehicles' : 'Vehicle'}: ${uVehicles.map(v => v.model || v.type).join(', ')}`
                    : 'No vehicles yet';

                  return `
                    <div class="account-item-card ${isCurrent ? 'current' : ''}" onclick="App.switchUser('${u.id}')">
                      <div class="flex items-center gap-sm" style="flex: 1; min-width: 0;">
                        <div class="acc-avatar">${u.name.charAt(0).toUpperCase()}</div>
                        <div style="flex: 1; min-width: 0;">
                          <div class="font-semibold text-xs text-primary flex items-center justify-between">
                            <span>${u.name}</span>
                            ${isCurrent ? '<span style="color: #69a760; font-weight: bold; font-size: 0.72rem;">✓ Active</span>' : ''}
                          </div>
                          <div class="text-xs text-secondary" style="font-size: 0.7rem;">📞 ${u.phone}</div>
                          <div class="text-xs text-secondary truncate" style="font-size: 0.68rem; opacity: 0.85;">
                            🚗 ${vehicleSummary}
                          </div>
                        </div>
                      </div>
                      ${activeSession ? '<span class="tag tag-green pulse" style="font-size: 0.65rem; padding: 2px 6px;">⚡ Charging</span>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="accounts-dropdown-footer">
                <button class="btn btn-primary btn-sm" style="width: 100%; justify-content: center; background: linear-gradient(135deg, #53854C, #00d4ff);" onclick="App.addNewAccount()">
                  <span>＋</span> Add New Account
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        userContainer.innerHTML = `
          <button class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #53854C, #00d4ff);" onclick="App.navigate('registration')">
            + Register / Login
          </button>
        `;
      }
    }
  },

  toggleAccountsDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('accounts-dropdown-menu');
    const trigger = document.getElementById('account-dropdown-trigger');
    if (!menu) return;

    const isOpen = menu.classList.contains('show');
    if (isOpen) {
      menu.classList.remove('show');
      trigger?.classList.remove('active');
    } else {
      menu.classList.add('show');
      trigger?.classList.add('active');
    }
  },

  closeAccountsDropdown() {
    const menu = document.getElementById('accounts-dropdown-menu');
    const trigger = document.getElementById('account-dropdown-trigger');
    if (menu) menu.classList.remove('show');
    if (trigger) trigger.classList.remove('active');
  },

  addNewAccount() {
    this.closeAccountsDropdown();
    this.navigate('registration');
    setTimeout(() => {
      const nameInput = document.getElementById('reg-name');
      const phoneInput = document.getElementById('reg-phone');
      const emailInput = document.getElementById('reg-email');
      if (nameInput) nameInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (emailInput) emailInput.value = '';
      nameInput?.focus();
      Utils.showToast('Enter details below to register a new account', 'info');
    }, 150);
  },

  async switchUser(userId) {
    this.closeAccountsDropdown();
    window.currentUserId = userId;
    localStorage.setItem('currentUserId', userId);
    this.currentUser = await db.get('users', userId);
    Utils.showToast(`Switched account to ${this.currentUser.name}`, 'success');
    await this.updateCurrentUser();
    this.navigate(this.currentRoute, false);
  }
};

// Global click listener to close accounts dropdown when clicking outside
window.addEventListener('click', (e) => {
  if (!e.target.closest('.accounts-dropdown-wrapper')) {
    App.closeAccountsDropdown();
  }
});

// Close dropdown on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    App.closeAccountsDropdown();
  }
});

// Handle window resize for gooey pill re-alignment
window.addEventListener('resize', () => {
  const activeEl = document.querySelector('.gooey-nav-item.active');
  if (activeEl) {
    App.updateGooeyPill(activeEl);
  }
});

// Start application when DOM loads
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
