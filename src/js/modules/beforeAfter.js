import { DIGITAL_PRESETS } from '../data/presets.js';
import { currency } from './currency.js';
import { cart } from './cart.js';
import { toast } from '../utils/toast.js';

export class PresetsManager {
  constructor() {
    this.presets = DIGITAL_PRESETS;
    this.activePreset = this.presets[0];
    this.init();
  }

  init() {
    this.renderPresetsGrid();
    this.setupInteractiveSlider();
    this.bindEvents();

    document.addEventListener('currencyChange', () => {
      this.renderPresetsGrid();
      this.updateFeaturedPresetPrice();
    });
  }

  renderPresetsGrid() {
    const grid = document.getElementById('presets-products-grid');
    if (!grid) return;

    grid.innerHTML = this.presets.map(preset => {
      const priceFormatted = currency.format(preset.priceUSD);
      const originalPriceFormatted = currency.format(preset.originalPriceUSD);

      return `
        <article class="preset-card ${preset.id === this.activePreset.id ? 'active' : ''}" data-id="${preset.id}">
          <div class="preset-card-header">
            <div class="preset-badge-group">
              <span class="badge badge-gold">${preset.badge}</span>
              <span class="preset-format">${preset.format}</span>
            </div>
            <div class="preset-rating">
              <span class="stars">★★★★★</span>
              <span class="rating-num">${preset.rating}</span>
              <span class="reviews-count">(${preset.reviewsCount})</span>
            </div>
          </div>

          <h3 class="preset-card-title">${preset.title}</h3>
          <p class="preset-card-subtitle">${preset.subtitle}</p>

          <p class="preset-card-desc">${preset.description}</p>

          <div class="preset-includes-box">
            <span class="includes-label"><i data-lucide="package-check"></i> What's Included:</span>
            <ul class="includes-list">
              ${preset.includes.slice(0, 3).map(inc => `<li>✦ ${inc}</li>`).join('')}
            </ul>
          </div>

          <div class="preset-card-footer">
            <div class="preset-pricing">
              <span class="original-price">${originalPriceFormatted}</span>
              <strong class="current-price">${priceFormatted}</strong>
            </div>
            <div class="preset-actions">
              <button class="btn btn-secondary btn-sm btn-preview-preset" data-id="${preset.id}">
                <i data-lucide="split-square-vertical"></i> Compare
              </button>
              <button class="btn btn-primary btn-sm btn-add-preset" data-id="${preset.id}">
                <i data-lucide="download"></i> Get Pack
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  setupInteractiveSlider() {
    const sliderContainer = document.getElementById('featured-before-after-slider');
    if (!sliderContainer) return;

    this.updateFeaturedPresetDisplay();

    const divider = document.getElementById('ba-slider-divider');
    const afterWrap = document.getElementById('ba-after-wrapper');
    const handle = document.getElementById('ba-slider-handle');

    let isDragging = false;

    const setPosition = (clientX) => {
      const rect = sliderContainer.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;

      if (divider) divider.style.left = `${percentage}%`;
      if (afterWrap) afterWrap.style.clipPath = `polygon(0 0, ${percentage}% 0, ${percentage}% 100%, 0 100%)`;
      if (handle) handle.style.left = `${percentage}%`;
    };

    sliderContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      setPosition(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      setPosition(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch support for mobile & tablet
    sliderContainer.addEventListener('touchstart', (e) => {
      isDragging = true;
      setPosition(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      setPosition(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  updateFeaturedPresetDisplay() {
    const preset = this.activePreset;
    const beforeImg = document.getElementById('ba-img-before');
    const afterImg = document.getElementById('ba-img-after');
    const titleEl = document.getElementById('featured-preset-title');
    const descEl = document.getElementById('featured-preset-desc');
    const priceEl = document.getElementById('featured-preset-price');
    const addBtn = document.getElementById('featured-preset-add-btn');

    if (beforeImg) beforeImg.src = preset.beforeImage;
    if (afterImg) afterImg.src = preset.afterImage;
    if (titleEl) titleEl.textContent = preset.title;
    if (descEl) descEl.textContent = preset.description;
    if (addBtn) addBtn.dataset.id = preset.id;

    this.updateFeaturedPresetPrice();
  }

  updateFeaturedPresetPrice() {
    const priceEl = document.getElementById('featured-preset-price');
    if (priceEl && this.activePreset) {
      priceEl.innerHTML = `
        <span class="old-price">${currency.format(this.activePreset.originalPriceUSD)}</span>
        <strong class="now-price">${currency.format(this.activePreset.priceUSD)}</strong>
      `;
    }
  }

  bindEvents() {
    const grid = document.getElementById('presets-products-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const previewBtn = e.target.closest('.btn-preview-preset');
        const addBtn = e.target.closest('.btn-add-preset');

        if (previewBtn) {
          const id = previewBtn.dataset.id;
          const found = this.presets.find(p => p.id === id);
          if (found) {
            this.activePreset = found;
            this.updateFeaturedPresetDisplay();
            this.renderPresetsGrid();

            // Smooth scroll to comparison slider
            document.getElementById('presets-interactive-demo')?.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (addBtn) {
          const id = addBtn.dataset.id;
          this.addPresetToCart(id);
        }
      });
    }

    document.getElementById('featured-preset-add-btn')?.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id || this.activePreset.id;
      this.addPresetToCart(id);
    });
  }

  addPresetToCart(presetId) {
    const preset = this.presets.find(p => p.id === presetId);
    if (!preset) return;

    cart.addItem({
      id: preset.id,
      type: 'preset',
      title: preset.title,
      subtitle: preset.subtitle,
      image: preset.afterImage,
      priceUSD: preset.priceUSD,
      quantity: 1,
      format: preset.format
    });

    document.getElementById('cart-drawer')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}
