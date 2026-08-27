import { CLIENT_DEMO_GALLERIES } from '../data/clientDemos.js';
import { cloudStorage } from '../utils/cloudStorage.js';
import { sound } from '../utils/sound.js';
import { toast } from '../utils/toast.js';

export class ClientPortalManager {
  constructor() {
    this.currentClient = null;
    this.favorites = new Set();
    this.currentPin = null;
    this.init();
  }

  init() {
    this.bindEvents();

    document.addEventListener('photosUpdated', async () => {
      if (this.currentClient && this.currentPin) {
        await this.loadGalleryForPin(this.currentPin);
      }
    });
  }

  bindEvents() {
    const loginForm = document.getElementById('client-login-form');
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = document.getElementById('client-pin-input')?.value.trim();
      if (pin) await this.authenticateWithPin(pin);
    });

    document.querySelectorAll('.btn-demo-client-access').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pin = btn.dataset.pin;
        document.getElementById('client-pin-input').value = pin;
        await this.authenticateWithPin(pin);
      });
    });

    document.getElementById('btn-exit-client-gallery')?.addEventListener('click', () => {
      this.lockGallery();
    });

    document.getElementById('toggle-client-favorites')?.addEventListener('click', () => {
      this.filterByFavoritesOnly();
    });

    document.getElementById('btn-download-proofs')?.addEventListener('click', () => {
      sound.playSuccessChime();
      toast.success('Your selected photos are being prepared for high-res download.', 'Download Archive');
    });

    document.getElementById('btn-order-gallery-prints')?.addEventListener('click', () => {
      sound.playSuccessChime();
      toast.cart('Selected proofs submitted for 36x12" album layout & print processing.', 'Order Received');
    });
  }

  async authenticateWithPin(pin) {
    this.currentPin = pin;
    const client = CLIENT_DEMO_GALLERIES[pin];

    // Check if there are private uploaded photos for this PIN
    const privateUploads = await cloudStorage.getPrivatePhotosByPin(pin);

    if (!client && privateUploads.length === 0) {
      toast.show({
        title: 'Invalid PIN',
        message: 'No private wedding gallery found for this PIN code. Please verify your delivery email or try demo PIN 1234.',
        type: 'error',
        icon: 'warning'
      });
      return;
    }

    // Build client gallery object
    if (client) {
      this.currentClient = { ...client };
      this.currentClient.photos = [...privateUploads, ...client.photos];
    } else {
      this.currentClient = {
        id: `client-${pin}`,
        title: `${privateUploads[0]?.clientName || 'Private Event'} Gallery`,
        names: privateUploads[0]?.clientName || 'Private Client',
        date: 'Wedding & Event Proofs',
        coverImage: privateUploads[0]?.image || privateUploads[0]?.url || '',
        photos: privateUploads
      };
    }

    this.favorites = new Set(this.currentClient.photos.filter(p => p.selected || p.favorite).map(p => p.id));

    sound.playSuccessChime();
    toast.success(`Welcome ${this.currentClient.names}. Private gallery unlocked.`, 'Gallery Unlocked');

    this.renderClientGallery();
  }

  async loadGalleryForPin(pin) {
    const client = CLIENT_DEMO_GALLERIES[pin];
    const privateUploads = await cloudStorage.getPrivatePhotosByPin(pin);

    if (client) {
      this.currentClient = { ...client, photos: [...privateUploads, ...client.photos] };
    } else if (privateUploads.length > 0) {
      this.currentClient.photos = privateUploads;
    }
    this.renderClientGallery();
  }

  renderClientGallery() {
    const loginView = document.getElementById('client-portal-login-view');
    const galleryView = document.getElementById('client-portal-gallery-view');

    if (!loginView || !galleryView || !this.currentClient) return;

    loginView.classList.add('hidden');
    galleryView.classList.remove('hidden');

    document.getElementById('client-gallery-title').textContent = this.currentClient.title;
    document.getElementById('client-gallery-names').textContent = this.currentClient.names;
    document.getElementById('client-gallery-meta').textContent = `${this.currentClient.date} · ${this.currentClient.photos.length} Photographs`;

    const heroCover = document.getElementById('client-hero-cover');
    if (heroCover && this.currentClient.coverImage) {
      heroCover.style.backgroundImage = `url('${this.currentClient.coverImage}')`;
    }

    this.renderPhotosGrid();
    this.updateFavCountBadge();
  }

  renderPhotosGrid(onlyFavorites = false) {
    const grid = document.getElementById('client-photos-grid');
    if (!grid || !this.currentClient) return;

    const photosToRender = onlyFavorites
      ? this.currentClient.photos.filter(p => this.favorites.has(p.id))
      : this.currentClient.photos;

    if (photosToRender.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <p>No photos selected in favorites yet.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = photosToRender.map(photo => {
      const isFav = this.favorites.has(photo.id);
      const imgUrl = photo.thumbnail || photo.image || photo.url;

      return `
        <div class="client-photo-card ${isFav ? 'selected' : ''}" data-id="${photo.id}">
          <img src="${imgUrl}" alt="${photo.title || photo.code || 'Proof Photo'}" loading="lazy" class="client-proof-img" />
          <div class="watermark-overlay">YAZH PROOF</div>
          <button type="button" class="btn-client-heart ${isFav ? 'active' : ''}" data-id="${photo.id}" title="Select for Album">
            ♥
          </button>
          <div class="client-photo-meta-bar">
            <span class="proof-code">${photo.title || photo.code || 'IMG-PROOF'}</span>
            <span class="proof-select-tag">${isFav ? '✓ Selected for Album' : 'Click ♥ to Select'}</span>
          </div>
        </div>
      `;
    }).join('');

    // Bind heart clicks
    grid.querySelectorAll('.btn-client-heart, .client-photo-card').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = el.dataset.id || el.closest('.client-photo-card').dataset.id;
        this.toggleFavorite(id);
      });
    });
  }

  toggleFavorite(id) {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
      toast.info('Removed from 36x12" album selection.');
    } else {
      this.favorites.add(id);
      sound.playShutter();
      toast.show({ title: 'Selected', message: 'Added to 36x12" Deluxe Album selection.', type: 'success', icon: 'heart' });
    }

    this.updateFavCountBadge();
    this.renderPhotosGrid();
  }

  updateFavCountBadge() {
    const badge = document.getElementById('client-fav-count');
    if (badge) {
      badge.textContent = `${this.favorites.size} Selected for Album`;
    }
  }

  filterByFavoritesOnly() {
    const btn = document.getElementById('toggle-client-favorites');
    const isShowingFavsOnly = btn?.classList.toggle('active-filter');
    this.renderPhotosGrid(isShowingFavsOnly);
  }

  lockGallery() {
    this.currentClient = null;
    this.currentPin = null;
    this.favorites.clear();

    document.getElementById('client-portal-login-view')?.classList.remove('hidden');
    document.getElementById('client-portal-gallery-view')?.classList.add('hidden');
    document.getElementById('client-pin-input').value = '';
    toast.info('Gallery locked.');
  }
}
