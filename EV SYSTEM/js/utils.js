/* ============================================
   UTILITIES — Helpers, Formatting, Validation
   ============================================ */

const Utils = {
  /* ── Time Formatting ── */
  formatTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  },

  formatDate(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatDateTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
  },

  formatDuration(minutes) {
    if (minutes < 1) return 'Less than a minute';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hrs} hr`;
    return `${hrs} hr ${mins} min`;
  },

  relativeTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return this.formatDate(date);
  },

  /* ── Currency Formatting ── */
  formatCurrency(amount) {
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  formatCurrencyShort(amount) {
    if (amount >= 10000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${Math.round(amount)}`;
  },

  /* ── Number Formatting ── */
  formatKVA(kva) {
    return `${Number(kva).toFixed(1)} kVA`;
  },

  formatKW(kw) {
    return `${Number(kw).toFixed(1)} kW`;
  },

  formatKWh(kwh) {
    return `${Number(kwh).toFixed(2)} kWh`;
  },

  formatPercent(pct) {
    return `${Number(pct).toFixed(1)}%`;
  },

  /* ── Validation ── */
  validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
  },

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  validateRequired(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  },

  /* ── Vehicle Helpers ── */
  getVehicleIcon(type) {
    const icons = {
      car: '🚗',
      bike: '🏍️',
      bicycle: '🚲',
      scooter: '🛵'
    };
    return icons[type] || '🚗';
  },

  getVehicleTypeName(type) {
    const names = {
      car: 'Car',
      bike: 'Bike',
      bicycle: 'E-Bicycle',
      scooter: 'E-Scooter'
    };
    return names[type] || type;
  },

  getBatteryCapacity(type) {
    // Default battery capacities in kWh
    const defaults = {
      car: 40,
      bike: 3,
      bicycle: 0.5,
      scooter: 2
    };
    return defaults[type] || 40;
  },

  isBatteryExchangeEligible(type) {
    return ['bike', 'bicycle', 'scooter'].includes(type);
  },

  /* ── Status Helpers ── */
  getStatusTag(status) {
    const map = {
      available: { text: 'Available', class: 'tag-green' },
      occupied: { text: 'Occupied', class: 'tag-red' },
      booked: { text: 'Booked', class: 'tag-amber' },
      maintenance: { text: 'Maintenance', class: 'tag-purple' },
      active: { text: 'Active', class: 'tag-green' },
      completed: { text: 'Completed', class: 'tag-cyan' },
      cancelled: { text: 'Cancelled', class: 'tag-red' },
      pending: { text: 'Pending', class: 'tag-amber' },
      paid: { text: 'Paid', class: 'tag-green' },
      unpaid: { text: 'Unpaid', class: 'tag-red' }
    };
    return map[status] || { text: status, class: 'tag-cyan' };
  },

  /* ── Toast Notifications ── */
  showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /* ── Modal Helpers ── */
  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /* ── DOM Helpers ── */
  $(selector) {
    return document.querySelector(selector);
  },

  $$(selector) {
    return document.querySelectorAll(selector);
  },

  createElement(tag, className, innerHTML) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  },

  /* ── Circular Progress SVG Generator ── */
  createCircularProgress(percentage, size = 120, strokeWidth = 8, color = 'var(--color-accent-cyan)') {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return `
      <div class="circular-progress" style="width:${size}px;height:${size}px">
        <svg width="${size}" height="${size}">
          <circle class="progress-bg" cx="${size / 2}" cy="${size / 2}" r="${radius}" 
                  stroke-width="${strokeWidth}" />
          <circle class="progress-fill" cx="${size / 2}" cy="${size / 2}" r="${radius}" 
                  stroke-width="${strokeWidth}" stroke="${color}"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
        </svg>
        <span class="progress-text" style="font-size:${size * 0.2}px">${Math.round(percentage)}%</span>
      </div>
    `;
  },

  /* ── Debounce ── */
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /* ── Generate Random Color for Charts ── */
  chartColors: [
    'rgba(0, 212, 255, 0.8)',
    'rgba(0, 255, 136, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(255, 184, 0, 0.8)',
    'rgba(255, 77, 106, 0.8)',
  ],

  /* ── CSV Export ── */
  exportCSV(data, filename) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
