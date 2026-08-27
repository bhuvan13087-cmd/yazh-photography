import { cart } from './cart.js';
import { currency } from './currency.js';
import { toast } from '../utils/toast.js';
import { sound } from '../utils/sound.js';
import confetti from 'canvas-confetti';

export class CheckoutManager {
  constructor() {
    this.currentStep = 1;
    this.orderData = {
      customer: {},
      shippingMethod: 'courier',
      paymentMethod: 'upi'
    };

    this.init();
  }

  init() {
    this.setupCartDrawer();
    this.setupCheckoutModal();
    this.bindEvents();

    document.addEventListener('cartUpdated', () => {
      this.renderCartDrawer();
    });

    document.addEventListener('currencyChange', () => {
      this.renderCartDrawer();
      this.updateCheckoutTotals();
    });
  }

  setupCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;

    document.querySelectorAll('.btn-open-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        drawer.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.renderCartDrawer();
      });
    });

    drawer.querySelectorAll('.cart-close, .cart-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        drawer.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    const couponForm = document.getElementById('cart-coupon-form');
    couponForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('cart-coupon-input');
      if (input && input.value) {
        cart.applyCoupon(input.value);
        input.value = '';
      }
    });

    document.getElementById('btn-cart-checkout')?.addEventListener('click', () => {
      if (cart.items.length === 0) {
        toast.show({ title: 'Bag Empty', message: 'Add prints or presets before checkout.', type: 'warning', icon: 'cart' });
        return;
      }
      drawer.classList.remove('active');
      this.openCheckout();
    });
  }

  renderCartDrawer() {
    const container = document.getElementById('cart-items-container');
    const emptyState = document.getElementById('cart-empty-state');
    const footer = document.getElementById('cart-drawer-footer');
    if (!container) return;

    if (cart.items.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (footer) footer.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (footer) footer.style.display = 'block';

    const totals = cart.getTotals();

    container.innerHTML = cart.items.map(item => {
      const price = item.priceINR || item.priceUSD || 0;
      const itemTotalFormatted = currency.format(price * item.quantity);
      const unitFormatted = currency.format(price);

      return `
        <div class="cart-item" data-key="${item.key}">
          <img src="${item.image}" alt="${item.title}" class="cart-item-thumb" />
          <div class="cart-item-info">
            <div class="cart-item-top">
              <h4 class="cart-item-title">${item.title}</h4>
              <button class="cart-item-remove" data-key="${item.key}" title="Remove">&times;</button>
            </div>
            ${item.subtitle ? `<p class="cart-item-sub">${item.subtitle}</p>` : ''}
            <div class="cart-item-specs">
              ${item.sizeName ? `<span class="spec-pill">${item.sizeName}</span>` : ''}
              ${item.frameName ? `<span class="spec-pill">${item.frameName}</span>` : ''}
              ${item.format ? `<span class="spec-pill">${item.format}</span>` : ''}
            </div>
            <div class="cart-item-bottom">
              <div class="qty-spinner">
                <button class="qty-btn btn-cart-minus" data-key="${item.key}">-</button>
                <span class="qty-val">${item.quantity}</span>
                <button class="qty-btn btn-cart-plus" data-key="${item.key}">+</button>
              </div>
              <div class="cart-item-pricing">
                <span class="cart-item-unit">${unitFormatted} ea.</span>
                <strong class="cart-item-total">${itemTotalFormatted}</strong>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const progressEl = document.getElementById('cart-shipping-progress');
    const shippingTextEl = document.getElementById('cart-shipping-msg');
    if (progressEl && shippingTextEl) {
      progressEl.style.width = `${totals.freeShippingProgress}%`;
      if (totals.amountUntilFreeShippingINR === 0) {
        shippingTextEl.innerHTML = `✨ <strong>Unlocked Free Secure Courier Shipping!</strong>`;
      } else {
        shippingTextEl.innerHTML = `Add <strong>${currency.format(totals.amountUntilFreeShippingINR)}</strong> for Free Courier Delivery`;
      }
    }

    const couponTagWrap = document.getElementById('cart-applied-coupon-wrap');
    if (couponTagWrap) {
      if (cart.appliedCoupon) {
        couponTagWrap.innerHTML = `
          <div class="applied-coupon-badge">
            <span>🏷 ${cart.appliedCoupon.code} (${cart.appliedCoupon.label})</span>
            <button class="btn-remove-coupon" title="Remove coupon">&times;</button>
          </div>
        `;
        couponTagWrap.style.display = 'block';
      } else {
        couponTagWrap.innerHTML = '';
        couponTagWrap.style.display = 'none';
      }
    }

    const subtotalEl = document.getElementById('cart-subtotal-val');
    const discountEl = document.getElementById('cart-discount-val');
    const discountRow = document.getElementById('cart-discount-row');
    const shippingEl = document.getElementById('cart-shipping-val');
    const totalEl = document.getElementById('cart-grand-total-val');

    if (subtotalEl) subtotalEl.textContent = currency.format(totals.subtotalINR);

    if (discountRow && discountEl) {
      if (totals.discountAmountINR > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `-${currency.format(totals.discountAmountINR)}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (shippingEl) shippingEl.textContent = totals.shippingINR === 0 ? 'Free' : currency.format(totals.shippingINR);
    if (totalEl) totalEl.textContent = currency.format(totals.totalINR);
  }

  bindEvents() {
    const cartContainer = document.getElementById('cart-items-container');
    cartContainer?.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.cart-item-remove');
      const minusBtn = e.target.closest('.btn-cart-minus');
      const plusBtn = e.target.closest('.btn-cart-plus');

      if (removeBtn) {
        cart.removeItem(removeBtn.dataset.key);
      } else if (minusBtn) {
        const item = cart.items.find(i => i.key === minusBtn.dataset.key);
        if (item) cart.updateQuantity(item.key, item.quantity - 1);
      } else if (plusBtn) {
        const item = cart.items.find(i => i.key === plusBtn.dataset.key);
        if (item) cart.updateQuantity(item.key, item.quantity + 1);
      }
    });

    document.getElementById('cart-applied-coupon-wrap')?.addEventListener('click', (e) => {
      if (e.target.closest('.btn-remove-coupon')) {
        cart.removeCoupon();
      }
    });

    document.getElementById('btn-checkout-next-1')?.addEventListener('click', () => {
      const name = document.getElementById('checkout-name')?.value;
      const email = document.getElementById('checkout-email')?.value;
      const address = document.getElementById('checkout-address')?.value;

      if (!name || !email || !address) {
        toast.show({ title: 'Incomplete', message: 'Please complete all address fields.', type: 'warning', icon: 'warning' });
        return;
      }
      this.goToStep(2);
    });

    document.getElementById('btn-checkout-back-2')?.addEventListener('click', () => this.goToStep(1));
    document.getElementById('btn-checkout-next-2')?.addEventListener('click', () => this.goToStep(3));
    document.getElementById('btn-checkout-back-3')?.addEventListener('click', () => this.goToStep(2));

    document.getElementById('btn-place-order')?.addEventListener('click', () => {
      this.processOrderPayment();
    });

    document.querySelectorAll('.payment-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.payment-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.payment-panel').forEach(p => p.classList.add('hidden'));

        btn.classList.add('active');
        const method = btn.dataset.method;
        this.orderData.paymentMethod = method;
        document.getElementById(`payment-panel-${method}`)?.classList.remove('hidden');
      });
    });
  }

  setupCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (!modal) return;

    modal.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  openCheckout() {
    const modal = document.getElementById('checkout-modal');
    if (!modal) return;

    this.goToStep(1);
    this.updateCheckoutTotals();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  goToStep(step) {
    this.currentStep = step;

    document.querySelectorAll('.checkout-step-indicator').forEach(ind => {
      const s = parseInt(ind.dataset.step);
      ind.classList.toggle('active', s === step);
      ind.classList.toggle('completed', s < step);
    });

    document.querySelectorAll('.checkout-step-panel').forEach(panel => {
      const s = parseInt(panel.dataset.step);
      panel.classList.toggle('active', s === step);
    });
  }

  updateCheckoutTotals() {
    const totals = cart.getTotals();
    const subtotalEl = document.getElementById('checkout-summary-subtotal');
    const shippingEl = document.getElementById('checkout-summary-shipping');
    const discountEl = document.getElementById('checkout-summary-discount');
    const grandTotalEl = document.getElementById('checkout-summary-total');
    const itemsListEl = document.getElementById('checkout-items-mini-list');

    if (subtotalEl) subtotalEl.textContent = currency.format(totals.subtotalINR);
    if (shippingEl) shippingEl.textContent = totals.shippingINR === 0 ? 'Free' : currency.format(totals.shippingINR);
    if (discountEl) discountEl.textContent = totals.discountAmountINR > 0 ? `-${currency.format(totals.discountAmountINR)}` : '₹0';
    if (grandTotalEl) grandTotalEl.textContent = currency.format(totals.totalINR);

    if (itemsListEl) {
      itemsListEl.innerHTML = cart.items.map(item => {
        const price = item.priceINR || item.priceUSD || 0;
        return `
          <div class="mini-item-row">
            <img src="${item.image}" alt="${item.title}" class="mini-item-thumb" />
            <div class="mini-item-details">
              <span class="mini-title">${item.title}</span>
              <span class="mini-meta">Qty: ${item.quantity} · ${item.sizeName || item.format || 'Digital'}</span>
            </div>
            <strong class="mini-price">${currency.format(price * item.quantity)}</strong>
          </div>
        `;
      }).join('');
    }
  }

  processOrderPayment() {
    const totals = cart.getTotals();
    const name = document.getElementById('checkout-name')?.value || 'Client';
    const email = document.getElementById('checkout-email')?.value || 'client@example.com';
    const address = document.getElementById('checkout-address')?.value || 'Address';
    const city = document.getElementById('checkout-city')?.value || 'Chennai';
    const country = document.getElementById('checkout-country')?.value || 'India';

    const orderRecord = {
      orderId: `YZ-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      customerName: name,
      customerEmail: email,
      shippingAddress: `${address}, ${city}, ${country}`,
      paymentMethod: this.orderData.paymentMethod.toUpperCase(),
      items: JSON.parse(JSON.stringify(cart.items)),
      totals: { ...totals },
      currency: currency.getCurrency().code,
      status: 'Paid & Processing'
    };

    const orders = JSON.parse(localStorage.getItem('yazh_orders') || '[]');
    orders.unshift(orderRecord);
    localStorage.setItem('yazh_orders', JSON.stringify(orders));

    cart.clearCart();
    sound.playSuccessChime();

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 }
    });

    this.showOrderSuccess(orderRecord);
  }

  showOrderSuccess(order) {
    this.goToStep(4);

    document.getElementById('success-order-id').textContent = order.orderId;
    document.getElementById('success-customer-email').textContent = order.customerEmail;
    document.getElementById('success-total-paid').textContent = currency.format(order.totals.totalINR);

    document.getElementById('btn-print-receipt')?.addEventListener('click', () => {
      window.print();
    });
  }
}
