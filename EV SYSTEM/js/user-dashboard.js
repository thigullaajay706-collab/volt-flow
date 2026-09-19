/* ============================================
   USER DASHBOARD — Real-Time Charging Session View
   ============================================ */

const UserDashboardPage = {
  liveTimer: null,
  selectedSessionId: null,
  selectedVehicleId: null,

  async render() {
    const container = document.getElementById('page-user-dashboard');
    const currentUser = await App.getCurrentUser();
    
    if (!currentUser) {
      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">⚡ My Live Charging</h1>
          <p class="page-subtitle">Track your vehicle's charge progress, solar savings, and energy rate</p>
        </div>
        <div class="glass-panel-elevated" style="padding: var(--space-2xl); text-align: center;">
          <div style="font-size: 3rem; margin-bottom: var(--space-md);">🔑</div>
          <h3 class="section-title mb-sm">No Active User Selected</h3>
          <p class="text-secondary mb-lg">Please log in or register a user to see active charging sessions.</p>
          <button class="btn btn-primary" onclick="App.navigate('registration')">Go to Registration</button>
        </div>
      `;
      return;
    }

    // Retrieve all user vehicles and sessions
    const allUserVehicles = await db.getUserVehicles(currentUser.id);
    const userSessions = await db.getUserSessions(currentUser.id);
    const activeSessions = userSessions.filter(s => s.status === 'active');

    // Default select first vehicle or the vehicle that is currently charging
    if (!this.selectedVehicleId && allUserVehicles.length > 0) {
      const chargingVehicle = allUserVehicles.find(v => activeSessions.some(s => s.vehicleId === v.id));
      this.selectedVehicleId = chargingVehicle ? chargingVehicle.id : allUserVehicles[0].id;
    }

    const currentVehicle = allUserVehicles.find(v => v.id === this.selectedVehicleId) || allUserVehicles[0];

    // Find active or latest session for selected vehicle
    let activeSession = null;
    if (currentVehicle) {
      activeSession = userSessions.find(s => s.vehicleId === currentVehicle.id && s.status === 'active') ||
                      userSessions.find(s => s.vehicleId === currentVehicle.id);
    }
    if (!activeSession && activeSessions.length > 0) {
      activeSession = activeSessions[0];
    }
    if (activeSession) {
      this.selectedSessionId = activeSession.id;
    }

    // Hardware speed thresholds based on vehicle type
    const maxHardwareSpeed = currentVehicle ? powerEngine.getVehicleMaxChargingSpeed(currentVehicle, true) : 22.0;
    const standardEcoSpeed = currentVehicle ? powerEngine.getVehicleMaxChargingSpeed(currentVehicle, false) : 7.2;
    const balancedSpeed = Math.round(((standardEcoSpeed + maxHardwareSpeed) / 2) * 10) / 10;

    container.innerHTML = `
      <div class="page-header">
        <div class="flex justify-between items-center flex-wrap gap-md">
          <div>
            <h1 class="page-title">⚡ Live Vehicle Telemetry</h1>
            <p class="page-subtitle">Real-time charge monitoring & speed controller for <strong>${currentUser.name}</strong></p>
          </div>
          <div class="flex gap-sm items-center">
            ${activeSession && activeSession.status === 'active' ? `
              <span class="tag tag-green" style="background: rgba(83, 133, 76, 0.2); color: #69a760;">
                ● Charging at Point ${activeSession.pointId}
              </span>
              ${activeSession.isUrgent ? '<span class="tag tag-red urgent-pulse">🚀 FAST DC TURBO</span>' : '<span class="tag tag-cyan">🌿 BALANCED / ECO</span>'}
            ` : `
              <span class="tag" style="background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.6);">
                🟢 Vehicle Idle / Parked
              </span>
            `}
          </div>
        </div>
      </div>

      <!-- 4. Individual Toggles for Each Vehicle in Account -->
      <div class="mb-xl">
        <div class="flex items-center justify-between mb-sm">
          <div class="flex items-center gap-xs">
            <span class="text-xs text-secondary font-bold uppercase tracking-wider">Your Account Vehicles:</span>
            <span class="tag tag-cyan" style="font-size: 0.68rem; padding: 2px 8px;">${allUserVehicles.length} Registered</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('registration')">
            ＋ Register Another Vehicle
          </button>
        </div>

        ${allUserVehicles.length === 0 ? `
          <div class="glass-card text-center" style="padding: 24px;">
            <p class="text-secondary text-sm mb-md">No vehicles registered under this account yet.</p>
            <button class="btn btn-primary btn-sm" onclick="App.navigate('registration')">+ Register First Vehicle</button>
          </div>
        ` : `
          <div class="user-vehicles-grid">
            ${allUserVehicles.map(v => {
              const vSession = userSessions.find(s => s.vehicleId === v.id && s.status === 'active');
              const isCharging = !!vSession;
              const isSelected = currentVehicle && currentVehicle.id === v.id;
              const vSpeed = vSession ? (vSession.chargingSpeedKW || powerEngine.getVehicleMaxChargingSpeed(v, vSession.isUrgent)) : powerEngine.getVehicleMaxChargingSpeed(v, false);

              return `
                <div class="vehicle-toggle-card ${isSelected ? 'active' : ''}" 
                     onclick="UserDashboardPage.selectVehicle('${v.id}')"
                     title="Click to view telemetry & controls for ${v.make || ''} ${v.model || v.type}">
                  <div class="vehicle-card-top">
                    <div class="vehicle-icon-circle">${Utils.getVehicleIcon(v.type)}</div>
                    ${isCharging 
                      ? `<span class="tag tag-green pulse" style="font-size: 0.68rem; padding: 2px 8px; background: rgba(83, 133, 76, 0.25); color: #69a760;">⚡ Pt ${vSession.pointId} • ${vSpeed} kW</span>`
                      : `<span class="tag" style="font-size: 0.68rem; padding: 2px 8px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6);">🟢 Ready / Idle</span>`
                    }
                  </div>
                  <div class="vehicle-model-title">${v.make || ''} ${v.model || v.type}</div>
                  <div class="vehicle-reg-tag">${v.registrationNumber || 'No Plate Registered'}</div>
                  <div class="flex justify-between items-center text-xs text-secondary mt-xs" style="font-size: 0.72rem;">
                    <span>🔋 ${v.batteryCapacity || 40} kWh</span>
                    <span style="color: ${isSelected ? '#69a760' : 'var(--text-secondary)'}; font-weight: 600;">
                      ${isSelected ? '● Active View' : 'Switch Vehicle →'}
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Main Telemetry View for Selected Vehicle -->
      ${activeSession && activeSession.status === 'active' ? this.renderActiveChargingView(activeSession, currentVehicle, standardEcoSpeed, balancedSpeed, maxHardwareSpeed) : this.renderIdleVehicleView(currentVehicle)}
    `;

    if (activeSession && activeSession.status === 'active') {
      this.startLiveSimulation(activeSession.id);
    }
  },

  renderActiveChargingView(activeSession, vehicle, ecoSpeed, balancedSpeed, maxSpeed) {
    const effectiveChargingSpeedKW = activeSession.chargingSpeedKW || powerEngine.getVehicleMaxChargingSpeed(vehicle, activeSession.isUrgent);
    const solarShareKW = Math.round((effectiveChargingSpeedKW * 0.25) * 10) / 10;
    const currentMode = activeSession.chargingMode || (activeSession.isUrgent ? 'fast' : 'eco');

    // Calculate time elapsed & remaining
    const startTime = new Date(activeSession.startTime).getTime();
    const endTime = new Date(activeSession.endTime).getTime();
    const now = Date.now();
    const totalDurationMs = Math.max(60000, endTime - startTime);
    const elapsedMs = Math.max(0, now - startTime);
    const progressPct = activeSession.status === 'completed' ? 100 : Math.min(99, (elapsedMs / totalDurationMs) * 100);
    const remainingMinutes = activeSession.status === 'completed' ? 0 : Math.max(1, Math.round((endTime - now) / 60000));

    // Dynamic battery SoC %
    const currentChargeSoC = Math.min(100, Math.round(activeSession.currentChargePct + ((activeSession.targetChargePct - activeSession.currentChargePct) * (progressPct / 100))));
    const deliveredKWh = Math.round((activeSession.energyConsumed * (progressPct / 100)) * 10) / 10;
    const solarDeliveredKWh = Math.round((activeSession.solarEnergy * (progressPct / 100)) * 10) / 10;
    const solarMoneySaved = Math.round((solarDeliveredKWh * 8) * 10) / 10;

    return `
      <!-- Hero Glass Card with Circular Charge Visual -->
      <div class="grid-2 mb-xl">
        <div class="glass-panel-elevated flex flex-col items-center justify-center text-center" style="padding: var(--space-2xl);">
          <div class="mb-lg">
            ${Utils.createCircularProgress(currentChargeSoC, 180, 12, activeSession.isUrgent ? 'var(--color-accent-red)' : '#53854C')}
          </div>
          <div class="font-display font-bold text-2xl mb-xs">
            ${currentChargeSoC}% Battery Level
          </div>
          <div class="text-sm text-secondary mb-md">
            Target: ${activeSession.targetChargePct}% • Connected to Point ${activeSession.pointId}
          </div>
          <div class="flex gap-md">
            <span class="tag tag-cyan" style="font-size: var(--text-sm); padding: 6px 14px;">
              ⚡ Speed: ${Utils.formatKW(effectiveChargingSpeedKW)}
            </span>
            <span class="tag tag-amber solar-glow" style="font-size: var(--text-sm); padding: 6px 14px;">
              ☀️ Solar Share: ${Utils.formatKW(solarShareKW)}
            </span>
          </div>
        </div>

        <!-- Live Metrics & Solar Savings -->
        <div class="flex flex-col gap-md">
          <!-- Solar Savings Highlight Card -->
          <div class="glass-card solar-glow" style="background: rgba(83, 133, 76, 0.08); border-color: rgba(83, 133, 76, 0.3); padding: var(--space-xl);">
            <div class="flex justify-between items-start mb-md">
              <div>
                <div class="text-xs font-semibold text-amber uppercase tracking-wider">🌟 100% Free Green Energy Applied</div>
                <div class="text-2xl font-bold font-display mt-xs" style="color: #69a760;">${Utils.formatCurrency(solarMoneySaved)} Saved</div>
              </div>
              <div style="font-size: 2.2rem;">☀️</div>
            </div>
            <p class="text-xs text-secondary mb-sm">
              All rooftop solar electricity in this microgrid is provided <strong>100% free of charge</strong> to vehicle owners.
            </p>
            <div class="progress-bar green">
              <div class="progress-bar-fill" style="width: ${Math.min(100, (solarDeliveredKWh / Math.max(0.1, deliveredKWh)) * 100)}%; background: linear-gradient(90deg, #53854C, #69a760);"></div>
            </div>
          </div>

          <!-- Time & Power Stats Grid -->
          <div class="grid-2 gap-md">
            <div class="glass-stat">
              <div class="stat-icon" style="background: rgba(83, 133, 76, 0.2); color: #69a760;">⏱️</div>
              <div class="stat-value" style="color: #69a760;">${Utils.formatDuration(remainingMinutes)}</div>
              <div class="stat-label">Time to Full Charge</div>
            </div>
            <div class="glass-stat">
              <div class="stat-icon accent-cyan">⚡</div>
              <div class="stat-value text-accent">${Utils.formatKWh(deliveredKWh)}</div>
              <div class="stat-label">Energy Delivered So Far</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Interactive Charging Speed & Mode Options Controller -->
      <div class="charging-mode-section glass-card mb-xl" style="padding: 20px 24px; border-color: rgba(83, 133, 76, 0.35);">
        <div class="flex justify-between items-center mb-md flex-wrap gap-sm">
          <div>
            <h3 class="section-title flex items-center gap-xs" style="font-size: 1.15rem;">
              <span>⚡</span> Charging Speed & Mode Options
            </h3>
            <p class="text-xs text-secondary">Switch on-the-fly between Eco solar-priority, Balanced, or Turbo Fast DC charging</p>
          </div>
          <span class="tag tag-green font-bold" style="background: rgba(83, 133, 76, 0.25); color: #69a760;">
            Active Output: ${Utils.formatKW(effectiveChargingSpeedKW)}
          </span>
        </div>

        <!-- Mode Buttons Grid -->
        <div class="grid-3 gap-md mb-lg">
          <button type="button" 
                  class="charging-mode-btn mode-eco ${currentMode === 'eco' ? 'active' : ''}" 
                  onclick="UserDashboardPage.setChargingSpeedMode('${activeSession.id}', 'eco')">
            <div class="mode-header">
              <span style="font-size: 1.3rem;">🌿</span>
              <div class="mode-title">ECO Mode</div>
            </div>
            <div class="mode-speed">${ecoSpeed} kW Standard</div>
            <div class="mode-desc">100% Free solar offset priority • Lowest bill • Low battery wear</div>
          </button>

          <button type="button" 
                  class="charging-mode-btn mode-balanced ${currentMode === 'balanced' ? 'active' : ''}" 
                  onclick="UserDashboardPage.setChargingSpeedMode('${activeSession.id}', 'balanced')">
            <div class="mode-header">
              <span style="font-size: 1.3rem;">⚡</span>
              <div class="mode-title">BALANCED Mode</div>
            </div>
            <div class="mode-speed">${balancedSpeed} kW Medium</div>
            <div class="mode-desc">Standard daily recharge • Balanced grid & solar power share</div>
          </button>

          <button type="button" 
                  class="charging-mode-btn mode-fast ${currentMode === 'fast' ? 'active' : ''}" 
                  onclick="UserDashboardPage.setChargingSpeedMode('${activeSession.id}', 'fast')">
            <div class="mode-header">
              <span style="font-size: 1.3rem;">🚀</span>
              <div class="mode-title">FAST DC TURBO</div>
            </div>
            <div class="mode-speed">${maxSpeed} kW High Speed</div>
            <div class="mode-desc">Urgent grid priority • Quickest turnaround • Max power delivery</div>
          </button>
        </div>

        <!-- Fine-Tuning Slider -->
        <div class="glass-card" style="padding: 14px 18px; background: rgba(255,255,255,0.02);">
          <div class="flex justify-between items-center mb-xs">
            <span class="text-xs font-semibold text-secondary">Fine-tune Output Speed (Custom Slider):</span>
            <span class="text-xs font-bold" style="color: #69a760;" id="custom-speed-disp">${effectiveChargingSpeedKW} kW</span>
          </div>
          <div class="flex items-center gap-md">
            <span class="text-xs text-secondary font-mono">1.0 kW</span>
            <input type="range" class="glass-slider" min="1.0" max="${maxSpeed}" step="0.5" value="${effectiveChargingSpeedKW}" 
                   oninput="document.getElementById('custom-speed-disp').innerText = Number(this.value).toFixed(1) + ' kW'"
                   onchange="UserDashboardPage.setChargingSpeedMode('${activeSession.id}', 'custom', this.value)" style="flex: 1;">
            <span class="text-xs text-secondary font-mono">${maxSpeed} kW</span>
          </div>
        </div>
      </div>

      <!-- Action Panel & Session Summary Details -->
      <div class="glass-panel-elevated" style="padding: var(--space-xl);">
        <div class="section-header">
          <div>
            <h3 class="section-title">Session Billing & Metering</h3>
            <p class="text-xs text-secondary">Pay-as-you-charge dynamic metering (Vehicle Cap: ${effectiveChargingSpeedKW} kW)</p>
          </div>
          <button class="btn btn-danger btn-sm" onclick="UserDashboardPage.stopCharging('${activeSession.id}')">
            🛑 Stop & Settle Bill
          </button>
        </div>

        <div class="grid-4 gap-md text-sm">
          <div class="glass-card">
            <div class="text-xs text-secondary">Standard Grid Rate</div>
            <div class="font-bold text-accent">₹8.00 / kWh</div>
          </div>
          <div class="glass-card">
            <div class="text-xs text-secondary">Solar Discount Rate</div>
            <div class="font-bold" style="color: #69a760;">₹0.00 (100% FREE)</div>
          </div>
          <div class="glass-card">
            <div class="text-xs text-secondary">Gross Charge</div>
            <div class="font-bold">${Utils.formatCurrency(activeSession.cost)}</div>
          </div>
          <div class="glass-card" style="border-color: rgba(83, 133, 76, 0.4);">
            <div class="text-xs text-secondary">Net Payable Amount</div>
            <div class="font-bold text-xl" style="color: #69a760;">${Utils.formatCurrency(activeSession.finalAmount)}</div>
          </div>
        </div>
      </div>
    `;
  },

  renderIdleVehicleView(vehicle) {
    return `
      <div class="glass-panel-elevated text-center" style="padding: var(--space-2xl);">
        <div style="font-size: 3.5rem; margin-bottom: var(--space-md);">
          ${vehicle ? Utils.getVehicleIcon(vehicle.type) : '🚗'}
        </div>
        <h3 class="section-title mb-xs">
          ${vehicle ? `${vehicle.make || ''} ${vehicle.model || vehicle.type}` : 'Vehicle'} is Idle & Ready to Charge
        </h3>
        <p class="text-secondary mb-lg">
          Registration: <strong>${vehicle?.registrationNumber || 'Not specified'}</strong> • Battery Capacity: <strong>${vehicle?.batteryCapacity || 40} kWh</strong>
        </p>
        <div class="flex gap-md justify-center">
          <button class="btn btn-primary btn-lg" style="background: linear-gradient(135deg, #53854C, #00d4ff);" onclick="BookingPage.selectedVehicleId = '${vehicle?.id}'; App.navigate('booking')">
            ⚡ Connect & Book Charging Point
          </button>
        </div>
      </div>
    `;
  },

  selectVehicle(vehicleId) {
    this.selectedVehicleId = vehicleId;
    this.render();
  },

  async setChargingSpeedMode(sessionId, mode, customKW = null) {
    const session = await db.get('sessions', sessionId);
    if (!session) return;

    const vehicle = await db.get('vehicles', session.vehicleId);
    const maxSpeed = powerEngine.getVehicleMaxChargingSpeed(vehicle, true);
    const standardEco = powerEngine.getVehicleMaxChargingSpeed(vehicle, false);

    let targetKW = standardEco;
    let isUrgent = false;

    if (mode === 'eco') {
      targetKW = standardEco;
      isUrgent = false;
    } else if (mode === 'balanced') {
      targetKW = Math.round(((standardEco + maxSpeed) / 2) * 10) / 10;
      isUrgent = false;
    } else if (mode === 'fast') {
      targetKW = maxSpeed;
      isUrgent = true;
    } else if (mode === 'custom' && customKW) {
      targetKW = Math.min(maxSpeed, Math.max(1.0, parseFloat(customKW)));
      isUrgent = targetKW > standardEco;
    }

    session.chargingSpeedKW = targetKW;
    session.chargingMode = mode;
    session.isUrgent = isUrgent;

    // Recalculate estimated completion time with new power delivery
    const now = Date.now();
    const batteryCapacity = session.batteryCapacityKWh || vehicle?.batteryCapacity || 40;
    const currentSoC = session.currentChargePct || 25;
    const targetSoC = session.targetChargePct || 100;
    const remainingKWh = Math.max(0.2, ((targetSoC - currentSoC) / 100) * batteryCapacity);
    const remainingHours = remainingKWh / Math.max(0.5, targetKW * 0.9);
    session.endTime = new Date(now + remainingHours * 3600 * 1000).toISOString();

    // Update associated booking
    if (session.bookingId) {
      const booking = await db.get('bookings', session.bookingId);
      if (booking) {
        booking.isUrgent = isUrgent;
        booking.departureTime = session.endTime;
        await db.put('bookings', booking);
      }
    }

    await db.put('sessions', session);
    await powerEngine.calculateDistribution();

    Utils.showToast(`⚡ Charging mode changed to ${mode.toUpperCase()} (${targetKW} kW)`, 'success');
    this.render();
  },

  startLiveSimulation(sessionId) {
    if (this.liveTimer) clearInterval(this.liveTimer);

    this.liveTimer = setInterval(async () => {
      const activeEl = document.getElementById('page-user-dashboard');
      if (activeEl && activeEl.classList.contains('active')) {
        const session = await db.get('sessions', sessionId);
        if (session && session.status === 'active') {
          const now = Date.now();
          const endTime = new Date(session.endTime).getTime();
          if (now >= endTime) {
            session.status = 'completed';
            session.currentChargePct = session.targetChargePct;
            await db.put('sessions', session);
            Utils.showToast('🔋 Vehicle Charging Completed!', 'success');
          }
          this.render();
        }
      }
    }, 8000);
  },

  async stopCharging(sessionId) {
    const session = await db.get('sessions', sessionId);
    if (!session) return;

    session.status = 'completed';
    session.endTime = new Date().toISOString();
    await db.put('sessions', session);

    // Free the charging point
    const point = await db.get('charging_points', session.pointId);
    if (point) {
      point.status = 'available';
      point.currentVehicleId = null;
      point.currentBookingId = null;
      point.powerAllocation = 0;
      await db.put('charging_points', point);
    }

    // Complete booking
    const booking = await db.get('bookings', session.bookingId);
    if (booking) {
      booking.status = 'completed';
      await db.put('bookings', booking);
    }

    await powerEngine.calculateDistribution();

    Utils.showToast('Charging session ended. Slot is now free.', 'info');
    PaymentModule.openPaymentModal(sessionId);
  },

  destroy() {
    if (this.liveTimer) {
      clearInterval(this.liveTimer);
      this.liveTimer = null;
    }
  }
};
