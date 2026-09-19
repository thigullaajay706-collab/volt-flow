/* ============================================
   HISTORY — User Charging & Billing History
   ============================================ */

const HistoryPage = {
  async render() {
    const container = document.getElementById('page-history');
    const currentUser = await App.getCurrentUser();

    if (!currentUser) {
      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">📜 Charging History</h1>
          <p class="page-subtitle">View past sessions, power consumption, and solar discounts</p>
        </div>
        <div class="glass-panel-elevated" style="padding: var(--space-2xl); text-align: center;">
          <div style="font-size: 3rem; margin-bottom: var(--space-md);">🔑</div>
          <h3 class="section-title mb-sm">No User Selected</h3>
          <p class="text-secondary mb-lg">Please select or register a user to access historical logs.</p>
          <button class="btn btn-primary" onclick="App.navigate('registration')">Go to Registration</button>
        </div>
      `;
      return;
    }

    const allSessions = await db.getUserSessions(currentUser.id);
    const allVehicles = await db.getUserVehicles(currentUser.id);
    const vehicleMap = {};
    allVehicles.forEach(v => { vehicleMap[v.id] = v; });

    // Calculate aggregated metrics (with safe fallbacks for legacy/seed sessions)
    const totalSessions = allSessions.length;
    const totalKWh = allSessions.reduce((acc, s) => acc + (s.energyConsumed || 0), 0);
    const totalSolarKWh = allSessions.reduce((acc, s) => acc + (s.solarEnergy ?? ((s.energyConsumed || 0) * 0.25)), 0);
    const totalSavings = allSessions.reduce((acc, s) => acc + (s.solarSavings ?? ((s.solarEnergy || (s.energyConsumed || 0) * 0.25) * 8)), 0);
    const totalPaid = allSessions.reduce((acc, s) => acc + (s.finalAmount ?? Math.max(0, ((s.energyConsumed || 0) - (s.solarEnergy || (s.energyConsumed || 0) * 0.25)) * 8)), 0);
    
    const avgSolarPerCharge = totalSessions > 0 ? (totalSolarKWh / totalSessions).toFixed(2) : '0.00';
    const solarSharePct = totalKWh > 0 ? Math.min(100, Math.round((totalSolarKWh / totalKWh) * 100)) : 25;

    container.innerHTML = `
      <div class="page-header">
        <div class="flex justify-between items-center flex-wrap gap-md">
          <div>
            <h1 class="page-title">📜 Charging History</h1>
            <p class="page-subtitle">All past sessions and savings for <strong>${currentUser.name}</strong></p>
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-secondary btn-sm" onclick="HistoryPage.exportCSV()">
              📥 Export CSV
            </button>
          </div>
        </div>
      </div>

      <!-- 1. History Summary Stats (Including 3rd Section: Amount Saved on Solar Electrical Supply) -->
      <div class="dashboard-metrics-grid mb-xl" style="opacity: 1;">
        <div class="glass-stat" style="border-left: 3px solid #00d4ff; opacity: 1;">
          <div class="stat-icon accent-cyan">⚡</div>
          <div class="stat-value">${totalSessions}</div>
          <div class="stat-label">Total Sessions</div>
          <div class="stat-change positive" style="color: #69a760;">● Completed & Active</div>
        </div>

        <div class="glass-stat" style="border-left: 3px solid #a855f7; opacity: 1;">
          <div class="stat-icon accent-purple">🔌</div>
          <div class="stat-value">${Utils.formatKWh(totalKWh)}</div>
          <div class="stat-label">Total Energy Consumed</div>
          <div class="stat-change text-secondary">All vehicles combined</div>
        </div>

        <!-- Section 3: Amount Saved on the Solar Electrical Supply (Filling the Gap) -->
        <div class="glass-stat" style="border-left: 3px solid #53854C; background: rgba(83, 133, 76, 0.12); box-shadow: 0 0 25px rgba(83, 133, 76, 0.25); opacity: 1 !important;">
          <div class="stat-icon" style="background: rgba(83, 133, 76, 0.25); color: #69a760;">☀️</div>
          <div class="stat-value" style="color: #69a760;">${Utils.formatCurrency(totalSavings)}</div>
          <div class="stat-label" style="color: #ffffff; font-weight: 600;">Amount Saved on the Solar Electrical Supply</div>
          <div class="stat-change positive" style="color: #69a760; font-weight: 600;">+${Utils.formatKWh(totalSolarKWh)} 100% Free Solar</div>
        </div>

        <div class="glass-stat" style="border-left: 3px solid #00d4ff; opacity: 1;">
          <div class="stat-icon" style="background: rgba(0, 212, 255, 0.15); color: #00d4ff;">💳</div>
          <div class="stat-value text-accent">${Utils.formatCurrency(totalPaid)}</div>
          <div class="stat-label">Total Amount Paid</div>
          <div class="stat-change positive" style="color: #69a760;">Net after solar offset</div>
        </div>
      </div>

      <!-- 2. Dedicated Section: Amount Saved on the Solar Electrical Supply (Energy Saved After Every Charge) -->
      <div class="glass-panel-elevated mb-xl" style="padding: 24px 28px; background: rgba(83, 133, 76, 0.05); border: 1px solid rgba(83, 133, 76, 0.35); box-shadow: 0 8px 30px rgba(83, 133, 76, 0.12); border-radius: var(--radius-lg);">
        <div class="flex justify-between items-center flex-wrap gap-md mb-lg">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider" style="color: #69a760;">☀️ 100% Free Rooftop Solar Tariff</div>
            <h3 class="section-title" style="color: #ffffff; font-size: 1.25rem;">Amount Saved on the Solar Electrical Supply</h3>
            <p class="text-xs text-secondary mt-xs">Total energy saved by the user after every charge from the 160 kVA rooftop microgrid</p>
          </div>
          <span class="tag" style="background: #53854C; color: #ffffff; font-weight: 700; padding: 6px 16px; border-radius: var(--radius-full);">
            ₹0.00 / kWh 100% FREE SOLAR TARIFF
          </span>
        </div>

        <div class="grid-3 gap-lg mb-lg">
          <div class="glass-card" style="padding: 16px 20px; background: rgba(255,255,255,0.03); border-color: rgba(83, 133, 76, 0.3);">
            <div class="text-xs text-secondary mb-xs">Total Financial Savings</div>
            <div class="text-2xl font-bold font-display" style="color: #69a760;">${Utils.formatCurrency(totalSavings)}</div>
            <div class="text-xs mt-xs" style="color: #69a760;">Direct money saved off grid rates</div>
          </div>

          <div class="glass-card" style="padding: 16px 20px; background: rgba(255,255,255,0.03); border-color: rgba(255, 184, 0, 0.3);">
            <div class="text-xs text-secondary mb-xs">Total Solar Energy Saved</div>
            <div class="text-2xl font-bold font-display text-amber">${Utils.formatKWh(totalSolarKWh)}</div>
            <div class="text-xs text-secondary mt-xs">Delivered 100% free of charge</div>
          </div>

          <div class="glass-card" style="padding: 16px 20px; background: rgba(255,255,255,0.03); border-color: rgba(0, 212, 255, 0.3);">
            <div class="text-xs text-secondary mb-xs">Average Energy Saved After Every Charge</div>
            <div class="text-2xl font-bold font-display text-accent">~${avgSolarPerCharge} kWh</div>
            <div class="text-xs text-secondary mt-xs">${solarSharePct}% of energy supplied free via solar</div>
          </div>
        </div>

        <!-- Solar Energy Contribution Bar -->
        <div>
          <div class="flex justify-between text-xs mb-xs">
            <span style="color: #69a760; font-weight: 600;">☀️ Clean Solar Energy Offset (${solarSharePct}%)</span>
            <span class="text-secondary">⚡ Grid Supply (${100 - solarSharePct}%)</span>
          </div>
          <div class="progress-bar green" style="height: 10px;">
            <div class="progress-bar-fill" style="width: ${solarSharePct}%; background: linear-gradient(90deg, #53854C, #69a760);"></div>
          </div>
        </div>
      </div>

      <!-- 3. Sessions Table with Energy Saved After Every Charge -->
      <div class="glass-panel-elevated" style="padding: var(--space-xl);">
        <div class="section-header">
          <div>
            <h3 class="section-title">Session Logs & Energy Saved Per Charge</h3>
            <p class="text-xs text-secondary">Breakdown of energy consumed and solar energy saved after each individual session</p>
          </div>
          <span class="tag tag-cyan">${totalSessions} Records</span>
        </div>

        ${totalSessions === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📁</div>
            <div class="empty-title">No charging history recorded</div>
            <div class="empty-description">Complete your first charging session to view detailed analytics.</div>
            <button class="btn btn-primary btn-sm" onclick="App.navigate('booking')">Book Now</button>
          </div>
        ` : `
          <div class="glass-table-wrapper" style="overflow-x: auto;">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Vehicle</th>
                  <th>Point</th>
                  <th>Priority Mode</th>
                  <th>Energy (kWh)</th>
                  <th>☀️ Solar Saved (kWh)</th>
                  <th>💰 Amount Saved (₹)</th>
                  <th>Net Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${allSessions.slice().reverse().map(session => {
                  const v = vehicleMap[session.vehicleId] || {};
                  const sessKWh = session.energyConsumed || 0;
                  const sessSolarKWh = session.solarEnergy ?? (sessKWh * 0.25);
                  const sessSavings = session.solarSavings ?? (sessSolarKWh * 8);
                  const sessFinalPaid = session.finalAmount ?? Math.max(0, (sessKWh - sessSolarKWh) * 8);

                  return `
                    <tr>
                      <td>
                        <div class="font-medium">${Utils.formatDate(session.startTime)}</div>
                        <div class="text-xs text-secondary">${Utils.formatTime(session.startTime)}</div>
                      </td>
                      <td>
                        <div class="font-semibold">${Utils.getVehicleIcon(v.type)} ${v.make || ''} ${v.model || v.type || 'Vehicle'}</div>
                        <div class="text-xs text-secondary font-mono">${v.registrationNumber || session.vehicleId}</div>
                      </td>
                      <td><span class="tag tag-cyan">${session.pointId}</span></td>
                      <td>
                        ${session.isUrgent 
                          ? '<span class="tag tag-red">🚨 Urgent Fast</span>' 
                          : (session.isBatteryExchange ? '<span class="tag tag-amber">🔄 Battery Swap</span>' : '<span class="tag tag-green">🌿 Eco Solar</span>')
                        }
                      </td>
                      <td class="font-semibold">${Utils.formatKWh(sessKWh)}</td>
                      <td class="text-amber font-semibold">☀️ ${Utils.formatKWh(sessSolarKWh)}</td>
                      <td class="font-bold" style="color: #69a760;">${Utils.formatCurrency(sessSavings)}</td>
                      <td class="font-bold text-accent">${Utils.formatCurrency(sessFinalPaid)}</td>
                      <td>
                        <span class="tag ${session.status === 'completed' ? 'tag-green' : 'tag-amber'}">
                          ${session.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  async exportCSV() {
    const currentUser = await App.getCurrentUser();
    if (!currentUser) return;

    const sessions = await db.getUserSessions(currentUser.id);
    if (!sessions.length) {
      Utils.showToast('No sessions to export', 'info');
      return;
    }

    const rows = sessions.map(s => ({
      SessionID: s.id,
      Date: Utils.formatDate(s.startTime),
      StartTime: Utils.formatTime(s.startTime),
      Point: s.pointId,
      IsUrgent: s.isUrgent ? 'YES' : 'NO',
      EnergyKWh: s.energyConsumed,
      SolarKWh: s.solarEnergy,
      SolarSavingsINR: s.solarSavings,
      FinalPaidINR: s.finalAmount,
      Status: s.status
    }));

    Utils.exportCSV(rows, `ev-charging-history-${currentUser.phone}`);
    Utils.showToast('Charging history downloaded as CSV', 'success');
  }
};
