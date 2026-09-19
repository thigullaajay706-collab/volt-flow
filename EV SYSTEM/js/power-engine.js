/* ============================================
   POWER ENGINE — Smart Power Distribution
   Core algorithm for EV charging allocation
   ============================================ */

class PowerEngine {
  constructor(database) {
    this.db = database;
    this.settings = {};
    this.currentDistribution = null;
    this.timeSeriesData = [];
    this.initTimeSeries();
  }

  initTimeSeries() {
    // Generate initial 12 data points (last 1 hour in 5-min intervals)
    const now = Date.now();
    for (let i = 11; i >= 0; i--) {
      const timestamp = new Date(now - i * 5 * 60 * 1000);
      const timeStr = timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const variance = (Math.sin(i * 0.8) * 4) + (Math.random() * 2 - 1);
      const houseHold = Math.round((96 + variance) * 10) / 10; // ~60% of 160 kVA
      const evLoad = Math.round((48 - variance * 0.8) * 10) / 10;
      const solar = Math.round((18 + Math.cos(i * 0.5) * 4) * 10) / 10;

      this.timeSeriesData.push({
        time: timeStr,
        householdPower: houseHold,
        evGridPower: evLoad,
        solarPower: solar,
        transformerTotal: Math.round((houseHold + evLoad) * 10) / 10
      });
    }
  }

  addLiveSample(houseHold, evLoad, solar) {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.timeSeriesData.push({
      time: timeStr,
      householdPower: Math.round(houseHold * 10) / 10,
      evGridPower: Math.round(evLoad * 10) / 10,
      solarPower: Math.round(solar * 10) / 10,
      transformerTotal: Math.round((houseHold + evLoad) * 10) / 10
    });
    if (this.timeSeriesData.length > 20) {
      this.timeSeriesData.shift();
    }
  }

  async loadSettings() {
    this.settings = await this.db.getAllSettings();
    if (!this.settings.totalCapacity || this.settings.totalCapacity < 160) {
      this.settings.totalCapacity = 160;
    }
    return this.settings;
  }

  /**
   * Get realistic maximum charging speed based on vehicle type and urgency
   */
  getVehicleMaxChargingSpeed(vehicle, isUrgent) {
    const type = vehicle?.type || 'car';
    if (type === 'car') {
      return isUrgent ? 22.0 : 7.2; // 22 kW DC Fast / 7.2 kW AC Type 2
    } else if (type === 'bike' || type === 'scooter') {
      return isUrgent ? 6.0 : 3.3; // 6 kW Fast / 3.3 kW Standard
    } else if (type === 'bicycle') {
      return isUrgent ? 1.0 : 0.5; // 1 kW / 0.5 kW
    }
    return isUrgent ? 22.0 : 7.2;
  }

