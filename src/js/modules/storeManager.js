import { FINE_ART_PRINTS, PRINT_SIZES, PRINT_MEDIA, FRAMING_OPTIONS, MATTING_OPTIONS } from '../data/products.js';
import { currency } from './currency.js';
import { cart } from './cart.js';
import { toast } from '../utils/toast.js';

export class StoreManager {
  constructor() {
    this.prints = FINE_ART_PRINTS;
    this.selectedCategory = 'all';
    this.currentPrint = this.prints[0];
    this.customizerState = {
      size: PRINT_SIZES[1], // Default 12x18
      media: PRINT_MEDIA[0],
      frame: FRAMING_OPTIONS[1], // Black Frame
      matting: MATTING_OPTIONS[0],
      quantity: 1
    };
    this.visualizerState = {
      room: 'living',
      wallColor: '#1c1f26',
      scale: 65
    };

    this.init();
  }

  init() {
    this.renderStoreGrid();
    this.bindEvents();
    this.setupVisualizer();

    document.addEventListener('currencyChange', () => {
      this.renderStoreGrid();
      this.updateCustomizerPrice();
    });
  }

  renderStoreGrid() {
    const grid = document.getElementById('store-products-grid');
    if (!grid) return;

    const filtered = this.selectedCategory === 'all'
      ? this.prints
      : this.selectedCategory === 'limited'
        ? this.prints.filter(p => p.editionType === 'Limited Edition')
        : this.prints.filter(p => p.category.toLowerCase().includes(this.selectedCategory.toLowerCase()));

    grid.innerHTML = filtered.map(print => {
      const priceFormatted = currency.format(print.basePriceINR);
      const isLimited = print.editionType === 'Limited Edition';

      return `
        <article class="store-card" data-id="${print.id}">
          <div class="store-card-image-wrap">
            <img src="${print.thumbnail}" alt="${print.title}" loading="lazy" class="store-card-img" />
            <div class="store-card-badges">
              <span class="badge ${isLimited ? 'badge-gold' : 'badge-subtle'}">${print.editionType}</span>
              ${isLimited ? `<span class="badge-edition">#${print.editionsSold + 1} / ${print.editionCount}</span>` : ''}
            </div>
            <div class="store-card-overlay">
              <button class="btn btn-secondary btn-sm btn-quick-view" data-id="${print.id}">
                Quick View
              </button>
              <button class="btn btn-primary btn-sm btn-customize-print" data-id="${print.id}">
                Customize Print
              </button>
            </div>
          </div>
          <div class="store-card-body">
            <div class="store-card-meta">
              <span class="store-card-category">${print.category}</span>
              <span class="store-card-location">${print.subtitle}</span>
            </div>
            <h3 class="store-card-title">${print.title}</h3>
            <div class="store-card-footer">
              <div class="store-card-price">
                <span class="price-from">From</span>
                <strong class="price-val">${priceFormatted}</strong>
              </div>
              <button class="btn btn-outline btn-icon-only btn-room-view" title="View in Room" data-id="${print.id}">
                <i data-lucide="maximize-2" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    document.querySelectorAll('.store-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.store-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedCategory = btn.dataset.category;
        this.renderStoreGrid();
      });
    });

