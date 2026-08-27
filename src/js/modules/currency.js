// Multi-Currency Conversion with INR as Primary Studio Base
export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', rate: 1.0, name: 'INR (₹)', locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', rate: 0.012, name: 'USD ($)', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', rate: 0.011, name: 'EUR (€)', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', rate: 0.0095, name: 'GBP (£)', locale: 'en-GB' }
};

class CurrencyManager {
  constructor() {
    this.currentCurrency = localStorage.getItem('yazh_currency') || 'INR';
    this.listeners = [];
  }

  getCurrency() {
    return CURRENCIES[this.currentCurrency] || CURRENCIES.INR;
  }

  setCurrency(code) {
    if (CURRENCIES[code]) {
      this.currentCurrency = code;
      localStorage.setItem('yazh_currency', code);
      this.notifyListeners();
    }
  }

  convert(amountInINR) {
    const cur = this.getCurrency();
    if (cur.code === 'INR') return Math.round(amountInINR);
    return Math.round(amountInINR * cur.rate);
  }

  format(amountInINR) {
    const cur = this.getCurrency();
    const converted = this.convert(amountInINR);

    if (cur.code === 'INR') {
      return `₹${converted.toLocaleString('en-IN')}`;
    }

    return `${cur.symbol}${converted.toLocaleString()}`;
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.getCurrency()));
    document.dispatchEvent(new CustomEvent('currencyChange', { detail: this.getCurrency() }));
  }
}

export const currency = new CurrencyManager();
