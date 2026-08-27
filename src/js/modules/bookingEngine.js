import { PHOTOGRAPHY_PACKAGES, STUDIO_INFO } from '../data/packages.js';
import { dataStore } from '../utils/dataStore.js';
import { currency } from './currency.js';
import { toast } from '../utils/toast.js';
import { sound } from '../utils/sound.js';
import confetti from 'canvas-confetti';

export class BookingEngine {
  constructor() {
    this.packages = PHOTOGRAPHY_PACKAGES;
    this.selectedPackage = this.packages[1] || this.packages[0];
    this.advanceAmount = 5000;
    this.init();
  }

  async init() {
    await this.loadPackages();
    this.renderPackages();
    this.populatePackageDropdown();
    this.bindEvents();
    this.updateCalculation();

    document.addEventListener('currencyChange', () => {
      this.renderPackages();
      this.populatePackageDropdown();
      this.updateCalculation();
    });

    document.addEventListener('packagesUpdated', async () => {
      await this.loadPackages();
      this.renderPackages();
      this.populatePackageDropdown();
      this.updateCalculation();
    });
  }

  async loadPackages() {
    try {
      const activePkgs = await dataStore.getActivePackages();
      if (activePkgs && activePkgs.length > 0) {
        this.packages = activePkgs.map(p => ({
          id: p.id,
          title: p.name || p.title,
          priceINR: p.priceINR,
          deliverables: p.deliverables || (p.description ? p.description.split('·').map(s => s.trim()) : [])
        }));
        if (!this.selectedPackage || !this.packages.some(p => p.id === this.selectedPackage.id)) {
          this.selectedPackage = this.packages[0];
        }
      }
    } catch (e) {
      console.warn('Could not load packages from dataStore:', e);
    }
  }