    const grid = document.getElementById('store-products-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const customBtn = e.target.closest('.btn-customize-print') || e.target.closest('.btn-quick-view');
        const roomBtn = e.target.closest('.btn-room-view');
        const cardImg = e.target.closest('.store-card-image-wrap');

        if (customBtn || cardImg) {
          const card = e.target.closest('.store-card');
          if (card) this.openCustomizer(card.dataset.id);
        } else if (roomBtn) {
          this.openRoomVisualizer(roomBtn.dataset.id);
        }
      });
    }

    const customizerModal = document.getElementById('print-customizer-modal');
    if (customizerModal) {
      customizerModal.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
        el.addEventListener('click', () => this.closeCustomizer());
      });

      document.getElementById('customizer-sizes')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.size-option-btn');
        if (btn) {
          document.querySelectorAll('.size-option-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.customizerState.size = PRINT_SIZES.find(s => s.id === btn.dataset.sizeId);
          this.updateCustomizerPrice();
          this.updateCustomizerPreview();
        }
      });

      document.getElementById('customizer-media')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.media-option-card');
        if (btn) {
          document.querySelectorAll('.media-option-card').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.customizerState.media = PRINT_MEDIA.find(m => m.id === btn.dataset.mediaId);
          this.updateCustomizerPrice();
          this.updateCustomizerPreview();
        }
      });

      document.getElementById('customizer-frames')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.frame-option-card');
        if (btn) {
          document.querySelectorAll('.frame-option-card').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.customizerState.frame = FRAMING_OPTIONS.find(f => f.id === btn.dataset.frameId);
          this.updateCustomizerPrice();
          this.updateCustomizerPreview();
        }
      });

      document.getElementById('customizer-matting')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.matting-option-btn');
        if (btn) {
          document.querySelectorAll('.matting-option-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.customizerState.matting = MATTING_OPTIONS.find(m => m.id === btn.dataset.mattingId);
          this.updateCustomizerPrice();
          this.updateCustomizerPreview();
        }
      });

      document.getElementById('customizer-qty-minus')?.addEventListener('click', () => {
        if (this.customizerState.quantity > 1) {
          this.customizerState.quantity--;
          document.getElementById('customizer-qty-val').textContent = this.customizerState.quantity;
          this.updateCustomizerPrice();
        }
      });

      document.getElementById('customizer-qty-plus')?.addEventListener('click', () => {
        if (this.customizerState.quantity < 10) {
          this.customizerState.quantity++;
          document.getElementById('customizer-qty-val').textContent = this.customizerState.quantity;
          this.updateCustomizerPrice();
        }
      });

      document.getElementById('customizer-add-cart')?.addEventListener('click', () => {
        this.addCustomizedPrintToCart();
      });

      document.getElementById('customizer-open-room')?.addEventListener('click', () => {
        this.openRoomVisualizer(this.currentPrint.id);
      });
    }
  }

  openCustomizer(printId) {
    const print = this.prints.find(p => p.id === printId) || this.prints[0];
    this.currentPrint = print;
    this.customizerState.quantity = 1;

    const modal = document.getElementById('print-customizer-modal');
    if (!modal) return;

    document.getElementById('customizer-print-title').textContent = print.title;
    document.getElementById('customizer-print-location').textContent = print.subtitle;
    document.getElementById('customizer-print-story').textContent = print.story;
    document.getElementById('customizer-print-camera').textContent = print.camera;

    const editionBadge = document.getElementById('customizer-print-edition');
    if (print.editionType === 'Limited Edition') {
      editionBadge.innerHTML = `<span class="badge badge-gold">Limited Edition</span> <span class="edition-sold-text" style="font-size:0.75rem; color:var(--text-dim);">#${print.editionsSold + 1} of ${print.editionCount} remaining</span>`;
      editionBadge.style.display = 'flex';
    } else {
      editionBadge.innerHTML = `<span class="badge badge-subtle">Open Edition Fine Art</span>`;
      editionBadge.style.display = 'flex';
    }

    const sizeContainer = document.getElementById('customizer-sizes');
    if (sizeContainer) {
      sizeContainer.innerHTML = PRINT_SIZES.map((size) => `
        <button type="button" class="size-option-btn ${size.id === this.customizerState.size.id ? 'active' : ''}" data-size-id="${size.id}">
          <span class="size-inches">${size.name}</span>
          <span class="size-cm">${size.cm}</span>
        </button>
      `).join('');
    }

    const mediaContainer = document.getElementById('customizer-media');
    if (mediaContainer) {
      mediaContainer.innerHTML = PRINT_MEDIA.map(media => `
        <div class="media-option-card ${media.id === this.customizerState.media.id ? 'active' : ''}" data-media-id="${media.id}">
          <div class="media-header">
            <strong class="media-title">${media.name}</strong>
            <span class="media-badge">${media.badge}</span>
          </div>
          <p class="media-desc">${media.description}</p>
          <span class="media-price-diff">${media.priceAddINR > 0 ? `+${currency.format(media.priceAddINR)}` : 'Included'}</span>
        </div>
      `).join('');
    }

    const frameContainer = document.getElementById('customizer-frames');
    if (frameContainer) {
      frameContainer.innerHTML = FRAMING_OPTIONS.map(frame => `
        <div class="frame-option-card ${frame.id === this.customizerState.frame.id ? 'active' : ''}" data-frame-id="${frame.id}">
          <div class="frame-swatch frame-swatch-${frame.id}"></div>
          <div class="frame-info">
            <strong class="frame-title">${frame.name}</strong>
            <span class="frame-price-diff">${frame.priceAddINR > 0 ? `+${currency.format(frame.priceAddINR)}` : 'No Frame'}</span>
          </div>
        </div>
      `).join('');
    }

    const mattingContainer = document.getElementById('customizer-matting');
    if (mattingContainer) {
      mattingContainer.innerHTML = MATTING_OPTIONS.map(mat => `
        <button type="button" class="matting-option-btn ${mat.id === this.customizerState.matting.id ? 'active' : ''}" data-matting-id="${mat.id}">
          <span>${mat.name}</span>
          <span class="mat-price">${mat.priceAddINR > 0 ? `+${currency.format(mat.priceAddINR)}` : 'Included'}</span>
        </button>
      `).join('');
    }

    document.getElementById('customizer-qty-val').textContent = '1';
    this.updateCustomizerPreview();
    this.updateCustomizerPrice();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (window.lucide) window.lucide.createIcons();
  }

  closeCustomizer() {
    const modal = document.getElementById('print-customizer-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  calculateCurrentPriceINR() {
    const sizeMultiplier = this.customizerState.size.multiplier;
    const base = this.currentPrint.basePriceINR * sizeMultiplier;
    const mediaAdd = this.customizerState.media.priceAddINR;
    const frameAdd = this.customizerState.frame.priceAddINR * sizeMultiplier;
    const mattingAdd = this.customizerState.matting.priceAddINR;

    const unitPrice = Math.round(base + mediaAdd + frameAdd + mattingAdd);
    return {
      unitPriceINR: unitPrice,
      totalINR: unitPrice * this.customizerState.quantity
    };
  }

  updateCustomizerPrice() {
    const { unitPriceINR, totalINR } = this.calculateCurrentPriceINR();
    const unitFormatted = currency.format(unitPriceINR);
    const totalFormatted = currency.format(totalINR);

    const priceEl = document.getElementById('customizer-total-price');
    if (priceEl) {
      priceEl.innerHTML = `
        <span class="unit-price">${unitFormatted} ea.</span>
        <strong class="total-price">${totalFormatted}</strong>
      `;
    }
  }

  updateCustomizerPreview() {
    const previewArt = document.getElementById('customizer-artwork-img');
    const frameWrap = document.getElementById('customizer-frame-wrapper');
    const matWrap = document.getElementById('customizer-mat-wrapper');

    if (previewArt) {
      previewArt.src = this.currentPrint.image;
      previewArt.alt = this.currentPrint.title;
    }

    if (frameWrap) {
      frameWrap.className = `art-frame-container frame-${this.customizerState.frame.id}`;
    }

    if (matWrap) {
      matWrap.className = `art-mat-container mat-${this.customizerState.matting.id}`;
    }
  }

  addCustomizedPrintToCart() {
    const { unitPriceINR } = this.calculateCurrentPriceINR();

    cart.addItem({
      id: this.currentPrint.id,
      type: 'print',
      title: this.currentPrint.title,
      subtitle: `${this.currentPrint.subtitle} — ${this.customizerState.size.name}`,
      image: this.currentPrint.thumbnail,
      priceINR: unitPriceINR,
      quantity: this.customizerState.quantity,
      sizeId: this.customizerState.size.id,
      sizeName: this.customizerState.size.name,
      mediaId: this.customizerState.media.id,
      mediaName: this.customizerState.media.name,
      frameId: this.customizerState.frame.id,
      frameName: this.customizerState.frame.name,
      mattingId: this.customizerState.matting.id,
      mattingName: this.customizerState.matting.name,
      editionType: this.currentPrint.editionType
    });

    this.closeCustomizer();
    document.getElementById('cart-drawer')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  setupVisualizer() {
    const visualizerModal = document.getElementById('room-visualizer-modal');
    if (!visualizerModal) return;

    visualizerModal.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        visualizerModal.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    document.querySelectorAll('.room-scene-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.room-scene-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.visualizerState.room = btn.dataset.room;
        this.updateRoomScene();
      });
    });

    document.querySelectorAll('.wall-color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.wall-color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.visualizerState.wallColor = swatch.dataset.color;
        this.updateRoomScene();
      });
    });

    document.getElementById('visualizer-scale-slider')?.addEventListener('input', (e) => {
      this.visualizerState.scale = e.target.value;
      this.updateRoomScene();
    });
  }

  openRoomVisualizer(printId) {
    const print = this.prints.find(p => p.id === printId) || this.currentPrint || this.prints[0];
    this.currentPrint = print;

    const modal = document.getElementById('room-visualizer-modal');
    if (!modal) return;

    document.getElementById('visualizer-print-title').textContent = print.title;
    document.getElementById('visualizer-print-size-label').textContent = `${this.customizerState.size.name} (${this.customizerState.size.cm})`;

    const artImg = document.getElementById('visualizer-hanging-art');
    if (artImg) artImg.src = print.image;

    this.updateRoomScene();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  updateRoomScene() {
    const stage = document.getElementById('visualizer-room-stage');
    const artFrame = document.getElementById('visualizer-art-frame');
    const scaleVal = document.getElementById('visualizer-scale-val');

    if (stage) {
      stage.className = `visualizer-room-stage room-${this.visualizerState.room}`;
      stage.style.setProperty('--wall-color', this.visualizerState.wallColor);
    }

    if (artFrame) {
      artFrame.className = `hanging-art-frame frame-${this.customizerState.frame.id}`;
      artFrame.style.transform = `scale(${this.visualizerState.scale / 100})`;
    }

    if (scaleVal) {
      scaleVal.textContent = `${this.visualizerState.scale}% scale`;
    }
  }
}
