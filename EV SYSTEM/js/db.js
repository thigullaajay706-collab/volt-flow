/* ============================================
   DATABASE MODULE — IndexedDB Wrapper
   Full persistent database for EV Charging System
   ============================================ */

const DB_NAME = 'EVChargingSystemDB';
const DB_VERSION = 1;

const STORES = {
  users: 'users',
  vehicles: 'vehicles',
  chargingPoints: 'charging_points',
  bookings: 'bookings',
  sessions: 'sessions',
  powerLogs: 'power_logs',
  payments: 'payments',
  batteryExchange: 'battery_exchange',
  settings: 'settings'
};

class EVDatabase {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  /* ── Initialize Database ── */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Users store
        if (!db.objectStoreNames.contains(STORES.users)) {
          const users = db.createObjectStore(STORES.users, { keyPath: 'id' });
          users.createIndex('phone', 'phone', { unique: true });
          users.createIndex('email', 'email', { unique: false });
        }

        // Vehicles store
        if (!db.objectStoreNames.contains(STORES.vehicles)) {
          const vehicles = db.createObjectStore(STORES.vehicles, { keyPath: 'id' });
          vehicles.createIndex('userId', 'userId', { unique: false });
          vehicles.createIndex('type', 'type', { unique: false });
        }

        // Charging Points store
        if (!db.objectStoreNames.contains(STORES.chargingPoints)) {
          const points = db.createObjectStore(STORES.chargingPoints, { keyPath: 'id' });
          points.createIndex('status', 'status', { unique: false });
        }

        // Bookings store
        if (!db.objectStoreNames.contains(STORES.bookings)) {
          const bookings = db.createObjectStore(STORES.bookings, { keyPath: 'id' });
          bookings.createIndex('userId', 'userId', { unique: false });
          bookings.createIndex('pointId', 'pointId', { unique: false });
          bookings.createIndex('status', 'status', { unique: false });
          bookings.createIndex('vehicleId', 'vehicleId', { unique: false });
        }

        // Sessions store
        if (!db.objectStoreNames.contains(STORES.sessions)) {
          const sessions = db.createObjectStore(STORES.sessions, { keyPath: 'id' });
          sessions.createIndex('bookingId', 'bookingId', { unique: false });
          sessions.createIndex('userId', 'userId', { unique: false });
          sessions.createIndex('status', 'status', { unique: false });
        }

