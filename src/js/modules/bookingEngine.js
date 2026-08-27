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
    this.customServices = [];
    this.selectedCustomizations = new Map(); // key: serviceId -> { id, name, price }
    this.advanceAmount = 5000;
    this.init();
  }

  async init() {
    await this.loadPackages();
    await this.loadCustomServices();
    this.renderPackages();
    this.populatePackageDropdown();
    this.populateCustomizationDropdown();
    this.bindEvents();
    this.updateCalculation();

    // Listen to live currency changes
    document.addEventListener('currencyChange', () => {
      this.renderPackages();
      this.populatePackageDropdown();
      this.populateCustomizationDropdown();
      this.renderSelectedCustomizations();
      this.updateCalculation();
    });

    // Listen to admin package updates
    document.addEventListener('packagesUpdated', async () => {
      await this.loadPackages();
      this.renderPackages();
      this.populatePackageDropdown();
      this.updateCalculation();
    });

    // Listen to admin customization services updates
    document.addEventListener('servicesUpdated', async () => {
      await this.loadCustomServices();
      this.populateCustomizationDropdown();
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
          priceINR: Number(p.priceINR) || 0,
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

  async loadCustomServices() {
    try {
      const activeServices = await dataStore.getCustomServices();
      this.customServices = activeServices.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category || 'Photography',
        priceINR: Number(s.priceINR) || 0,
        unit: s.unit || 'per day',
        description: s.description || ''
      }));
    } catch (e) {
      console.warn('Could not load custom services from dataStore:', e);
      this.customServices = [];
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

  populateCustomizationDropdown() {
    const select = document.getElementById('booking-customization-dropdown');
    if (!select) return;

    if (this.customServices.length === 0) {
      select.innerHTML = `<option value="" disabled selected>No customization options available</option>`;
      return;
    }

    const options = this.customServices.map(srv => {
      const isAlreadySelected = this.selectedCustomizations.has(srv.id);
      return `<option value="${srv.id}" ${isAlreadySelected ? 'disabled' : ''}>
        ${srv.name} — ${currency.format(srv.priceINR)}${srv.unit ? ` (${srv.unit})` : ''} ${isAlreadySelected ? '(Added)' : ''}
      </option>`;
    }).join('');

    select.innerHTML = `
      <option value="">-- Choose a Customization Service --</option>
      ${options}
    `;
  }

  renderSelectedCustomizations() {
    const container = document.getElementById('selected-customizations-list');
    const countLabel = document.getElementById('customization-count-label');
    const summaryBreakdown = document.getElementById('summary-customizations-breakdown');
    if (!container) return;

    const items = Array.from(this.selectedCustomizations.values());

    if (countLabel) {
      countLabel.textContent = `${items.length} Selected`;
    }

    if (items.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      if (summaryBreakdown) {
        summaryBreakdown.style.display = 'none';
        summaryBreakdown.innerHTML = '';
      }
      return;
    }

    container.style.display = 'flex';
    container.innerHTML = items.map(item => `
      <div class="selected-customization-item" data-id="${item.id}">
        <div class="customization-item-left">
          <i data-lucide="check-circle" style="width: 14px; height: 14px; color: var(--accent-gold);"></i>
          <span class="customization-item-name">${item.name}</span>
        </div>
        <div class="customization-item-right">
          <span class="customization-item-price">+${currency.format(item.price)}</span>
          <button type="button" class="btn-remove-customization" data-id="${item.id}" title="Remove this add-on">
            <i data-lucide="x" style="width: 11px; height: 11px;"></i> Remove
          </button>
        </div>
      </div>
    `).join('');

    if (summaryBreakdown) {
      summaryBreakdown.style.display = 'flex';
      summaryBreakdown.innerHTML = items.map(item => `
        <div style="display: flex; justify-content: space-between;">
          <span>+ ${item.name}</span>
          <strong>${currency.format(item.price)}</strong>
        </div>
      `).join('');
    }

    if (window.lucide) window.lucide.createIcons();

    // Bind remove buttons
    container.querySelectorAll('.btn-remove-customization').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.removeCustomization(id);
      });
    });
  }

  addCustomization(serviceId) {
    if (!serviceId) return;

    const srv = this.customServices.find(s => s.id === serviceId);
    if (!srv) {
      toast.show({ title: 'Service Not Found', message: 'The selected customization service could not be found.', type: 'warning', icon: 'warning' });
      return;
    }

    if (this.selectedCustomizations.has(srv.id)) {
      toast.show({ title: 'Already Added', message: `"${srv.name}" is already included in your booking.`, type: 'info', icon: 'info' });
      return;
    }

    // Store exact price snapshot at time of selection
    this.selectedCustomizations.set(srv.id, {
      id: srv.id,
      name: srv.name,
      price: Number(srv.priceINR) || 0
    });

    this.renderSelectedCustomizations();
    this.populateCustomizationDropdown();
    this.updateCalculation();
    sound.playSuccessChime();
    toast.info(`Added ${srv.name} (+${currency.format(srv.priceINR)})`, 'Customization Added');
  }

  removeCustomization(serviceId) {
    if (this.selectedCustomizations.has(serviceId)) {
      const item = this.selectedCustomizations.get(serviceId);
      this.selectedCustomizations.delete(serviceId);
      this.renderSelectedCustomizations();
      this.populateCustomizationDropdown();
      this.updateCalculation();
      toast.info(`Removed ${item?.name || 'customization'}`, 'Customization Removed');
    }
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

    // Add Customization Service Button
    const addCustomBtn = document.getElementById('btn-add-customization-service');
    const customDropdown = document.getElementById('booking-customization-dropdown');
    addCustomBtn?.addEventListener('click', () => {
      const selectedId = customDropdown?.value;
      if (selectedId) {
        this.addCustomization(selectedId);
        if (customDropdown) customDropdown.value = '';
      } else {
        toast.show({ title: 'Select a Service', message: 'Please pick a customization option from the dropdown first.', type: 'warning', icon: 'warning' });
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
    const packagePrice = this.selectedPackage ? Number(this.selectedPackage.priceINR) || 0 : 0;
    
    // Calculate customization total
    let customizationTotal = 0;
    this.selectedCustomizations.forEach(item => {
      customizationTotal += Number(item.price) || 0;
    });

    const finalAmount = packagePrice + customizationTotal;
    const advanceINR = Math.max(0, Math.min(this.advanceAmount, finalAmount));
    const remainingINR = Math.max(0, finalAmount - advanceINR);

    const selectedPkgEl = document.getElementById('summary-selected-pkg');
    const basePkgCostEl = document.getElementById('summary-base-pkg-cost');
    const customTotalRow = document.getElementById('summary-customization-total-row');
    const customTotalVal = document.getElementById('summary-customization-total');
    const totalPkgCostEl = document.getElementById('summary-total-pkg-cost');
    const advancePaidEl = document.getElementById('summary-advance-paid');
    const remainingBalanceEl = document.getElementById('summary-remaining-balance');

    if (selectedPkgEl && this.selectedPackage) selectedPkgEl.textContent = this.selectedPackage.title;
    if (basePkgCostEl) basePkgCostEl.textContent = currency.format(packagePrice);
    
    if (customTotalRow) {
      customTotalRow.style.display = customizationTotal > 0 ? 'flex' : 'none';
    }
    if (customTotalVal) {
      customTotalVal.textContent = `+${currency.format(customizationTotal)}`;
    }

    if (totalPkgCostEl) totalPkgCostEl.textContent = currency.format(finalAmount);
    if (advancePaidEl) advancePaidEl.textContent = `-${currency.format(advanceINR)}`;
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

    const packagePrice = this.selectedPackage ? Number(this.selectedPackage.priceINR) || 0 : 0;
    
    // Calculate customization total
    let customizationTotal = 0;
    const customizationsList = Array.from(this.selectedCustomizations.values()).map(c => {
      const p = Number(c.price) || 0;
      customizationTotal += p;
      return {
        id: c.id,
        name: c.name,
        price: p
      };
    });

    const finalAmount = packagePrice + customizationTotal;
    const advanceINR = Math.max(0, Math.min(this.advanceAmount, finalAmount));
    const remainingINR = Math.max(0, finalAmount - advanceINR);

    // Build historical booking snapshot with permanent price locking
    const bookingRecord = {
      id: `YZ-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      clientName: nameInput.value.trim(),
      clientEmail: emailInput?.value.trim() || STUDIO_INFO.email,
      clientPhone: phoneInput.value.trim(),
      eventDate: dateInput.value,
      location: locationInput?.value.trim() || 'Venue TBD',
      packageName: this.selectedPackage?.title || 'Wedding Photography',
      packagePrice: packagePrice,
      customizations: customizationsList,
      customizationTotal: customizationTotal,
      totalINR: finalAmount,
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

    // Reset customizations and form
    this.selectedCustomizations.clear();
    this.renderSelectedCustomizations();
    this.populateCustomizationDropdown();
    this.updateCalculation();
    document.getElementById('session-booking-form')?.reset();
  }

  showConfirmationModal(record) {
    const modal = document.getElementById('booking-confirmation-modal');
    if (!modal) return;

    document.getElementById('conf-booking-id').textContent = record.id;
    document.getElementById('conf-client-name').textContent = record.clientName;
    document.getElementById('conf-package-title').textContent = record.packageName;
    
    const basePkgEl = document.getElementById('conf-base-pkg-cost');
    if (basePkgEl) basePkgEl.textContent = currency.format(record.packagePrice || record.totalINR);

    const customRow = document.getElementById('conf-customizations-row');
    const customList = document.getElementById('conf-customizations-list');
    if (customRow && customList) {
      if (record.customizations && record.customizations.length > 0) {
        customRow.style.display = 'block';
        customList.innerHTML = record.customizations.map(c => `
          <div>• ${c.name} (${currency.format(c.price)})</div>
        `).join('');
      } else {
        customRow.style.display = 'none';
        customList.innerHTML = '';
      }
    }

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
