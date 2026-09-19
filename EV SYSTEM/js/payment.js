/* ============================================
   PAYMENT — Settlement & Solar Discount Ledger
   ============================================ */

const PaymentModule = {
  currentSessionId: null,

  async openPaymentModal(sessionId) {
    this.currentSessionId = sessionId;
    const session = await db.get('sessions', sessionId);
    if (!session) {
      Utils.showToast('Session not found', 'error');
      return;
    }

    const user = await db.get('users', session.userId);
    const vehicle = await db.get('vehicles', session.vehicleId);

    const modalBackdrop = document.getElementById('payment-modal-backdrop');
    if (!modalBackdrop) return;

    modalBackdrop.innerHTML = `
      <div class="glass-modal">
        <div class="flex justify-between items-center mb-lg">
          <div class="flex items-center gap-md">
            <div style="font-size: 1.8rem;">💳</div>
            <div>
              <h3 class="section-title">Charging Bill Settlement</h3>
              <div class="text-xs text-secondary">Session ID: ${session.id.slice(0, 12)}...</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-icon" onclick="Utils.hideModal('payment-modal-backdrop')">✕</button>
        </div>

        <div class="glass-card mb-md" style="background: rgba(255,255,255,0.02);">
          <div class="flex justify-between items-center mb-xs">
            <span class="text-xs text-secondary">User</span>
            <span class="font-semibold text-sm">${user?.name || 'Customer'} (${user?.phone || ''})</span>
          </div>
          <div class="flex justify-between items-center mb-xs">
            <span class="text-xs text-secondary">Vehicle</span>
            <span class="font-semibold text-sm">${Utils.getVehicleIcon(vehicle?.type)} ${vehicle?.make || ''} ${vehicle?.model || ''}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs text-secondary">Charging Mode</span>
            <span class="tag ${session.isUrgent ? 'tag-red' : 'tag-green'}">${session.isUrgent ? '🚨 Urgent' : '⚡ Standard'}</span>
          </div>
        </div>

        <!-- Cost Breakdown -->
        <div class="glass-card mb-lg" style="background: rgba(0, 212, 255, 0.03); border-color: rgba(0, 212, 255, 0.2);">
          <div class="flex justify-between items-center mb-sm text-sm">
            <span class="text-secondary">Total Energy Delivered</span>
            <span>${Utils.formatKWh(session.energyConsumed || 0)}</span>
          </div>
          <div class="flex justify-between items-center mb-sm text-sm">
            <span class="text-secondary">Standard Grid Rate</span>
            <span>₹8.00 / kWh</span>
          </div>
          <div class="flex justify-between items-center mb-sm text-sm">
            <span class="text-secondary">Gross Charge</span>
            <span>${Utils.formatCurrency(session.cost || 0)}</span>
          </div>
          <div class="flex justify-between items-center mb-sm text-sm" style="color: var(--color-accent-amber);">
            <span>☀️ Solar Discount (100% Free)</span>
            <span class="font-semibold">- ${Utils.formatCurrency(session.solarSavings || 0)}</span>
          </div>
          <div class="separator"></div>
          <div class="flex justify-between items-center">
            <div>
              <div class="text-xs text-secondary uppercase font-semibold">Total Amount Payable</div>
              <div class="text-xs text-green">Green Energy Credit Applied</div>
            </div>
            <div class="font-bold text-3xl font-display text-accent">
              ${Utils.formatCurrency(session.finalAmount || 0)}
            </div>
          </div>
        </div>

        <!-- Payment Method Selection -->
        <div class="form-group mb-lg">
          <label class="form-label">Select Payment Method</label>
          <div class="grid-3 gap-sm">
            <button type="button" class="btn btn-secondary btn-sm payment-method-btn active" data-method="upi" onclick="PaymentModule.selectMethod('upi', this)">
              📱 UPI / QR
            </button>
            <button type="button" class="btn btn-secondary btn-sm payment-method-btn" data-method="card" onclick="PaymentModule.selectMethod('card', this)">
              💳 Card
            </button>
            <button type="button" class="btn btn-secondary btn-sm payment-method-btn" data-method="wallet" onclick="PaymentModule.selectMethod('wallet', this)">
              ⚡ FastPay
            </button>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" style="width: 100%;" onclick="PaymentModule.processPayment('${session.id}')">
          ✓ Authorize & Pay ${Utils.formatCurrency(session.finalAmount || 0)}
        </button>
      </div>
    `;

    Utils.showModal('payment-modal-backdrop');
  },

  selectMethod(method, btn) {
    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  async processPayment(sessionId) {
    const session = await db.get('sessions', sessionId);
    if (!session) return;

    // Record payment
    const paymentId = db.generateId();
    const payment = {
      id: paymentId,
      sessionId: session.id,
      userId: session.userId,
      amount: session.cost || 0,
      solarDiscount: session.solarSavings || 0,
      finalAmount: session.finalAmount || 0,
      method: 'UPI',
      status: 'paid',
      paidAt: new Date().toISOString()
    };

    await db.add('payments', payment);

    session.isPaid = true;
    await db.put('sessions', session);

    Utils.hideModal('payment-modal-backdrop');
    Utils.showToast(`Payment of ${Utils.formatCurrency(payment.finalAmount)} Confirmed! Receipt Saved.`, 'success');

    // Refresh history / dashboard
    if (document.getElementById('page-history')?.classList.contains('active')) {
      HistoryPage.render();
    }
    if (document.getElementById('page-dashboard')?.classList.contains('active')) {
      DashboardPage.render();
    }
    if (document.getElementById('page-user-dashboard')?.classList.contains('active')) {
      UserDashboardPage.render();
    }
  }
};