        // Power Logs store
        if (!db.objectStoreNames.contains(STORES.powerLogs)) {
          const logs = db.createObjectStore(STORES.powerLogs, { keyPath: 'id' });
          logs.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Payments store
        if (!db.objectStoreNames.contains(STORES.payments)) {
          const payments = db.createObjectStore(STORES.payments, { keyPath: 'id' });
          payments.createIndex('userId', 'userId', { unique: false });
          payments.createIndex('sessionId', 'sessionId', { unique: false });
        }

        // Battery Exchange store
        if (!db.objectStoreNames.contains(STORES.batteryExchange)) {
          const exchange = db.createObjectStore(STORES.batteryExchange, { keyPath: 'id' });
          exchange.createIndex('userId', 'userId', { unique: false });
          exchange.createIndex('vehicleId', 'vehicleId', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        console.log('✅ EVDatabase initialized');
        resolve(this);
      };

      request.onerror = (event) => {
        console.error('❌ Database error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /* ── Seed Initial Data ── */
  async seedInitialData() {
    // Check if already seeded
    const existingPoints = await this.getAll(STORES.chargingPoints);
    if (existingPoints.length > 0) return;

    console.log('🌱 Seeding initial data...');

    // Create 5 charging points
    for (let i = 1; i <= 5; i++) {
      await this.put(STORES.chargingPoints, {
        id: `CP-${i}`,
        name: `Point ${i}`,
        status: 'available', // available, occupied, booked, maintenance
        currentVehicleId: null,
        currentBookingId: null,
        powerAllocation: 0,
        maxPower: 22, // kW
        type: i <= 3 ? 'fast' : 'standard',
        connectorType: 'Type 2'
      });
    }

    // Default settings
    const defaultSettings = [
      { key: 'buildingType', value: 'residential' },
      { key: 'totalCapacity', value: 160 }, // kVA
      { key: 'buildingConsumption', value: 60 }, // percentage
      { key: 'solarCapacity', value: 15 }, // percentage of total
      { key: 'ratePerKWh', value: 8 }, // ₹ per kWh (residential)
      { key: 'commercialRatePerKWh', value: 12 }, // ₹ per kWh (commercial)
      { key: 'solarRatePerKWh', value: 0 }, // FREE
      { key: 'urgentPriorityMultiplier', value: 1.3 },
      { key: 'maxChargingPoints', value: 5 },
      { key: 'batteryExchangeEnabled', value: true },
      { key: 'batteryExchangeRate', value: 150 }, // ₹ per exchange
      { key: 'operatingHours', value: { start: '06:00', end: '22:00' } }
    ];

    for (const setting of defaultSettings) {
      await this.put(STORES.settings, setting);
    }

    // Seed initial power log
    await this.add(STORES.powerLogs, {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      totalSupply: 160,
      buildingConsumption: 96,
      evAllocation: 64,
      solarGeneration: 24,
      activeSessions: 0,
      pointAllocations: {}
    });

    console.log('✅ Initial data seeded');
  }

  /* ── Generic CRUD Operations ── */
  
  // Add a record
  async add(storeName, data) {
    return this._transaction(storeName, 'readwrite', (store) => {
      return store.add(data);
    });
  }

  // Put (add or update) a record
  async put(storeName, data) {
    return this._transaction(storeName, 'readwrite', (store) => {
      return store.put(data);
    });
  }

  // Get a single record by key
  async get(storeName, key) {
    return this._transaction(storeName, 'readonly', (store) => {
      return store.get(key);
    });
  }

  // Get all records
  async getAll(storeName) {
    return this._transaction(storeName, 'readonly', (store) => {
      return store.getAll();
    });
  }

  // Delete a record
  async delete(storeName, key) {
    return this._transaction(storeName, 'readwrite', (store) => {
      return store.delete(key);
    });
  }

  // Clear a store
  async clear(storeName) {
    return this._transaction(storeName, 'readwrite', (store) => {
      return store.clear();
    });
  }

  // Get by index
  async getByIndex(storeName, indexName, value) {
    return this._transaction(storeName, 'readonly', (store) => {
      const index = store.index(indexName);
      return index.getAll(value);
    });
  }

  // Count records
  async count(storeName) {
    return this._transaction(storeName, 'readonly', (store) => {
      return store.count();
    });
  }

  /* ── Specialized Queries ── */

  // Get user by phone
  async getUserByPhone(phone) {
    const results = await this.getByIndex(STORES.users, 'phone', phone);
    return results.length > 0 ? results[0] : null;
  }

  // Get vehicles for a user
  async getUserVehicles(userId) {
    return this.getByIndex(STORES.vehicles, 'userId', userId);
  }

  // Get available charging points
  async getAvailablePoints() {
    return this.getByIndex(STORES.chargingPoints, 'status', 'available');
  }

  // Get active bookings
  async getActiveBookings() {
    return this.getByIndex(STORES.bookings, 'status', 'active');
  }

  // Get user bookings
  async getUserBookings(userId) {
    return this.getByIndex(STORES.bookings, 'userId', userId);
  }

  // Get active sessions
  async getActiveSessions() {
    return this.getByIndex(STORES.sessions, 'status', 'active');
  }

  // Get user sessions (history)
  async getUserSessions(userId) {
    return this.getByIndex(STORES.sessions, 'userId', userId);
  }

  // Get user payments
  async getUserPayments(userId) {
    return this.getByIndex(STORES.payments, 'userId', userId);
  }

  // Get setting value
  async getSetting(key) {
    const result = await this.get(STORES.settings, key);
    return result ? result.value : null;
  }

  // Update setting
  async updateSetting(key, value) {
    return this.put(STORES.settings, { key, value });
  }

  // Get all settings as object
  async getAllSettings() {
    const settings = await this.getAll(STORES.settings);
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    return obj;
  }

  /* ── Export/Import Database ── */

  async exportDatabase() {
    const data = {};
    for (const [name, storeName] of Object.entries(STORES)) {
      data[storeName] = await this.getAll(storeName);
    }
    data._meta = {
      exportedAt: new Date().toISOString(),
      version: DB_VERSION,
      appName: 'EV Smart Charging System'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ev-charging-db-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return data;
  }

  async importDatabase(jsonString) {
    const data = JSON.parse(jsonString);
    for (const [name, storeName] of Object.entries(STORES)) {
      if (data[storeName]) {
        await this.clear(storeName);
        for (const record of data[storeName]) {
          await this.put(storeName, record);
        }
      }
    }
    console.log('✅ Database imported successfully');
  }

  /* ── Utility Methods ── */

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /* ── Internal Transaction Handler ── */
  _transaction(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
const db = new EVDatabase();
