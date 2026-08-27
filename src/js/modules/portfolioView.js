import { PORTFOLIO_ITEMS, PORTFOLIO_CATEGORIES } from '../data/portfolio.js';
import { photoDB } from '../utils/dbStorage.js';
import { sound } from '../utils/sound.js';
import { toast } from '../utils/toast.js';

export class PortfolioViewer {
  constructor(storeManager) {
    this.builtInItems = PORTFOLIO_ITEMS;
    this.items = [...PORTFOLIO_ITEMS];
    this.categories = [...PORTFOLIO_CATEGORIES];
    this.selectedCategory = 'all';
    this.currentIndex = 0;
    this.storeManager = storeManager;
    this.likedItems = new Set(JSON.parse(localStorage.getItem('yazh_likes') || '[]'));

    this.init();
  }

  async init() {
    await this.loadAllPhotos();
    this.bindEvents();
    this.setupLightbox();

    document.addEventListener('photosUpdated', async () => {
      await this.loadAllPhotos();
    });

    document.addEventListener('categoriesUpdated', async () => {
      await this.loadAllPhotos();
    });
  }

  async loadAllPhotos() {
    try {
      const publicUploads = await photoDB.getPublicPhotos();
      this.items = [...publicUploads, ...this.builtInItems];

      // Dynamically build category pills from all available photos
      const dynamicCategories = new Map();
      dynamicCategories.set('all', 'All Works');

      // Seed with base categories
      PORTFOLIO_CATEGORIES.forEach(c => dynamicCategories.set(c.id, c.name));

      // Add any custom categories from uploads
      this.items.forEach(item => {
        if (item.category && item.categoryName && !dynamicCategories.has(item.category)) {
          dynamicCategories.set(item.category, item.categoryName);
        }
      });

      this.categories = Array.from(dynamicCategories.entries()).map(([id, name]) => ({ id, name }));
    } catch (e) {
      this.items = [...this.builtInItems];
      this.categories = [...PORTFOLIO_CATEGORIES];
    }

    this.renderCategoryTabs();
    this.renderPortfolioGrid();
  }

  renderCategoryTabs() {
    const tabsContainer = document.getElementById('portfolio-category-tabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = this.categories.map(cat => `
      <button class="portfolio-filter-btn ${cat.id === this.selectedCategory ? 'active' : ''}" data-category="${cat.id}">
        ${cat.name}
      </button>
    `).join('');
  }

  renderPortfolioGrid() {
    const grid = document.getElementById('portfolio-masonry-grid');
    if (!grid) return;

    const filtered = this.selectedCategory === 'all'
      ? this.items
      : this.items.filter(item => item.category === this.selectedCategory);

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <p>No photographs found in this category.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map((item, index) => {
      const isLiked = this.likedItems.has(item.id);

      return `
        <div class="portfolio-item-card" data-id="${item.id}" data-index="${index}">
          <div class="portfolio-item-inner">
            <img src="${item.thumbnail}" alt="${item.title}" loading="lazy" class="portfolio-img" />
            <div class="portfolio-overlay">
              <div class="portfolio-top-bar">
                <span class="portfolio-cat-badge">${item.categoryName || 'Wedding'}</span>
                <button class="btn-like-heart ${isLiked ? 'liked' : ''}" data-id="${item.id}" title="Save">
                  ♥
                </button>
              </div>

              <div class="portfolio-bottom-info">
                <h3 class="portfolio-title">${item.title}</h3>
                ${item.description ? `<p style="font-size:0.75rem; color:rgba(255,255,255,0.85); margin-bottom:0.75rem;">${item.description}</p>` : ''}
                <div class="portfolio-card-actions">
                  <button class="btn btn-secondary btn-sm btn-view-story" data-id="${item.id}">
                    View Fullscreen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    const tabsContainer = document.getElementById('portfolio-category-tabs');
    tabsContainer?.addEventListener('click', (e) => {
      const btn = e.target.closest('.portfolio-filter-btn');
      if (btn) {
        document.querySelectorAll('.portfolio-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedCategory = btn.dataset.category;
        this.renderPortfolioGrid();
      }
    });

    const grid = document.getElementById('portfolio-masonry-grid');
    grid?.addEventListener('click', (e) => {
      const heartBtn = e.target.closest('.btn-like-heart');
      const viewStoryBtn = e.target.closest('.btn-view-story');
      const itemCard = e.target.closest('.portfolio-item-card');

      if (heartBtn) {
        e.stopPropagation();
        this.toggleLike(heartBtn.dataset.id, heartBtn);
      } else if (viewStoryBtn || itemCard) {
        const id = (viewStoryBtn || itemCard).dataset.id;
        this.openLightbox(id);
      }
    });
  }

  toggleLike(id, btn) {
    if (this.likedItems.has(id)) {
      this.likedItems.delete(id);
      btn.classList.remove('liked');
      toast.info('Removed from favorites.');
    } else {
      this.likedItems.add(id);
      btn.classList.add('liked');
      sound.playShutter();
      toast.show({ title: 'Saved', message: 'Photo saved to your favorites.', type: 'success', icon: 'heart' });
    }
    localStorage.setItem('yazh_likes', JSON.stringify(Array.from(this.likedItems)));
  }

  setupLightbox() {
    const modal = document.getElementById('portfolio-lightbox-modal');
    if (!modal) return;

    modal.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => this.closeLightbox());
    });

    document.getElementById('lightbox-prev-btn')?.addEventListener('click', () => this.navigateLightbox(-1));
    document.getElementById('lightbox-next-btn')?.addEventListener('click', () => this.navigateLightbox(1));

    window.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') this.closeLightbox();
      if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
      if (e.key === 'ArrowRight') this.navigateLightbox(1);
    });

    document.getElementById('lightbox-order-print-btn')?.addEventListener('click', () => {
      this.closeLightbox();
      const bookingSection = document.getElementById('booking-section');
      bookingSection?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  openLightbox(itemId) {
    const idx = this.items.findIndex(i => i.id === itemId);
    this.currentIndex = idx >= 0 ? idx : 0;
    this.updateLightboxContent();

    const modal = document.getElementById('portfolio-lightbox-modal');
    modal?.classList.add('active');
    document.body.style.overflow = 'hidden';
    sound.playShutter();
  }

  closeLightbox() {
    const modal = document.getElementById('portfolio-lightbox-modal');
    modal?.classList.remove('active');
    document.body.style.overflow = '';
  }

  navigateLightbox(direction) {
    this.currentIndex = (this.currentIndex + direction + this.items.length) % this.items.length;
    this.updateLightboxContent();
  }

  updateLightboxContent() {
    const item = this.items[this.currentIndex];
    if (!item) return;

    const img = document.getElementById('lightbox-main-img');
    const title = document.getElementById('lightbox-title');
    const location = document.getElementById('lightbox-location');
    const story = document.getElementById('lightbox-story');

    if (img) {
      img.src = item.image;
      img.alt = item.title;
    }
    if (title) title.textContent = item.title;
    if (location) location.textContent = item.categoryName || 'Wedding Showcase';
    if (story) story.textContent = item.description || 'Captured by Yazh Photography. "Save your memory in every click."';
  }
}