  renderPackages() {
    const container = document.getElementById('booking-packages-grid');
    if (!container) return;

    container.innerHTML = this.packages.map(pkg => {
      const priceFormatted = currency.format(pkg.priceINR);
      const isSelected = this.selectedPackage && pkg.id === this.selectedPackage.id;

      return `
        <div class="package-card ${isSelected ? 'selected' : ''}" data-id="${pkg.id}">
          <div class="package-header">
            <h3 class="package-title">${pkg.title}</h3>
            <div class="package-price-wrap">
              <span class="package-price-amount">${priceFormatted}</span>
            </div>
          </div>

          <div class="package-inclusions">
            <ul class="inclusions-list">
              ${(pkg.deliverables || []).map(item => `<li><i data-lucide="check"></i> <span>${item}</span></li>`).join('')}
            </ul>
          </div>

          <div class="package-footer">
            <button type="button" class="btn ${isSelected ? 'btn-primary' : 'btn-outline'} btn-select-package" data-id="${pkg.id}">
              ${isSelected ? 'Selected' : 'Select Package'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  populatePackageDropdown() {
    const select = document.getElementById('booking-package-select');
    if (!select) return;

    select.innerHTML = this.packages.map(pkg => {
      const isSelected = this.selectedPackage && pkg.id === this.selectedPackage.id;
      return `<option value="${pkg.id}" ${isSelected ? 'selected' : ''}>
        ${pkg.title} (${currency.format(pkg.priceINR)})
      </option>`;
    }).join('');
  }

  bindEvents() {
    // Package Card Selection
    const packagesGrid = document.getElementById('booking-packages-grid');
    packagesGrid?.addEventListener('click', (e) => {
      const selectBtn = e.target.closest('.btn-select-package') || e.target.closest('.package-card');
      if (selectBtn) {
        const id = selectBtn.dataset.id || selectBtn.closest('.package-card').dataset.id;
        const found = this.packages.find(p => p.id === id);
        if (found) {
          this.selectedPackage = found;
          this.renderPackages();
          this.syncDropdown();
          this.updateCalculation();
          toast.info(`Selected ${found.title}`, 'Package Updated');
        }
      }
    });

    // Package Dropdown Selection
    const packageSelect = document.getElementById('booking-package-select');
    packageSelect?.addEventListener('change', (e) => {
      const id = e.target.value;
      const found = this.packages.find(p => p.id === id);
      if (found) {
        this.selectedPackage = found;
        this.renderPackages();
        this.updateCalculation();
        toast.info(`Selected ${found.title}`, 'Package Updated');
      }
    });

    // Initial Advance Amount Input Change
    const advanceInput = document.getElementById('booking-advance-amount');
    advanceInput?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.advanceAmount = isNaN(val) || val < 0 ? 0 : val;
      this.updateCalculation();
    });

    // Advance Preset Quick Chips
    document.querySelectorAll('.btn-advance-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = parseFloat(btn.dataset.amount);
        this.advanceAmount = amt;
        if (advanceInput) advanceInput.value = amt;
        document.querySelectorAll('.btn-advance-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateCalculation();
      });
    });

    // Form Submit
    const bookingForm = document.getElementById('session-booking-form');
    bookingForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleBookingSubmit();
    });

    // Min Event Date: Tomorrow
    const dateInput = document.getElementById('booking-event-date');
    if (dateInput) {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 1);
      dateInput.min = minDate.toISOString().split('T')[0];
    }
  }

  syncDropdown() {
    const select = document.getElementById('booking-package-select');
    if (select && this.selectedPackage) {
      select.value = this.selectedPackage.id;
    }
  }

  updateCalculation() {
    if (!this.selectedPackage) return;
    const totalINR = this.selectedPackage.priceINR;
    const advanceINR = Math.min(this.advanceAmount, totalINR);
    const remainingINR = Math.max(0, totalINR - advanceINR);

    const selectedPkgEl = document.getElementById('summary-selected-pkg');
    const totalPkgCostEl = document.getElementById('summary-total-pkg-cost');
    const advancePaidEl = document.getElementById('summary-advance-paid');
    const remainingBalanceEl = document.getElementById('summary-remaining-balance');

    if (selectedPkgEl) selectedPkgEl.textContent = this.selectedPackage.title;
    if (totalPkgCostEl) totalPkgCostEl.textContent = currency.format(totalINR);
    if (advancePaidEl) advancePaidEl.textContent = currency.format(advanceINR);
    if (remainingBalanceEl) remainingBalanceEl.textContent = currency.format(remainingINR);
  }

  async handleBookingSubmit() {
    const nameInput = document.getElementById('booking-client-name');
    const emailInput = document.getElementById('booking-client-email');
    const phoneInput = document.getElementById('booking-client-phone');
    const dateInput = document.getElementById('booking-event-date');
    const locationInput = document.getElementById('booking-location');
    const notesInput = document.getElementById('booking-notes');

    if (!nameInput?.value || !phoneInput?.value || !dateInput?.value) {
      toast.show({ title: 'Required Fields', message: 'Please fill in your name, phone number, and event date.', type: 'warning', icon: 'warning' });
      return;
    }

    const totalINR = this.selectedPackage.priceINR;
    const advanceINR = Math.min(this.advanceAmount, totalINR);
    const remainingINR = Math.max(0, totalINR - advanceINR);

    const bookingRecord = {
      id: `YZ-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      clientName: nameInput.value.trim(),
      clientEmail: emailInput?.value.trim() || STUDIO_INFO.email,
      clientPhone: phoneInput.value.trim(),
      eventDate: dateInput.value,
      location: locationInput?.value.trim() || 'Venue TBD',
      packageName: this.selectedPackage.title,
      totalINR: totalINR,
      advanceINR: advanceINR,
      remainingINR: remainingINR,
      status: 'New',
      notes: notesInput?.value.trim() || ''
    };

    // Save to persistent cloud dataStore
    await dataStore.addBooking(bookingRecord);

    sound.playSuccessChime();
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 }
    });

    this.showConfirmationModal(bookingRecord);
  }

  showConfirmationModal(record) {
    const modal = document.getElementById('booking-confirmation-modal');
    if (!modal) return;

    document.getElementById('conf-booking-id').textContent = record.id;
    document.getElementById('conf-client-name').textContent = record.clientName;
    document.getElementById('conf-package-title').textContent = record.packageName;
    document.getElementById('conf-event-date').textContent = record.eventDate;
    document.getElementById('conf-location').textContent = record.location;
    document.getElementById('conf-total-value').textContent = currency.format(record.totalINR);
    document.getElementById('conf-advance-paid').textContent = currency.format(record.advanceINR);
    document.getElementById('conf-remaining-balance').textContent = currency.format(record.remainingINR);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    modal.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }
}
