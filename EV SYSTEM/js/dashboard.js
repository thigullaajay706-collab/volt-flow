/* ============================================
   DASHBOARD — Admin/Transformer Dashboard
   ============================================ */

const DashboardPage = {
  chartInstances: {},
  refreshInterval: null,

  async render() {
    const container = document.getElementById('page-dashboard');
    const summary = await powerEngine.getDashboardSummary();
    const dist = summary.distribution;
    const stats = summary.stats;
    const solarNow = powerEngine.getSimulatedSolarOutput();

    // Record sample in live series
    powerEngine.addLiveSample(
      dist.transformer.buildingConsumptionKW,
      dist.totalAllocatedKW,
      dist.transformer.solarGenerationKW
    );

    // Carbon offset estimate (~0.82 kg CO2 per kWh solar generated)
    const carbonSavedKg = Math.round(stats.totalSolar * 0.82);

    container.innerHTML = `
      <div class="page-header">
        <div class="flex justify-between items-center flex-wrap gap-md">
          <div>
            <h1 class="page-title">⚡ Smart Microgrid Power Dashboard</h1>
            <p class="page-subtitle">Real-time 160 kVA Transformer load balancing & solar generation monitoring</p>
          </div>
          <div class="flex gap-md items-center">
            <span class="tag tag-green" style="background: rgba(83, 133, 76, 0.18); color: #69a760; border: 1px solid #53854C;">
              ● Grid Frequency 50.0 Hz (Stable)
            </span>
            <button class="btn btn-secondary btn-sm" onclick="DashboardPage.refresh()">↻ Refresh</button>
            <button class="btn btn-secondary btn-sm" onclick="db.exportDatabase()">📥 Export DB</button>
          </div>
        </div>
      </div>

      <!-- 1. Primary Metrics Row (160 kVA Transformer & Dynamic Allocation with Increased Spacing) -->
      <div class="dashboard-metrics-grid mb-2xl stagger-list">
        <div class="glass-stat animate-in" style="border-left: 3px solid #00d4ff;">
          <div class="stat-icon accent-cyan">⚡</div>
          <div class="stat-value">160.0 kVA</div>
          <div class="stat-label">Transformer Output</div>
          <div class="stat-change positive" style="color: #69a760;">● Active Grid Capacity</div>
        </div>

        <div class="glass-stat animate-in" style="border-left: 3px solid #a855f7;">
          <div class="stat-icon accent-purple">🏢</div>
          <div class="stat-value">${Utils.formatKW(dist?.transformer?.buildingConsumptionKW || 96)}</div>
          <div class="stat-label">Household / Building Demand</div>
          <div class="stat-change text-secondary">${Number(dist?.transformer?.buildingConsumptionPct || 60).toFixed(1)}% of 160 kVA (Dynamic)</div>
        </div>

        <div class="glass-stat animate-in" style="border-left: 3px solid #53854C;">
          <div class="stat-icon" style="background: rgba(83, 133, 76, 0.2); color: #69a760;">🔌</div>
          <div class="stat-value" style="color: #69a760;">${Utils.formatKW(dist?.transformer?.evAvailableKW || 64)}</div>
          <div class="stat-label">EV Station Grid Supply</div>
          <div class="stat-change positive" style="color: #69a760;">● ${Number(dist?.transformer?.evAvailablePct || 40).toFixed(1)}% Available</div>
        </div>

        <div class="glass-stat animate-in solar-glow" style="border-left: 3px solid #ffb800;">
          <div class="stat-icon accent-amber">☀️</div>
          <div class="stat-value text-amber">${Utils.formatKW(dist.transformer.solarGenerationKW)}</div>
          <div class="stat-label">Solar Generation Output</div>
          <div class="stat-change positive" style="color: #69a760;">100% Free Energy</div>
        </div>
      </div>

      <!-- 2. Live Power Variation Graph (House-hold Power vs Charging Points vs Solar) -->
      <div class="glass-panel-elevated mb-xl" style="padding: var(--space-xl);">
        <div class="section-header">
          <div>
            <h3 class="section-title">📈 Real-Time Power Variations</h3>
            <p class="text-xs text-secondary">Live load fluctuations between Household Demand, EV Charging Station, and Rooftop Solar</p>
          </div>
          <div class="flex gap-sm items-center">
            <span class="tag" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">● Household</span>
            <span class="tag" style="background: rgba(83, 133, 76, 0.2); color: #69a760;">● EV Charging Points</span>
            <span class="tag" style="background: rgba(255, 184, 0, 0.15); color: #fbbf24;">● Solar</span>
          </div>
        </div>
        <div style="position: relative; height: 320px; width: 100%;">
          <canvas id="chart-live-power-variation"></canvas>
        </div>
      </div>

      <!-- 3. Dedicated Total Solar Savings & Clean Energy Impact Section -->
      <div class="glass-panel-elevated mb-xl solar-glow" style="padding: var(--space-xl); background: rgba(83, 133, 76, 0.05); border: 1px solid rgba(83, 133, 76, 0.3);">
        <div class="section-header">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider" style="color: #69a760;">🌟 Clean Energy Dividend</div>
            <h3 class="section-title" style="color: #ffffff;">Total Savings from Solar Generation</h3>
          </div>
          <span class="tag" style="background: #53854C; color: #ffffff; font-weight: 700;">
            100% FREE SOLAR TARIFF
          </span>
        </div>

        <div class="grid-4 gap-lg">
          <div class="glass-card" style="border-color: rgba(83, 133, 76, 0.3);">
            <div class="text-xs text-secondary mb-xs">Cumulative Money Saved</div>
            <div class="font-bold text-3xl font-display" style="color: #69a760;">
              ${Utils.formatCurrency(stats.totalSavings)}
            </div>
            <div class="text-xs mt-xs" style="color: #69a760;">Direct consumer bill savings</div>
          </div>

          <div class="glass-card" style="border-color: rgba(255, 184, 0, 0.2);">
            <div class="text-xs text-secondary mb-xs">Clean Solar Energy Delivered</div>
            <div class="font-bold text-3xl font-display text-amber">
              ${Utils.formatKWh(stats.totalSolar)}
            </div>
            <div class="text-xs text-secondary mt-xs">Zero-emission electricity</div>
          </div>

          <div class="glass-card" style="border-color: rgba(0, 212, 255, 0.2);">
            <div class="text-xs text-secondary mb-xs">Total Grid Energy Dispatched</div>
            <div class="font-bold text-3xl font-display text-accent">
              ${Utils.formatKWh(stats.totalEnergy)}
            </div>
            <div class="text-xs text-secondary mt-xs">Across all 5 charging points</div>
          </div>

          <div class="glass-card" style="border-color: rgba(83, 133, 76, 0.3);">
            <div class="text-xs text-secondary mb-xs">Carbon Offset Achieved</div>
            <div class="font-bold text-3xl font-display" style="color: #69a760;">
              ${carbonSavedKg} kg CO₂
            </div>
            <div class="text-xs text-secondary mt-xs">Equivalent to 4 planted trees</div>
          </div>
        </div>
      </div>

      <!-- 4. Charging Points Grid Status (5 Points) -->
      <div class="section-header">
        <div>
          <h3 class="section-title">Smart Grid Points Status (5 Points)</h3>
          <p class="text-xs text-secondary">Urgent vehicles receive maximum priority; load redistributes upon station capacity</p>
        </div>
        <span class="tag tag-green" style="background: rgba(83, 133, 76, 0.2); color: #69a760;">
          ${dist.stations.available} of 5 Points Free
        </span>
      </div>
      <div class="grid-5 mb-xl stagger-list">
        ${this.renderChargingPoints(dist)}
      </div>

      <!-- 5. Capacity & Distribution Donut Chart Row -->
      <div class="grid-2 mb-xl">
        <div class="glass-panel-elevated" style="padding: var(--space-xl);">
          <h3 class="section-title mb-lg">160 kVA Transformer Allocation Breakdown</h3>
          <div style="position: relative; height: 260px;">
            <canvas id="chart-power-distribution"></canvas>
          </div>
        </div>
        <div class="glass-panel-elevated" style="padding: var(--space-xl);">
          <h3 class="section-title mb-lg">Microgrid System Specs</h3>
          <div class="flex flex-col gap-md">
            <div class="glass-card flex justify-between items-center">
              <div>
                <div class="text-xs text-secondary">Base Transformer Rating</div>
                <div class="font-bold text-lg text-primary">160 kVA (3-Phase 415V)</div>
              </div>
              <span class="tag tag-cyan">Online</span>
            </div>
            <div class="glass-card flex justify-between items-center">
              <div>
                <div class="text-xs text-secondary">Rooftop Solar Array Capacity</div>
                <div class="font-bold text-lg text-amber">24 kW Peak (15% Grid Offset)</div>
              </div>
              <span class="tag tag-amber">☀️ Active</span>
            </div>
            <div class="glass-card flex justify-between items-center" style="border-color: rgba(83, 133, 76, 0.3);">
              <div>
                <div class="text-xs text-secondary">Dynamic Priority Rule</div>
                <div class="font-bold text-lg" style="color: #69a760;">Urgent (1.3x) + Solar Top-Up</div>
              </div>
              <span class="tag tag-green" style="background: rgba(83, 133, 76, 0.2); color: #69a760;">Enforced</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.initCharts(dist);
    this.startAutoRefresh();
  },

  renderChargingPoints(dist) {
    let html = '';

    for (let i = 0; i < 5; i++) {
      const pointId = `CP-${i + 1}`;
      const alloc = dist.allocations[pointId] || { powerKW: 0, powerPct: 0, source: 'none' };
      const isOccupied = alloc.powerKW > 0;
      const statusClass = isOccupied ? (alloc.isUrgent ? 'occupied' : 'booked') : 'available';
      const statusText = isOccupied ? (alloc.isUrgent ? '🚨 Urgent' : '⚡ Standard') : '🟢 Available';

      html += `
        <div class="glass-card charging-point-card ${isOccupied ? 'liquid-glow' : ''}" style="border-color: ${isOccupied ? (alloc.isUrgent ? 'rgba(255,77,106,0.3)' : 'rgba(83,133,76,0.4)') : 'var(--glass-border)'}">
          <div class="point-card-content">
            <div class="point-number">Grid Point ${i + 1}</div>
            <div class="point-status-dot ${statusClass}"></div>
            <div class="point-vehicle font-semibold">${statusText}</div>
            <div class="point-power ${isOccupied ? 'charging-active' : ''}" 
                 style="color: ${isOccupied ? (alloc.isUrgent ? 'var(--color-accent-red)' : '#69a760') : 'var(--text-tertiary)'}">
              ${Utils.formatKW(alloc.powerKW)}
            </div>
          </div>
          <div class="point-card-footer">
            <div class="progress-bar ${isOccupied ? (alloc.isUrgent ? 'red' : 'green') : ''}">
              <div class="progress-bar-fill ${isOccupied ? 'power-flow-bar' : ''}" 
                   style="width: ${isOccupied ? Math.min(100, (alloc.powerKW / 22) * 100) : 0}%; background: ${alloc.isUrgent ? 'linear-gradient(90deg, #ff4d6a, #ff7b90)' : 'linear-gradient(90deg, #53854C, #69a760)'}"></div>
            </div>
            <div class="point-bottom-label">
              ${isOccupied 
                ? (alloc.solarKW > 0 ? `<span style="color: #69a760;">☀️ ${Utils.formatKW(alloc.solarKW)} free solar</span>` : '')
                : `<button class="ready-connect-btn" onclick="App.navigate('booking')">Ready to connect</button>`
              }
            </div>
            ${alloc.reduction > 0 ? `<div class="text-xs text-amber" style="margin-top: 4px;">↓ ${alloc.reduction}% redistributed</div>` : ''}
          </div>
        </div>
      `;
    }
    return html;
  },

  initCharts(dist) {
    if (typeof Chart === 'undefined') {
      console.warn('⚠️ Chart.js not loaded yet or offline.');
      return;
    }

    // 1. Live Power Variation Multi-Line Spline Chart
    const liveCtx = document.getElementById('chart-live-power-variation');
    if (liveCtx) {
      if (this.chartInstances.liveVariation) this.chartInstances.liveVariation.destroy();

      const timeSeries = powerEngine.timeSeriesData;
      const labels = timeSeries.map(d => d.time);
      const householdData = timeSeries.map(d => d.householdPower);
      const evData = timeSeries.map(d => d.evGridPower);
      const solarData = timeSeries.map(d => d.solarPower);

      this.chartInstances.liveVariation = new Chart(liveCtx.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Household / Building Load (kVA/kW)',
              data: householdData,
              borderColor: '#a855f7',
              backgroundColor: 'rgba(168, 85, 247, 0.08)',
              borderWidth: 2.5,
              tension: 0.4,
              fill: true,
              pointRadius: 3,
              pointHoverRadius: 6
            },
            {
              label: 'EV Charging Points Load (kW)',
              data: evData,
              borderColor: '#53854C',
              backgroundColor: 'rgba(83, 133, 76, 0.15)',
              borderWidth: 2.5,
              tension: 0.4,
              fill: true,
              pointRadius: 3,
              pointHoverRadius: 6
            },
            {
              label: 'Rooftop Solar Output (kW)',
              data: solarData,
              borderColor: '#ffb800',
              backgroundColor: 'rgba(255, 184, 0, 0.05)',
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.4,
              fill: false,
              pointRadius: 2,
              pointHoverRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: 'rgba(255,255,255,0.75)',
                font: { family: 'Inter', size: 12 },
                usePointStyle: true,
                padding: 16
              }
            },
            tooltip: {
              backgroundColor: 'rgba(10, 14, 39, 0.9)',
              titleColor: '#00d4ff',
              bodyColor: '#ffffff',
              borderColor: 'rgba(83, 133, 76, 0.4)',
              borderWidth: 1,
              padding: 12
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.04)' },
              ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } }
            },
            y: {
              min: 0,
              max: 160,
              grid: { color: 'rgba(255,255,255,0.04)' },
              ticks: {
                color: 'rgba(255,255,255,0.5)',
                font: { size: 11 },
                callback: value => `${value} kW`
              }
            }
          }
        }
      });
    }

    // 2. Power Distribution Donut Chart
    const ctx = document.getElementById('chart-power-distribution');
    if (ctx) {
      if (this.chartInstances.power) this.chartInstances.power.destroy();

      this.chartInstances.power = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Building Demand', 'EV Station Supply', 'Free Solar Power', 'Unused Headroom'],
          datasets: [{
            data: [
              Math.round(dist.transformer.buildingConsumptionPct),
              Math.round(dist.transformer.evAvailablePct - dist.transformer.solarGenerationPct),
              Math.round(dist.transformer.solarGenerationPct),
              Math.max(0, Math.round(100 - dist.transformer.buildingConsumptionPct - dist.transformer.evAvailablePct))
            ],
            backgroundColor: [
              'rgba(168, 85, 247, 0.8)',
              'rgba(83, 133, 76, 0.85)',
              'rgba(255, 184, 0, 0.85)',
              'rgba(255, 255, 255, 0.06)'
            ],
            borderColor: [
              'rgba(168, 85, 247, 1)',
              '#53854C',
              'rgba(255, 184, 0, 1)',
              'rgba(255, 255, 255, 0.1)'
            ],
            borderWidth: 1.5,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: 'rgba(255,255,255,0.7)',
                font: { family: 'Inter', size: 12 },
                padding: 14,
                usePointStyle: true
              }
            }
          }
        }
      });
    }
  },

  async refresh() {
    await this.render();
    Utils.showToast('Dashboard & Live Power Graph Updated', 'success');
  },

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshInterval = setInterval(async () => {
      if (document.getElementById('page-dashboard')?.classList.contains('active')) {
        await this.render();
      }
    }, 12000); // Live tick every 12s
  },

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  },

  destroy() {
    this.stopAutoRefresh();
    Object.values(this.chartInstances).forEach(c => c.destroy());
    this.chartInstances = {};
  }
};