  /**
   * Main distribution calculation
   * Returns the power allocation for each charging point
   */
  async calculateDistribution() {
    await this.loadSettings();

    const totalCapacity = this.settings.totalCapacity || 160; // 160 kVA
    const buildingPct = this.settings.buildingConsumption || 60;
    const solarPct = this.settings.solarCapacity || 15;

    // Add slight realistic live fluctuation (±2%)
    const liveVariation = (Math.random() * 2 - 1);
    const liveBuildingPct = Math.min(80, Math.max(40, buildingPct + liveVariation));

    const buildingKW = (liveBuildingPct / 100) * totalCapacity;
    const solarKW = (solarPct / 100) * totalCapacity;
    const availableForEV = totalCapacity - buildingKW; // kVA/kW available for EV
    const availableForEVPct = 100 - liveBuildingPct; // percentage available

    // Get all charging points and active bookings
    const allPoints = await this.db.getAll('charging_points');
    const activeBookings = await this.db.getByIndex('bookings', 'status', 'active');
    const allVehicles = await this.db.getAll('vehicles');
    const vehicleMap = {};
    allVehicles.forEach(v => { vehicleMap[v.id] = v; });

    // Map bookings to points
    const pointBookings = {};
    activeBookings.forEach(b => {
      if (b.pointId) pointBookings[b.pointId] = b;
    });

    // Separate urgent and non-urgent
    const urgentPoints = [];
    const nonUrgentPoints = [];
    const freePoints = [];

    allPoints.forEach(point => {
      const booking = pointBookings[point.id];
      if (point.status === 'occupied' && booking) {
        const vehicle = vehicleMap[booking.vehicleId];
        if (booking.isUrgent) {
          urgentPoints.push({ point, booking, vehicle });
        } else {
          nonUrgentPoints.push({ point, booking, vehicle });
        }
      } else {
        freePoints.push(point);
      }
    });

    const totalOccupied = urgentPoints.length + nonUrgentPoints.length;
    const totalPoints = allPoints.length;

    // Calculate allocations
    const allocations = {};
    let totalAllocated = 0;

    if (totalOccupied === 0) {
      allPoints.forEach(p => {
        allocations[p.id] = {
          powerKW: 0,
          powerPct: 0,
          source: 'none',
          solarKW: 0,
          gridKW: 0
        };
      });
    } else {
      const urgentWeight = 1.0;
      const nonUrgentWeight = 0.6;
      const totalWeight = (urgentPoints.length * urgentWeight) + (nonUrgentPoints.length * nonUrgentWeight);
      const perWeightKW = availableForEV / totalWeight;

      if (totalOccupied >= totalPoints) {
        // Full Station logic
        const urgentReduction = 0.04;
        const nonUrgentReduction = 0.01;
        const solarPerVehicle = solarKW / totalOccupied;

        urgentPoints.forEach(({ point, booking, vehicle }) => {
          const maxSpeed = this.getVehicleMaxChargingSpeed(vehicle, true);
          const rawKW = (perWeightKW * urgentWeight * (1 - urgentReduction)) + solarPerVehicle;
          const finalKW = Math.min(maxSpeed, rawKW);
          const solarPart = Math.min(solarPerVehicle, finalKW * 0.3);

          allocations[point.id] = {
            powerKW: Math.round(finalKW * 10) / 10,
            powerPct: Math.round((finalKW / totalCapacity) * 100 * 10) / 10,
            source: 'grid+solar',
            solarKW: Math.round(solarPart * 10) / 10,
            gridKW: Math.round((finalKW - solarPart) * 10) / 10,
            isUrgent: true,
            reduction: urgentReduction * 100
          };
          totalAllocated += finalKW;
        });

        nonUrgentPoints.forEach(({ point, booking, vehicle }) => {
          const maxSpeed = this.getVehicleMaxChargingSpeed(vehicle, false);
          const rawKW = (perWeightKW * nonUrgentWeight * (1 - nonUrgentReduction)) + solarPerVehicle;
          const finalKW = Math.min(maxSpeed, rawKW);
          const solarPart = Math.min(solarPerVehicle, finalKW * 0.3);

          allocations[point.id] = {
            powerKW: Math.round(finalKW * 10) / 10,
            powerPct: Math.round((finalKW / totalCapacity) * 100 * 10) / 10,
            source: 'grid+solar',
            solarKW: Math.round(solarPart * 10) / 10,
            gridKW: Math.round((finalKW - solarPart) * 10) / 10,
            isUrgent: false,
            reduction: nonUrgentReduction * 100
          };
          totalAllocated += finalKW;
        });
      } else {
        // Partial occupancy
        const solarPerVehicle = solarKW / totalOccupied;

        urgentPoints.forEach(({ point, booking, vehicle }) => {
          const maxSpeed = this.getVehicleMaxChargingSpeed(vehicle, true);
          const rawKW = (perWeightKW * urgentWeight) + solarPerVehicle;
          const finalKW = Math.min(maxSpeed, rawKW);
          const solarPart = Math.min(solarPerVehicle, finalKW * 0.3);

          allocations[point.id] = {
            powerKW: Math.round(finalKW * 10) / 10,
            powerPct: Math.round((finalKW / totalCapacity) * 100 * 10) / 10,
            source: 'grid+solar',
            solarKW: Math.round(solarPart * 10) / 10,
            gridKW: Math.round((finalKW - solarPart) * 10) / 10,
            isUrgent: true,
            reduction: 0
          };
          totalAllocated += finalKW;
        });

        nonUrgentPoints.forEach(({ point, booking, vehicle }) => {
          const maxSpeed = this.getVehicleMaxChargingSpeed(vehicle, false);
          const rawKW = (perWeightKW * nonUrgentWeight) + solarPerVehicle;
          const finalKW = Math.min(maxSpeed, rawKW);
          const solarPart = Math.min(solarPerVehicle, finalKW * 0.3);

          allocations[point.id] = {
            powerKW: Math.round(finalKW * 10) / 10,
            powerPct: Math.round((finalKW / totalCapacity) * 100 * 10) / 10,
            source: 'grid+solar',
            solarKW: Math.round(solarPart * 10) / 10,
            gridKW: Math.round((finalKW - solarPart) * 10) / 10,
            isUrgent: false,
            reduction: 0
          };
          totalAllocated += finalKW;
        });

        freePoints.forEach(point => {
          allocations[point.id] = {
            powerKW: 0,
            powerPct: 0,
            source: 'none',
            solarKW: 0,
            gridKW: 0
          };
        });
      }
    }

    // Build the full distribution result
    this.currentDistribution = {
      timestamp: new Date().toISOString(),
      transformer: {
        totalCapacityKW: totalCapacity,
        buildingConsumptionKW: buildingKW,
        buildingConsumptionPct: buildingPct,
        evAvailableKW: availableForEV,
        evAvailablePct: availableForEVPct,
        solarGenerationKW: solarKW,
        solarGenerationPct: solarPct
      },
      stations: {
        totalPoints: totalPoints,
        occupied: totalOccupied,
        available: totalPoints - totalOccupied,
        urgentCount: urgentPoints.length,
        nonUrgentCount: nonUrgentPoints.length
      },
      allocations,
      totalAllocatedKW: Math.round(totalAllocated * 100) / 100,
      totalSolarUsedKW: Math.round(Object.values(allocations).reduce((sum, a) => sum + a.solarKW, 0) * 100) / 100
    };

    // Log the distribution
    await this.logDistribution(this.currentDistribution);

    return this.currentDistribution;
  }

