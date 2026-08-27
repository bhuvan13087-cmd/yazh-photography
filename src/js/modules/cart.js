import { currency } from './currency.js';
import { toast } from '../utils/toast.js';
import { sound } from '../utils/sound.js';

export const COUPON_CODES = {
  'YAZH10': { discount: 0.10, label: '10% Welcome Discount' },
  'WEDDING20': { discount: 0.20, label: '20% Wedding Season Discount' },
  'PRESET50': { discount: 0.50, label: '50% Preset Flash Sale', targetType: 'preset' }
};

class CartManager {
  constructor() {
    this.items = this.loadCart();
    this.appliedCoupon = null;
    this.freeShippingThresholdINR = 10000;
  }

  loadCart() {
    try {
      const stored = localStorage.getItem('yazh_cart');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Failed to load cart', e);
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem('yazh_cart', JSON.stringify(this.items));
      this.updateCartBadges();
      document.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: this.items } }));
    } catch (e) {
      console.warn('Failed to save cart', e);
    }
  }

  addItem(item) {
    const itemKey = `${item.id}-${item.sizeId || 'default'}-${item.mediaId || 'default'}-${item.frameId || 'default'}-${item.mattingId || 'default'}`;
    const existingIndex = this.items.findIndex(i => i.key === itemKey);

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += (item.quantity || 1);
    } else {
      this.items.push({
        ...item,
        key: itemKey,
        quantity: item.quantity || 1
      });
    }

    this.saveCart();
    sound.playSuccessChime();
    toast.cart(`"${item.title}" added to your bag.`, 'Added to Bag');
  }

  removeItem(key) {
    this.items = this.items.filter(i => i.key !== key);
    this.saveCart();
  }

  updateQuantity(key, quantity) {
    const item = this.items.find(i => i.key === key);
    if (item) {
      if (quantity <= 0) {
        this.removeItem(key);
      } else {
        item.quantity = quantity;
        this.saveCart();
      }
    }
  }

  clearCart() {
    this.items = [];
    this.appliedCoupon = null;
    this.saveCart();
  }

  applyCoupon(code) {
    const normalized = (code || '').trim().toUpperCase();
    if (COUPON_CODES[normalized]) {
      this.appliedCoupon = { code: normalized, ...COUPON_CODES[normalized] };
      this.saveCart();
      toast.success(`Coupon ${normalized} applied! (${this.appliedCoupon.label})`, 'Discount Applied');
      return { success: true, coupon: this.appliedCoupon };
    } else {
      toast.show({ title: 'Invalid Code', message: 'The coupon code entered is not valid.', type: 'warning', icon: 'warning' });
      return { success: false, message: 'Invalid promo code' };
    }
  }

  removeCoupon() {
    this.appliedCoupon = null;
    this.saveCart();
  }

  getItemCount() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  getTotals() {
    const subtotalINR = this.items.reduce((sum, item) => sum + ((item.priceINR || item.priceUSD || 0) * item.quantity), 0);

    let discountAmountINR = 0;
    if (this.appliedCoupon) {
      if (this.appliedCoupon.targetType === 'preset') {
        const presetSubtotal = this.items
          .filter(i => i.type === 'preset')
          .reduce((sum, i) => sum + ((i.priceINR || 0) * i.quantity), 0);
        discountAmountINR = presetSubtotal * this.appliedCoupon.discount;
      } else {
        discountAmountINR = subtotalINR * this.appliedCoupon.discount;
      }
    }

    const hasPhysicalItems = this.items.some(i => i.type !== 'preset');
    const shippingINR = (hasPhysicalItems && subtotalINR < this.freeShippingThresholdINR && this.items.length > 0) ? 800 : 0;
    const taxINR = Math.round((subtotalINR - discountAmountINR) * 0.05); // 5% GST
    const totalINR = Math.max(0, subtotalINR - discountAmountINR + shippingINR + taxINR);

    return {
      subtotalINR,
      discountAmountINR,
      shippingINR,
      taxINR,
      totalINR,
      freeShippingProgress: Math.min(100, Math.round((subtotalINR / this.freeShippingThresholdINR) * 100)),
      amountUntilFreeShippingINR: Math.max(0, this.freeShippingThresholdINR - subtotalINR)
    };
  }

  updateCartBadges() {
    const count = this.getItemCount();
    document.querySelectorAll('.cart-badge-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }
}

export const cart = new CartManager();
