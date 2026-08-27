import { dataStore } from '../utils/dataStore.js';
import { currency } from './currency.js';
import { toast } from '../utils/toast.js';
import { sound } from '../utils/sound.js';

export class CustomPackageBuilder {
  constructor() {
    this.services = [];
    this.selectedServiceIds = new Set(['srv-trad-photo', 'srv-candid-photo', 'srv-trad-video', 'srv-album-3612']);
    this.activeView = 'curated'; // 'curated' | 'custom'
    this.init();
  }

  async init() {
    this.setupViewSwitcher();
    await this.loadServices();
    this.renderServicesGrid();
    this.renderSummary();
    this.bindEvents();

    document.addEventListener('currencyChange', () => {
      this.renderServicesGrid();
      this.renderSummary();
    });

    document.addEventListener('servicesUpdated', async () => {
      await this.loadServices();
      this.renderServicesGrid();
      this.renderSummary();
    });
  }

  async loadServices() {
    try {
      this.services = await dataStore.getCustomServices();
    } catch (e) {
      console.warn('Failed to load custom services from dataStore:', e);
      this.services = [];
    }
  }

  setupViewSwitcher() {
    const curatedBtn = document.getElementById('view-curated-packages-btn');
    const customBtn = document.getElementById('view-custom-builder-btn');
    const curatedStage = document.getElementById('curated-packages-stage');
    const customStage = document.getElementById('custom-package-builder-stage');

    curatedBtn?.addEventListener('click', () => {
      this.activeView = 'curated';
      curatedBtn.classList.add('active');
      customBtn?.classList.remove('active');
      if (curatedStage) curatedStage.style.display = 'grid';
      if (customStage) customStage.classList.remove('active');
    });

    customBtn?.addEventListener('click', () => {
      this.activeView = 'custom';
      customBtn.classList.add('active');
      curatedBtn?.classList.remove('active');
      if (curatedStage) curatedStage.style.display = 'none';
      if (customStage) customStage.classList.add('active');
      this.renderServicesGrid();
      this.renderSummary();
    });
  }

  renderServicesGrid() {
    const container = document.getElementById('custom-services-selection-grid');
    if (!container) return;

    container.innerHTML = this.services.map(srv => {
      const isSelected = this.selectedServiceIds.has(srv.id);
      const priceFormatted = currency.format(srv.priceINR);

      return `
        <div class="custom-service-card ${isSelected ? 'selected' : ''}" data-id="${srv.id}">
          <div>
            <div class="custom-service-header">
              <span class="custom-service-category">${srv.category}</span>
              <div class="custom-service-checkbox">
                <i data-lucide="check" style="width: 14px; height: 14px;"></i>
              </div>
            </div>
            <h4 class="custom-service-title">${srv.name}</h4>
            <p class="custom-service-desc">${srv.description || ''}</p>
          </div>
          <div class="custom-service-footer">
            <span class="custom-service-price">${priceFormatted}</span>
            <span class="custom-service-unit">${srv.unit || 'per session'}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    // Bind card clicks
    container.querySelectorAll('.custom-service-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        if (this.selectedServiceIds.has(id)) {
          this.selectedServiceIds.delete(id);
        } else {
          this.selectedServiceIds.add(id);
          sound.playShutter();
        }
        this.renderServicesGrid();
        this.renderSummary();
      });
    });
  }

  calculateTotalINR() {
    return Array.from(this.selectedServiceIds).reduce((sum, id) => {
      const srv = this.services.find(s => s.id === id);
      return sum + (srv ? srv.priceINR : 0);
    }, 0);
  }

  renderSummary() {
    const listContainer = document.getElementById('custom-summary-selected-items');
    const totalValEl = document.getElementById('custom-summary-grand-total');
    const countBadge = document.getElementById('custom-selected-count-badge');
    const advanceValEl = document.getElementById('custom-summary-advance-val');
    const balanceValEl = document.getElementById('custom-summary-balance-val');

    const selectedList = this.services.filter(s => this.selectedServiceIds.has(s.id));
    const totalINR = this.calculateTotalINR();
    const tokenAdvanceINR = totalINR > 0 ? (totalINR >= 50000 ? 10000 : 5000) : 0;
    const remainingBalanceINR = Math.max(0, totalINR - tokenAdvanceINR);

    if (countBadge) countBadge.textContent = `${selectedList.length} Selected`;
    if (totalValEl) totalValEl.textContent = currency.format(totalINR);
    if (advanceValEl) advanceValEl.textContent = currency.format(tokenAdvanceINR);
    if (balanceValEl) balanceValEl.textContent = currency.format(remainingBalanceINR);

    if (listContainer) {
      if (selectedList.length === 0) {
        listContainer.innerHTML = `
          <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem 0;">
            Click on services above to build your custom package.
          </div>
        `;
      } else {
        listContainer.innerHTML = selectedList.map(srv => `
          <div class="custom-summary-item-row">
            <span class="custom-summary-item-name" title="${srv.name}">✦ ${srv.name}</span>
            <span class="custom-summary-item-price">${currency.format(srv.priceINR)}</span>
          </div>
        `).join('');
      }
    }
  }

  bindEvents() {
    const bookCustomBtn = document.getElementById('btn-book-custom-package');
    bookCustomBtn?.addEventListener('click', () => {
      const selectedList = this.services.filter(s => this.selectedServiceIds.has(s.id));
      if (selectedList.length === 0) {
        toast.show({ title: 'No Services Selected', message: 'Please select at least one service to book a custom package.', type: 'warning', icon: 'warning' });
        return;
      }

      const totalINR = this.calculateTotalINR();
      const servicesSummary = selectedList.map(s => `• ${s.name} (${currency.format(s.priceINR)})`).join('\n');

      // Transfer to booking inquiry form
      const packageSelect = document.getElementById('booking-package-select');
      const advanceInput = document.getElementById('booking-advance-amount');
      const notesInput = document.getElementById('booking-notes');

      if (packageSelect) {
        let customOpt = Array.from(packageSelect.options).find(o => o.value.includes('Custom'));
        if (!customOpt) {
          customOpt = new Option(`Custom Package (${currency.format(totalINR)})`, `Custom Package - ${currency.format(totalINR)}`);
          packageSelect.add(customOpt);
        } else {
          customOpt.text = `Custom Package (${currency.format(totalINR)})`;
          customOpt.value = `Custom Package - ${currency.format(totalINR)}`;
        }
        packageSelect.value = customOpt.value;
      }

      if (advanceInput) {
        advanceInput.value = totalINR >= 50000 ? 10000 : 5000;
        advanceInput.dispatchEvent(new Event('input'));
      }

      if (notesInput) {
        notesInput.value = `Custom Package Selected Items:\n${servicesSummary}\nTotal Estimate: ${currency.format(totalINR)}`;
      }

      sound.playSuccessChime();
      toast.success('Custom package transferred to Booking Inquiry.', 'Package Configured');

      const targetSection = document.getElementById('session-booking-form');
      targetSection?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