  /**
   * Handle a new vehicle arriving when station is at capacity
   * Scenario 1: Urgent vehicle — reduce all others, solar compensates
   * Scenario 2: Non-urgent — divide from non-urgent pool
   */
  async handleNewArrivalAtCapacity(isUrgent) {
    await this.loadSettings();
    const distribution = await this.calculateDistribution();

    // This is handled within calculateDistribution() when all points are full
    // The method recalculates with the new vehicle already booked
    return distribution;
  }

  /**
   * Estimate charging time based on vehicle battery & current charge
   */
  estimateChargingTime(batteryCapacityKWh, currentChargePct, allocatedPowerKW) {
    if (allocatedPowerKW <= 0) return Infinity;

    const currentChargeKWh = (currentChargePct / 100) * batteryCapacityKWh;
    const remainingKWh = batteryCapacityKWh - currentChargeKWh;

    // Account for charging efficiency (~90%) and tapering at high SoC
    const efficiency = 0.9;
    const effectivePower = allocatedPowerKW * efficiency;

    // Charging slows down above 80% — rough model
    const linearKWh = Math.min(remainingKWh, batteryCapacityKWh * 0.8 - currentChargeKWh);
    const taperKWh = Math.max(0, remainingKWh - linearKWh);

    const linearHours = Math.max(0, linearKWh) / effectivePower;
    const taperHours = taperKWh > 0 ? taperKWh / (effectivePower * 0.5) : 0; // 50% speed for taper

    const totalHours = linearHours + taperHours;
    return Math.round(totalHours * 60); // minutes
  }

