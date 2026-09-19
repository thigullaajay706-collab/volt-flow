/* ============================================
   BOOKING — Charging Point Booking & Availability
   ============================================ */

const BookingPage = {
  selectedVehicleId: null,
  selectedPointId: null,
  isUrgent: false,
  isBatteryExchange: false,
  bookingMode: 'eco',

  async render() {
    const container = document.getElementById('page-booking');
    const currentUser = await App.getCurrentUser();
    const userVehicles = currentUser ? await db.getUserVehicles(currentUser.id) : [];
    const allPoints = await db.getAll('charging_points');
    const activeBookings = await db.getByIndex('bookings', 'status', 'active');
    const activeSessions = await db.getByIndex('sessions', 'status', 'active');
    const distribution = await powerEngine.calculateDistribution();

    // Map active bookings & sessions
    const occupiedPointIds = new Set();
    activeSessions.forEach(s => occupiedPointIds.add(s.pointId));
    activeBookings.forEach(b => occupiedPointIds.add(b.pointId));

    const availablePointsCount = allPoints.filter(p => !occupiedPointIds.has(p.id)).length;
    const isStationFull = availablePointsCount === 0;

    // Estimate next available departure time
    let nextAvailableTimeStr = '';
    if (isStationFull && activeBookings.length > 0) {
      const departureTimes = activeBookings.map(b => new Date(b.departureTime).getTime()).filter(t => !isNaN(t));
      if (departureTimes.length > 0) {
        const earliestDeparture = new Date(Math.min(...departureTimes));
        nextAvailableTimeStr = Utils.formatTime(earliestDeparture);
      }
    }

    container.innerHTML = `
      <div class="page-header">
        <div class="flex justify-between items-center flex-wrap gap-md">
          <div>
            <h1 class="page-title">⚡ Book Charging Slot</h1>
            <p class="page-subtitle">Reserve a smart charging grid point with dynamic vehicle-aware load balancing</p>
          </div>
          <div class="flex items-center gap-md">
            ${isStationFull 
              ? `<span class="tag tag-red" style="font-size: var(--text-sm); padding: 8px 16px;">⚠️ All 5 Points Full (Next slot ~${nextAvailableTimeStr || 'Soon'})</span>` 
              : `<span class="tag tag-green" style="background: rgba(83, 133, 76, 0.2); color: #69a760; font-size: var(--text-sm); padding: 8px 16px;">● ${availablePointsCount} of 5 Points Available</span>`
            }
            <button class="btn btn-secondary btn-sm" onclick="BookingPage.resetAllPoints()" title="Clear and open all 5 charging points">
              🔄 Reset / Free All Slots
            </button>
          </div>
        </div>
      </div>

      ${!currentUser ? `
        <div class="glass-panel-elevated" style="padding: var(--space-2xl); text-align: center; margin-bottom: var(--space-xl);">
          <div style="font-size: 3rem; margin-bottom: var(--space-md);">🔑</div>
          <h3 class="section-title mb-sm">Please Select or Register a User First</h3>
          <p class="text-secondary mb-lg">You need an active user profile to select vehicles and reserve slots.</p>
          <button class="btn btn-primary" onclick="App.navigate('registration')">Go to Registration</button>
        </div>
      ` : ''}

      <!-- Grid Status Display with 5 Open Clickable Points -->
      <div class="glass-panel-elevated mb-xl" style="padding: var(--space-xl);">
        <div class="section-header">
          <div>
            <h3 class="section-title">Charging Grid Real-Time Availability (5 Points)</h3>
            <p class="text-xs text-secondary">Click on any point card below (Point 1 to 5) to select it for direct vehicle connection</p>
          </div>
          <span class="tag" style="background: rgba(83, 133, 76, 0.2); color: #69a760;">All 5 Points Open Access</span>
        </div>

        <div class="grid-5 gap-md">
          ${allPoints.map(point => {
            const isPointOccupied = occupiedPointIds.has(point.id);
            const activeBooking = activeBookings.find(b => b.pointId === point.id);
            const alloc = distribution.allocations[point.id] || { powerKW: 0, isUrgent: false };
            const isSelected = this.selectedPointId === point.id;
            const statusClass = isPointOccupied ? (alloc.isUrgent ? 'occupied' : 'booked') : 'available';

            return `
              <div class="glass-card charging-point-card"
                   style="cursor: pointer; transition: all 0.25s ease; border: 2px solid ${isSelected ? 'var(--color-accent-cyan)' : (isPointOccupied ? 'rgba(255, 184, 0, 0.3)' : 'rgba(83, 133, 76, 0.3)')}; background: ${isSelected ? 'rgba(0, 212, 255, 0.08)' : 'var(--glass-bg)'};"
                   onclick="BookingPage.selectPoint('${point.id}')">
                <div class="point-number">${point.name}</div>
                <div class="point-status-dot ${statusClass}"></div>
                <div class="font-semibold text-sm mb-xs">
                  ${isPointOccupied ? (activeBooking?.isUrgent ? '🚨 Urgent Active' : '⚡ Standard Active') : '🟢 Open & Ready'}
                </div>
                <div class="text-xs text-secondary mb-sm">
                  ${isPointOccupied ? `Allocated: ${Utils.formatKW(alloc.powerKW)}` : `Max Speed: ${point.maxPower} kW`}
                </div>
                ${isPointOccupied && activeBooking ? `
                  <div class="tag ${activeBooking.isUrgent ? 'tag-red' : 'tag-cyan'} text-xs mb-xs" style="font-size: 0.7rem;">
                    Departs ~${Utils.formatTime(activeBooking.departureTime)}
                  </div>
                  <button class="btn btn-secondary btn-sm" style="width: 100%; font-size: 0.75rem; padding: 4px;" onclick="event.stopPropagation(); BookingPage.freeSinglePoint('${point.id}')">
                    ✕ Release Slot
                  </button>
                ` : `
                  <button class="btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm" style="width: 100%; pointer-events: none;">
                    ${isSelected ? '✓ Point Selected' : 'Choose Point'}
                  </button>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Booking Formulation Section -->
      ${currentUser ? `
        <div class="grid-2">
          <!-- Left: Booking Form -->
          <div class="glass-panel-elevated" style="padding: var(--space-xl);">
            <div class="flex justify-between items-center mb-lg">
              <h3 class="section-title">⚡ Reservation Details</h3>
              ${this.selectedPointId ? `<span class="tag tag-cyan font-bold">Selected: ${this.selectedPointId}</span>` : '<span class="tag text-secondary">Auto-assigning Point</span>'}
            </div>
            
            <form id="booking-form" onsubmit="BookingPage.handleSubmit(event)">
              
              <!-- Vehicle Selection (Supports multiple vehicles per account with Individual Toggles) -->
              <div class="form-group mb-lg">
                <div class="flex justify-between items-center mb-xs">
                  <label class="form-label">Select Account Vehicle (${userVehicles.length} Registered) <span class="required">*</span></label>
                  <a href="#registration" class="text-xs" style="color: #69a760; text-decoration: underline;">+ Add More Vehicles</a>
                </div>
                ${userVehicles.length === 0 ? `
                  <div class="text-xs text-amber mb-sm">No vehicles found for ${currentUser.name}. Please register one!</div>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="App.navigate('registration')">+ Add Vehicle</button>
                ` : `
                  <!-- Individual Vehicle Toggle Cards -->
                  <div class="user-vehicles-grid mb-sm" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                    ${userVehicles.map(v => {
                      const isSelected = this.selectedVehicleId === v.id;
                      return `
                        <div class="vehicle-toggle-card ${isSelected ? 'active' : ''}" 
                             style="padding: 12px 14px; cursor: pointer;"
                             onclick="BookingPage.onVehicleChange('${v.id}')">
                          <div class="vehicle-card-top mb-xs">
                            <span style="font-size: 1.3rem;">${Utils.getVehicleIcon(v.type)}</span>
                            ${isSelected ? '<span class="tag tag-green" style="font-size: 0.65rem; padding: 2px 6px;">✓ Selected</span>' : ''}
                          </div>
                          <div class="font-bold text-xs text-primary">${v.make || ''} ${v.model || v.type}</div>
                          <div class="text-xs text-secondary font-mono" style="font-size: 0.68rem;">${v.registrationNumber || 'No Plate'}</div>
                          <div class="text-xs text-secondary mt-xs" style="font-size: 0.68rem;">🔋 ${v.batteryCapacity || 40} kWh</div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                  
                  <select class="glass-select" id="book-vehicle" required onchange="BookingPage.onVehicleChange(this.value)" style="display: none;">
                    ${userVehicles.map(v => `
                      <option value="${v.id}" ${this.selectedVehicleId === v.id ? 'selected' : ''}>
                        ${v.make || ''} ${v.model || v.type}
                      </option>
                    `).join('')}
                  </select>
                `}
              </div>

              <!-- Battery Status & Target Input -->
              <div class="input-row">
                <div class="form-group">
                  <label class="form-label">Current Battery Charge (%) <span class="required">*</span></label>
                  <input type="number" class="glass-input" id="book-current-charge" min="1" max="99" value="20" required oninput="BookingPage.updateLiveCalculation()">
                </div>
                <div class="form-group">
                  <label class="form-label">Target Charge (%)</label>
                  <input type="number" class="glass-input" id="book-target-charge" min="50" max="100" value="100" required oninput="BookingPage.updateLiveCalculation()">
                </div>
              </div>

              <!-- Charging Speed Mode Options (ECO / BALANCED / FAST DC) -->
              <div class="form-group mb-lg">
                <label class="form-label">Select Charging Speed & Mode</label>
                <div class="grid-3 gap-sm mt-xs">
                  <button type="button" 
                          class="charging-mode-btn mode-eco ${(!this.isUrgent && (this.bookingMode === 'eco' || !this.bookingMode)) ? 'active' : ''}" 
                          style="padding: 10px 12px;"
                          onclick="BookingPage.setBookingSpeedMode('eco')">
                    <div class="mode-header">
                      <span>🌿</span>
                      <div class="mode-title" style="font-size: 0.8rem;">ECO Mode</div>
                    </div>
                    <div class="mode-speed" style="font-size: 0.72rem;">100% Free Solar Priority</div>
                  </button>

                  <button type="button" 
                          class="charging-mode-btn mode-balanced ${this.bookingMode === 'balanced' ? 'active' : ''}" 
                          style="padding: 10px 12px;"
                          onclick="BookingPage.setBookingSpeedMode('balanced')">
                    <div class="mode-header">
                      <span>⚡</span>
                      <div class="mode-title" style="font-size: 0.8rem;">BALANCED</div>
                    </div>
                    <div class="mode-speed" style="font-size: 0.72rem; color: #00d4ff;">Standard Grid+Solar</div>
                  </button>

                  <button type="button" 
                          class="charging-mode-btn mode-fast ${this.isUrgent ? 'active' : ''}" 
                          style="padding: 10px 12px;"
                          onclick="BookingPage.setBookingSpeedMode('fast')">
                    <div class="mode-header">
                      <span>🚀</span>
                      <div class="mode-title" style="font-size: 0.8rem;">FAST DC</div>
                    </div>
                    <div class="mode-speed" style="font-size: 0.72rem; color: #ff6b85;">Turbo Fast Priority</div>
                  </button>
                </div>
              </div>

              <!-- Battery Swap Option (for Bikes & Scooters & Bicycles) -->
              <div id="battery-swap-container" class="glass-card mb-lg hidden" style="background: rgba(255, 184, 0, 0.05); border-color: rgba(255, 184, 0, 0.25);">
                <div class="toggle-wrapper justify-between">
                  <div class="flex items-center gap-md">
                    <div style="font-size: 1.5rem;">🔄</div>
                    <div>
                      <div class="toggle-label font-semibold text-amber">Instant Battery Exchange (Swapping)</div>
                      <div class="text-xs text-secondary">Swap empty battery in 2 minutes for 2-wheelers (₹150 flat)</div>
                    </div>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" id="book-swap" onchange="BookingPage.onSwapToggle(this.checked)">
                    <span class="toggle-track"></span>
                    <span class="toggle-thumb"></span>
                  </label>
                </div>
              </div>

              <!-- Arrival Time Picker -->
              <div class="form-group">
                <label class="form-label">Estimated Arrival Time <span class="required">*</span></label>
                <input type="time" class="glass-input" id="book-arrival-time" required onchange="BookingPage.updateLiveCalculation()">
              </div>

              <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" ${userVehicles.length === 0 ? 'disabled' : ''}>
                ⚡ Confirm Smart Booking & Start Charging
              </button>
            </form>
          </div>

          <!-- Right: Real-time Calculation & Power Preview -->
          <div class="glass-panel-elevated" style="padding: var(--space-xl);">
            <h3 class="section-title mb-lg">📊 Dynamic Session Forecast</h3>
            <div id="preview-calculation-panel"></div>
          </div>
        </div>
      ` : ''}
    `;

    // Set default arrival time to now (HH:MM)
    const now = new Date();
    const timeInput = document.getElementById('book-arrival-time');
    if (timeInput) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      timeInput.value = `${hours}:${minutes}`;
    }

    // Auto-select first vehicle if available
    if (userVehicles.length > 0 && !this.selectedVehicleId) {
      this.selectedVehicleId = userVehicles[0].id;
    }
    
    if (this.selectedVehicleId) {
      const vehicleSelect = document.getElementById('book-vehicle');
      if (vehicleSelect) vehicleSelect.value = this.selectedVehicleId;
      this.onVehicleChange(this.selectedVehicleId);
    }
  },

  selectPoint(pointId) {
    this.selectedPointId = pointId;
    Utils.showToast(`Selected Grid Point ${pointId} for booking`, 'info');
    this.render();
  },

  async freeSinglePoint(pointId) {
    // Release booking & sessions on this point
    const bookings = await db.getByIndex('bookings', 'pointId', pointId);
    for (const b of bookings) {
      if (b.status === 'active') {
        b.status = 'completed';
        await db.put('bookings', b);
      }
    }
    const sessions = await db.getAll('sessions');
    for (const s of sessions) {
      if (s.pointId === pointId && s.status === 'active') {
        s.status = 'completed';
        await db.put('sessions', s);
      }
    }
    const point = await db.get('charging_points', pointId);
    if (point) {
      point.status = 'available';
      point.currentVehicleId = null;
      point.currentBookingId = null;
      point.powerAllocation = 0;
      await db.put('charging_points', point);
    }
    await powerEngine.calculateDistribution();
    Utils.showToast(`Point ${pointId} is now Free & Available!`, 'success');
    this.render();
  },

  async resetAllPoints() {
    const allPoints = await db.getAll('charging_points');
    for (const p of allPoints) {
      p.status = 'available';
      p.currentVehicleId = null;
      p.currentBookingId = null;
      p.powerAllocation = 0;
      await db.put('charging_points', p);
    }
    const allBookings = await db.getAll('bookings');
    for (const b of allBookings) {
      if (b.status === 'active') {
        b.status = 'completed';
        await db.put('bookings', b);
      }
    }
    const allSessions = await db.getAll('sessions');
    for (const s of allSessions) {
      if (s.status === 'active') {
        s.status = 'completed';
        await db.put('sessions', s);
      }
    }
    await powerEngine.calculateDistribution();
    Utils.showToast('All 5 Charging Points are now Open and Free!', 'success');
    this.render();
  },

  async onVehicleChange(vehicleId) {
    this.selectedVehicleId = vehicleId;
    const vehicle = vehicleId ? await db.get('vehicles', vehicleId) : null;
    const swapContainer = document.getElementById('battery-swap-container');

    if (vehicle && Utils.isBatteryExchangeEligible(vehicle.type)) {
      if (swapContainer) swapContainer.classList.remove('hidden');
    } else {
      if (swapContainer) swapContainer.classList.add('hidden');
      this.isBatteryExchange = false;
      const swapInput = document.getElementById('book-swap');
      if (swapInput) swapInput.checked = false;
    }

    this.updateLiveCalculation();
  },

  setBookingSpeedMode(mode) {
    this.bookingMode = mode;
    this.isUrgent = (mode === 'fast');
    this.render();
  },

  onUrgencyToggle(checked) {
    this.isUrgent = checked;
    this.bookingMode = checked ? 'fast' : 'eco';
    this.updateLiveCalculation();
  },

  onSwapToggle(checked) {
    this.isBatteryExchange = checked;
    this.updateLiveCalculation();
  },

  async updateLiveCalculation() {
    const preview = document.getElementById('preview-calculation-panel');
    if (!preview) return;

    if (!this.selectedVehicleId) {
      preview.innerHTML = `
        <div class="empty-state" style="padding: var(--space-xl) 0;">
          <div class="empty-icon">🔌</div>
          <div class="empty-title">Select a vehicle to preview</div>
          <div class="empty-description">Live charging speed and duration will calculate based on vehicle charger capacity.</div>
        </div>
      `;
      return;
    }

    const vehicle = await db.get('vehicles', this.selectedVehicleId);
    if (!vehicle) return;

    const currentCharge = parseFloat(document.getElementById('book-current-charge')?.value) || 20;
    const targetCharge = parseFloat(document.getElementById('book-target-charge')?.value) || 100;
    const isSwap = this.isBatteryExchange;
    const isUrgent = this.isUrgent;

    if (isSwap) {
      preview.innerHTML = `
        <div class="glass-card mb-md" style="background: rgba(255, 184, 0, 0.08); border-color: var(--color-accent-amber);">
          <div class="flex items-center gap-md mb-md">
            <div style="font-size: 2rem;">🔄</div>
            <div>
              <div class="font-semibold text-lg text-amber">Battery Swap Mode</div>
              <div class="text-xs text-secondary">Instant physical replacement with a 100% pre-charged battery pack</div>
            </div>
          </div>
          <div class="separator"></div>
          <div class="grid-2 gap-md text-sm">
            <div>
              <div class="text-secondary text-xs">Estimated Swap Time</div>
              <div class="font-bold text-accent">~ 2 to 3 Minutes</div>
            </div>
            <div>
              <div class="text-secondary text-xs">Fixed Swap Fee</div>
              <div class="font-bold text-green">₹150.00</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Vehicle specific maximum charging speed
    const chargingSpeedKW = powerEngine.getVehicleMaxChargingSpeed(vehicle, isUrgent);
    
    // Battery calculations
    const capacityKWh = vehicle.batteryCapacity || (vehicle.type === 'car' ? 40 : 3.5);
    const requiredEnergyKWh = Math.max(0, ((targetCharge - currentCharge) / 100) * capacityKWh);
    const estimatedMinutes = powerEngine.estimateChargingTime(capacityKWh, currentCharge, chargingSpeedKW);

    // Departure time calculation
    const arrivalTimeVal = document.getElementById('book-arrival-time')?.value || '12:00';
    const [arrH, arrM] = arrivalTimeVal.split(':').map(Number);
    const arrivalDate = new Date();
    arrivalDate.setHours(arrH, arrM, 0, 0);
    const departureDate = new Date(arrivalDate.getTime() + estimatedMinutes * 60 * 1000);

    // Cost & Solar Calculation (Solar energy is 100% FREE for user)
    const solarRatio = 0.25; // 25% solar contribution
    const solarEnergyKWh = requiredEnergyKWh * solarRatio;
    const costDetails = await powerEngine.calculateCost(requiredEnergyKWh, solarEnergyKWh);

    preview.innerHTML = `
      <div class="grid-2 gap-md mb-md">
        <div class="glass-stat">
          <div class="stat-label">Vehicle Charging Speed</div>
          <div class="stat-value ${isUrgent ? 'text-red' : 'text-accent'}" style="color: ${isUrgent ? 'var(--color-accent-red)' : '#69a760'};">
            ${Utils.formatKW(chargingSpeedKW)}
          </div>
          <div class="stat-change ${isUrgent ? 'negative' : 'positive'}">
            ${isUrgent ? '🚨 Max Priority Fast' : '⚡ Balanced Eco Rate'}
          </div>
        </div>
        <div class="glass-stat">
          <div class="stat-label">Estimated Duration</div>
          <div class="stat-value" style="color: #69a760;">${Utils.formatDuration(estimatedMinutes)}</div>
          <div class="stat-change">${currentCharge}% → ${targetCharge}% (${capacityKWh} kWh Pack)</div>
        </div>
      </div>

      <div class="glass-card mb-md">
        <div class="flex justify-between items-center mb-sm">
          <span class="text-xs text-secondary">Target Departure</span>
          <span class="font-bold text-accent">${Utils.formatTime(departureDate)}</span>
        </div>
        <div class="flex justify-between items-center mb-sm">
          <span class="text-xs text-secondary">Total Energy Required</span>
          <span class="font-semibold">${Utils.formatKWh(requiredEnergyKWh)}</span>
        </div>
        <div class="flex justify-between items-center mb-sm">
          <span class="text-xs text-amber">☀️ Solar Energy Contribution</span>
          <span class="font-semibold text-amber">${Utils.formatKWh(solarEnergyKWh)} (100% FREE)</span>
        </div>
        <div class="separator"></div>
        <div class="flex justify-between items-center">
          <div>
            <div class="text-xs text-secondary">Net Payable Amount</div>
            <div class="text-xs" style="color: #69a760;">Saved ${Utils.formatCurrency(costDetails.solarSavings)} via Solar</div>
          </div>
          <div class="font-bold text-2xl font-display" style="color: #69a760;">${Utils.formatCurrency(costDetails.finalAmount)}</div>
        </div>
      </div>
    `;
  },

  async handleSubmit(event) {
    event.preventDefault();

    const currentUser = await App.getCurrentUser();
    if (!currentUser) {
      Utils.showToast('Please log in first', 'error');
      return;
    }

    if (!this.selectedVehicleId) {
      Utils.showToast('Please select a vehicle', 'error');
      return;
    }

    const currentCharge = parseFloat(document.getElementById('book-current-charge').value) || 20;
    const targetCharge = parseFloat(document.getElementById('book-target-charge').value) || 100;
    const arrivalTimeVal = document.getElementById('book-arrival-time').value;

    if (!arrivalTimeVal) {
      Utils.showToast('Please specify arrival time', 'error');
      return;
    }

    const allPoints = await db.getAll('charging_points');
    const activeBookings = await db.getByIndex('bookings', 'status', 'active');
    const occupiedIds = new Set(activeBookings.map(b => b.pointId));
    
    let targetPoint = null;
    if (this.selectedPointId && !occupiedIds.has(this.selectedPointId)) {
      targetPoint = allPoints.find(p => p.id === this.selectedPointId);
    } else {
      targetPoint = allPoints.find(p => !occupiedIds.has(p.id));
    }

    // Fallback if full
    if (!targetPoint) {
      targetPoint = allPoints[0];
    }

    const vehicle = await db.get('vehicles', this.selectedVehicleId);
    const capacityKWh = vehicle.batteryCapacity || (vehicle.type === 'car' ? 40 : 3.5);
    const isUrgent = this.isUrgent;
    const isSwap = this.isBatteryExchange;
    const chargingSpeedKW = powerEngine.getVehicleMaxChargingSpeed(vehicle, isUrgent);

    // Calculate times
    const [arrH, arrM] = arrivalTimeVal.split(':').map(Number);
    const arrivalDate = new Date();
    arrivalDate.setHours(arrH, arrM, 0, 0);

    const estMinutes = isSwap ? 3 : powerEngine.estimateChargingTime(capacityKWh, currentCharge, chargingSpeedKW);
    const departureDate = new Date(arrivalDate.getTime() + estMinutes * 60 * 1000);

    // Create booking record
    const bookingId = db.generateId();
    const booking = {
      id: bookingId,
      userId: currentUser.id,
      vehicleId: vehicle.id,
      pointId: targetPoint.id,
      isUrgent: isUrgent,
      isBatteryExchange: isSwap,
      currentChargePct: currentCharge,
      targetChargePct: targetCharge,
      arrivalTime: arrivalDate.toISOString(),
      departureTime: departureDate.toISOString(),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    await db.add('bookings', booking);

    // Update charging point status
    targetPoint.status = 'occupied';
    targetPoint.currentVehicleId = vehicle.id;
    targetPoint.currentBookingId = bookingId;
    targetPoint.powerAllocation = chargingSpeedKW;
    await db.put('charging_points', targetPoint);

    // Create active charging session
    const sessionId = db.generateId();
    const requiredKWh = ((targetCharge - currentCharge) / 100) * capacityKWh;
    const solarRatio = 0.25;
    const solarEnergyKWh = isSwap ? 0 : requiredKWh * solarRatio;
    const costDetails = isSwap 
      ? { totalCost: 150, solarSavings: 0, finalAmount: 150 } 
      : await powerEngine.calculateCost(requiredKWh, solarEnergyKWh);

    const session = {
      id: sessionId,
      bookingId: bookingId,
      userId: currentUser.id,
      vehicleId: vehicle.id,
      pointId: targetPoint.id,
      startTime: arrivalDate.toISOString(),
      endTime: departureDate.toISOString(),
      isUrgent: isUrgent,
      isBatteryExchange: isSwap,
      currentChargePct: currentCharge,
      targetChargePct: targetCharge,
      batteryCapacityKWh: capacityKWh,
      energyConsumed: requiredKWh,
      solarEnergy: solarEnergyKWh,
      cost: costDetails.totalCost,
      solarSavings: costDetails.solarSavings,
      finalAmount: costDetails.finalAmount,
      chargingSpeedKW: chargingSpeedKW,
      chargingMode: this.bookingMode || (isUrgent ? 'fast' : 'eco'),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    await db.add('sessions', session);
    await powerEngine.calculateDistribution();

    Utils.showToast(`Slot ${targetPoint.name} Reserved for ${vehicle.make || vehicle.type}!`, 'success');

    window.activeSessionId = sessionId;
    localStorage.setItem('activeSessionId', sessionId);

    UserDashboardPage.selectedVehicleId = vehicle.id;
    UserDashboardPage.selectedSessionId = sessionId;

    App.navigate('user-dashboard');
  }
};