  /**
   * Calculate departure time
   */
  calculateDepartureTime(arrivalTime, chargingMinutes) {
    const arrival = new Date(arrivalTime);
    const departure = new Date(arrival.getTime() + chargingMinutes * 60 * 1000);
    return departure.toISOString();
  }

  /**
   * Calculate cost for a session
   */
  async calculateCost(energyConsumedKWh, solarEnergyKWh) {
    await this.loadSettings();
    const buildingType = this.settings.buildingType || 'residential';
    const rate = buildingType === 'commercial'
      ? (this.settings.commercialRatePerKWh || 12)
      : (this.settings.ratePerKWh || 8);

    const billableEnergy = Math.max(0, energyConsumedKWh - solarEnergyKWh);
    const totalCost = billableEnergy * rate;
    const solarSavings = solarEnergyKWh * rate;

    return {
      totalEnergyKWh: Math.round(energyConsumedKWh * 100) / 100,
      solarEnergyKWh: Math.round(solarEnergyKWh * 100) / 100,
      billableEnergyKWh: Math.round(billableEnergy * 100) / 100,
      ratePerKWh: rate,
      totalCost: Math.round(totalCost * 100) / 100,
      solarSavings: Math.round(solarSavings * 100) / 100,
      finalAmount: Math.round(totalCost * 100) / 100,
      currency: '₹'
    };
  }

  /**
   * Get real-time solar output (simulated based on time of day)
   */
  getSimulatedSolarOutput() {
    const hour = new Date().getHours();
    const baseSolar = this.settings.solarCapacity || 15;

    // Solar curve: peaks at noon, 0 at night
    if (hour < 6 || hour > 19) return 0;
    if (hour < 8 || hour > 17) return baseSolar * 0.3;
    if (hour < 10 || hour > 15) return baseSolar * 0.7;
    return baseSolar; // peak hours 10-15
  }

  /**
   * Log distribution to power_logs
   */
  async logDistribution(distribution) {
    await this.db.add('power_logs', {
      id: this.db.generateId(),
      timestamp: distribution.timestamp,
      totalSupply: distribution.transformer.totalCapacityKW,
      buildingConsumption: distribution.transformer.buildingConsumptionKW,
      evAllocation: distribution.transformer.evAvailableKW,
      solarGeneration: distribution.transformer.solarGenerationKW,
      activeSessions: distribution.stations.occupied,
      pointAllocations: distribution.allocations,
      totalAllocatedKW: distribution.totalAllocatedKW
    });
  }

  /**
   * Get distribution summary for dashboard
   */
  async getDashboardSummary() {
    const distribution = await this.calculateDistribution();
    const allSessions = await this.db.getAll('sessions');
    const allPayments = await this.db.getAll('payments');

    // Calculate totals
    const totalEnergy = allSessions.reduce((sum, s) => sum + (s.energyConsumed || 0), 0);
    const totalSolar = allSessions.reduce((sum, s) => sum + (s.solarEnergy || 0), 0);
    const totalSavings = allPayments.reduce((sum, p) => sum + (p.solarDiscount || 0), 0);
    const totalRevenue = allPayments.reduce((sum, p) => sum + (p.finalAmount || 0), 0);

    return {
      distribution,
      stats: {
        totalEnergy: Math.round(totalEnergy * 100) / 100,
        totalSolar: Math.round(totalSolar * 100) / 100,
        totalSavings: Math.round(totalSavings * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSessions: allSessions.length,
        activeSessions: allSessions.filter(s => s.status === 'active').length
      }
    };
  }
}

// Singleton
const powerEngine = new PowerEngine(db);
