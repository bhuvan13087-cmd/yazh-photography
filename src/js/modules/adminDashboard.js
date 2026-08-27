import { currency } from './currency.js';
import { photoDB } from '../utils/dbStorage.js';
import { toast } from '../utils/toast.js';
import { sound } from '../utils/sound.js';
import { PORTFOLIO_CATEGORIES } from '../data/portfolio.js';
import { DEFAULT_CUSTOM_SERVICES } from '../data/customServices.js';

const DEFAULT_ADMIN_EMAIL = 'yazhphotographypvp@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'Yazh4100';

export class AdminDashboard {
  constructor() {
    this.isAuthenticated = sessionStorage.getItem('yazh_admin_authenticated') === 'true';
    this.currentTab = 'overview';
    this.selectedFileDataUrl = null;
    this.categories = this.loadCategories();
    this.services = this.loadServices();
    this.mediaFilterCategory = 'all';
    this.mediaSearchQuery = '';
    this.init();
  }

  init() {
    this.seedInitialDataIfEmpty();
    this.bindEvents();
    this.setupAuth();
    this.setupCategoryManager();
    this.setupPhotoUploader();
    this.setupCustomServicesManager();

    document.addEventListener('currencyChange', () => {
      if (this.isAuthenticated) this.renderDashboardData();
    });

    document.addEventListener('photosUpdated', () => {
      if (this.isAuthenticated) this.renderPhotoLibrary();
    });

    document.addEventListener('reviewsUpdated', () => {
      if (this.isAuthenticated) this.renderReviewsManager();
    });
  }

  loadCategories() {
    const saved = localStorage.getItem('yazh_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [...PORTFOLIO_CATEGORIES];
  }

  saveCategories(cats) {
    this.categories = cats;
    localStorage.setItem('yazh_categories', JSON.stringify(cats));
    this.renderCategorySelectOptions();
    this.renderCategoryManagerList();
    document.dispatchEvent(new CustomEvent('categoriesUpdated', { detail: cats }));
  }

  loadServices() {
    const saved = localStorage.getItem('yazh_custom_services');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }
    localStorage.setItem('yazh_custom_services', JSON.stringify(DEFAULT_CUSTOM_SERVICES));
    return [...DEFAULT_CUSTOM_SERVICES];
  }

  saveServices(services) {
    this.services = services;
    localStorage.setItem('yazh_custom_services', JSON.stringify(services));
    this.renderServicesManager();
    document.dispatchEvent(new CustomEvent('servicesUpdated', { detail: services }));
  }

  getAdminCredentials() {
    return {
      email: (localStorage.getItem('yazh_admin_email') || DEFAULT_ADMIN_EMAIL).toLowerCase().trim(),
      password: localStorage.getItem('yazh_admin_password') || DEFAULT_ADMIN_PASSWORD
    };
  }

  seedInitialDataIfEmpty() {
    const bookings = JSON.parse(localStorage.getItem('yazh_bookings') || '[]');
    if (bookings.length === 0) {
      const seedBookings = [
        {
          id: 'YZ-INQ-104',
          dateCreated: new Date(Date.now() - 3600000 * 12).toISOString(),
          clientName: 'Siddharth & Meera',
          clientEmail: 'siddharth.m@gmail.com',
          clientPhone: '9840123456',
          eventDate: '2026-11-20',
          location: 'Pattiveeranpatti',
          packageName: 'Standard package',
          totalINR: 60000,
          advanceINR: 5000,
          remainingINR: 55000,
          status: 'Booking Inquiry Received'
        }
      ];
      localStorage.setItem('yazh_bookings', JSON.stringify(seedBookings));
    }
  }

  setupAuth() {
    const authForm = document.getElementById('admin-auth-form');
    const emailInput = document.getElementById('admin-auth-email');
    const pwdInput = document.getElementById('admin-auth-passcode');
    const togglePwdBtn = document.getElementById('admin-toggle-pwd-visibility');
    const logoutBtn = document.getElementById('admin-logout-btn');
    const changePwdBtn = document.getElementById('btn-change-admin-pwd');

    // Toggle password visibility
    togglePwdBtn?.addEventListener('click', () => {
      if (pwdInput) {
        const isPassword = pwdInput.type === 'password';
        pwdInput.type = isPassword ? 'text' : 'password';
        togglePwdBtn.innerHTML = isPassword
          ? '<i data-lucide="eye-off" style="width: 16px; height: 16px;"></i>'
          : '<i data-lucide="eye" style="width: 16px; height: 16px;"></i>';
        if (window.lucide) window.lucide.createIcons();
      }
    });

    // Handle Authentication Submit
    authForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredEmail = emailInput?.value.trim().toLowerCase();
      const enteredPassword = pwdInput?.value.trim();
      const creds = this.getAdminCredentials();

      const emailValid = enteredEmail === creds.email || enteredEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();
      const passwordValid = enteredPassword === creds.password || enteredPassword === DEFAULT_ADMIN_PASSWORD;

      if (emailValid && passwordValid) {
        this.isAuthenticated = true;
        sessionStorage.setItem('yazh_admin_authenticated', 'true');
        sound.playSuccessChime();
        toast.success('Admin authentication verified.', 'Welcome Studio Admin');
        if (pwdInput) pwdInput.value = '';
        this.renderAuthView();
      } else {
        sound.playShutter();
        const container = document.querySelector('.admin-auth-container');
        container?.classList.add('admin-auth-shake');
        setTimeout(() => container?.classList.remove('admin-auth-shake'), 500);

        if (!emailValid) {
          toast.show({
            title: 'Access Denied',
            message: `Unrecognized studio email: "${enteredEmail}".`,
            type: 'error',
            icon: 'error'
          });
        } else {
          toast.show({
            title: 'Incorrect Password',
            message: 'Master password incorrect. Please check your credentials.',
            type: 'error',
            icon: 'error'
          });
        }
      }
    });

    // Handle Logout
    logoutBtn?.addEventListener('click', () => {
      this.isAuthenticated = false;
      sessionStorage.removeItem('yazh_admin_authenticated');
      toast.info('Studio admin session locked.');
      this.renderAuthView();
    });

    // Change Password
    changePwdBtn?.addEventListener('click', () => {
      const newPwd = prompt('Enter new Admin Password for Yazh Photography:');
      if (newPwd && newPwd.trim().length >= 4) {
        localStorage.setItem('yazh_admin_password', newPwd.trim());
        toast.success('Admin master password updated successfully.');
      } else if (newPwd !== null) {
        toast.show({ title: 'Invalid Password', message: 'Password must be at least 4 characters.', type: 'warning', icon: 'warning' });
      }
    });
  }

  bindEvents() {
    // Open Admin Modal Triggers
    document.querySelectorAll('.btn-open-admin').forEach(btn => {
      btn.addEventListener('click', () => this.open());
    });

    // Modal Close Triggers
    const modal = document.getElementById('admin-dashboard-modal');
    modal?.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => this.close());
    });

    // Tabs Navigation
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Top Bar Quick Upload Action Button
    const quickUploadBtn = document.getElementById('btn-admin-top-quick-upload');
    quickUploadBtn?.addEventListener('click', () => {
      this.switchTab('media');
      const titleInput = document.getElementById('admin-photo-title');
      titleInput?.focus();
    });

    // Media Explorer Search
    const searchInput = document.getElementById('admin-media-search');
    searchInput?.addEventListener('input', (e) => {
      this.mediaSearchQuery = e.target.value.toLowerCase().trim();
      this.renderPhotoLibrary();
    });
  }

  open() {
    const modal = document.getElementById('admin-dashboard-modal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.renderAuthView();
  }

  close() {
    const modal = document.getElementById('admin-dashboard-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.admin-tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `admin-tab-${tabName}`);
    });

    if (tabName === 'overview') this.renderDashboardData();
    if (tabName === 'media') {
      this.renderCategorySelectOptions();
      this.renderPhotoLibrary();
    }
    if (tabName === 'bookings') this.renderDashboardData();
    if (tabName === 'services') this.renderServicesManager();
    if (tabName === 'reviews') this.renderReviewsManager();
  }

  renderAuthView() {
    const authView = document.getElementById('admin-auth-view');
    const dashView = document.getElementById('admin-dashboard-view');
    const tabsNav = document.getElementById('admin-tabs-nav');
    const logoutBtn = document.getElementById('admin-logout-btn');
    const quickUploadBtn = document.getElementById('btn-admin-top-quick-upload');

    if (this.isAuthenticated) {
      if (authView) authView.style.display = 'none';
      if (dashView) {
        dashView.style.display = 'block';
        dashView.classList.remove('hidden');
      }
      if (tabsNav) tabsNav.style.display = 'flex';
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
      if (quickUploadBtn) quickUploadBtn.style.display = 'inline-flex';
      this.switchTab(this.currentTab || 'overview');
    } else {
      if (authView) authView.style.display = 'block';
      if (dashView) dashView.style.display = 'none';
      if (tabsNav) tabsNav.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (quickUploadBtn) quickUploadBtn.style.display = 'none';
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // Category Management Sub-System
  // ==========================================
  setupCategoryManager() {
    const modal = document.getElementById('category-manager-modal');
    const toggleBtn = document.getElementById('btn-toggle-category-manager');
    const addForm = document.getElementById('admin-add-category-form');
    const newCatInput = document.getElementById('admin-new-cat-name');

    toggleBtn?.addEventListener('click', () => {
      modal?.classList.add('active');
      this.renderCategoryManagerList();
    });

    modal?.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    });

    addForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = newCatInput?.value.trim();
      if (!val) return;

      const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (this.categories.some(c => c.id === slug || c.name.toLowerCase() === val.toLowerCase())) {
        toast.show({ title: 'Already Exists', message: `Category "${val}" already exists.`, type: 'warning', icon: 'warning' });
        return;
      }

      const updated = [...this.categories, { id: slug, name: val }];
      this.saveCategories(updated);
      if (newCatInput) newCatInput.value = '';
      toast.success(`Category "${val}" added.`);
    });
  }

  renderCategorySelectOptions() {
    const select = document.getElementById('admin-photo-category');
    if (!select) return;

    select.innerHTML = this.categories.map(c => `
      <option value="${c.id}">${c.name}</option>
    `).join('') + `<option value="custom">+ Add Custom Category...</option>`;
  }

  renderCategoryManagerList() {
    const container = document.getElementById('admin-categories-list-container');
    if (!container) return;

    container.innerHTML = this.categories.map((cat, idx) => `
      <div class="category-admin-row" data-id="${cat.id}">
        <input type="text" class="category-admin-name-input" value="${cat.name}" data-idx="${idx}" />
        <div class="category-admin-actions">
          <button type="button" class="btn-cat-save" data-idx="${idx}">Save</button>
          <button type="button" class="btn-cat-delete" data-idx="${idx}" ${this.categories.length <= 1 ? 'disabled style="opacity:0.4;"' : ''}>Delete</button>
        </div>
      </div>
    `).join('');

    // Bind Save and Delete
    container.querySelectorAll('.btn-cat-save').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const input = container.querySelector(`input[data-idx="${idx}"]`);
        if (input && input.value.trim()) {
          const newName = input.value.trim();
          this.categories[idx].name = newName;
          this.saveCategories([...this.categories]);
          toast.success(`Category renamed to "${newName}".`);
        }
      });
    });

    container.querySelectorAll('.btn-cat-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const catName = this.categories[idx]?.name;
        if (confirm(`Are you sure you want to delete the category "${catName}"?`)) {
          const updated = this.categories.filter((_, i) => i !== idx);
          this.saveCategories(updated);
          toast.info(`Category "${catName}" removed.`);
        }
      });
    });
  }

  // ==========================================
  // Custom Services & Pricing Manager Sub-System
  // ==========================================
  setupCustomServicesManager() {
    const addForm = document.getElementById('admin-add-service-form');
    addForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('admin-new-srv-name')?.value.trim();
      const cat = document.getElementById('admin-new-srv-cat')?.value.trim() || 'Photography';
      const price = parseFloat(document.getElementById('admin-new-srv-price')?.value) || 5000;
      const unit = document.getElementById('admin-new-srv-unit')?.value.trim() || 'per day';
      const desc = document.getElementById('admin-new-srv-desc')?.value.trim() || '';

      if (!name || price <= 0) {
        toast.show({ title: 'Invalid Service', message: 'Please provide a service title and positive price.', type: 'warning', icon: 'warning' });
        return;
      }

      const newSrv = {
        id: `srv-${Date.now()}`,
        name,
        category: cat,
        priceINR: price,
        unit,
        description: desc,
        icon: 'camera'
      };

      const updated = [...this.services, newSrv];
      this.saveServices(updated);
      addForm.reset();
      toast.success(`Service "${name}" added at ₹${price.toLocaleString()}.`, 'Pricing Updated');
    });
  }

  renderServicesManager() {
    const table = document.getElementById('admin-services-table-body');
    if (!table) return;

    table.innerHTML = this.services.map((srv, idx) => `
      <tr>
        <td>
          <input type="text" class="admin-service-input srv-edit-name" data-idx="${idx}" value="${srv.name}" />
        </td>
        <td>
          <input type="text" class="admin-service-input srv-edit-cat" data-idx="${idx}" value="${srv.category}" style="max-width: 140px;" />
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span>₹</span>
            <input type="number" class="admin-service-input srv-edit-price" data-idx="${idx}" value="${srv.priceINR}" style="max-width: 110px; font-weight: bold; color: var(--accent-gold);" />
          </div>
        </td>
        <td>
          <input type="text" class="admin-service-input srv-edit-unit" data-idx="${idx}" value="${srv.unit || 'per day'}" style="max-width: 120px;" />
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button type="button" class="btn btn-primary btn-sm btn-save-srv" data-idx="${idx}" style="padding: 0.3rem 0.6rem; font-size: 0.74rem;">
              Save
            </button>
            <button type="button" class="btn btn-outline btn-sm btn-delete-srv" data-idx="${idx}" style="color: var(--color-error); border-color: rgba(239,68,68,0.3); padding: 0.3rem 0.6rem; font-size: 0.74rem;">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Bind Save and Delete
    table.querySelectorAll('.btn-save-srv').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const nameInput = table.querySelector(`.srv-edit-name[data-idx="${idx}"]`);
        const catInput = table.querySelector(`.srv-edit-cat[data-idx="${idx}"]`);
        const priceInput = table.querySelector(`.srv-edit-price[data-idx="${idx}"]`);
        const unitInput = table.querySelector(`.srv-edit-unit[data-idx="${idx}"]`);

        if (nameInput && priceInput) {
          this.services[idx].name = nameInput.value.trim();
          this.services[idx].category = catInput ? catInput.value.trim() : 'Photography';
          this.services[idx].priceINR = parseFloat(priceInput.value) || 0;
          this.services[idx].unit = unitInput ? unitInput.value.trim() : 'per day';

          this.saveServices([...this.services]);
          toast.success(`Updated "${this.services[idx].name}" price to ₹${this.services[idx].priceINR.toLocaleString()}.`);
        }
      });
    });

    table.querySelectorAll('.btn-delete-srv').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const srvName = this.services[idx]?.name;
        if (confirm(`Remove custom service "${srvName}"?`)) {
          const updated = this.services.filter((_, i) => i !== idx);
          this.saveServices(updated);
          toast.info(`Service "${srvName}" deleted.`);
        }
      });
    });
  }

  // ==========================================
  // Photo Uploader & Media Library Sub-System
  // ==========================================
  setupPhotoUploader() {
    const dropzone = document.getElementById('admin-photo-dropzone');
    const fileInput = document.getElementById('admin-photo-file-input');
    const uploadForm = document.getElementById('admin-photo-upload-form');

    dropzone?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handleFileSelection(file);
    });

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files?.[0];
      if (file) this.handleFileSelection(file);
    });

    // Custom category input
    const categorySelect = document.getElementById('admin-photo-category');
    const customCatGroup = document.getElementById('custom-cat-input-group');
    categorySelect?.addEventListener('change', (e) => {
      if (customCatGroup) {
        customCatGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
      }
    });

    uploadForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handlePhotoUpload();
    });
  }

  handleFileSelection(file) {
    if (!file.type.startsWith('image/')) {
      toast.show({ title: 'Invalid File', message: 'Please select an image file (JPG, PNG, WEBP).', type: 'warning', icon: 'warning' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.selectedFileDataUrl = e.target.result;
      const previewCard = document.getElementById('admin-photo-preview-card');
      const previewImg = document.getElementById('admin-photo-preview-img');

      if (previewCard && previewImg) {
        previewImg.src = this.selectedFileDataUrl;
        previewCard.classList.add('has-image');
      }

      const titleInput = document.getElementById('admin-photo-title');
      if (titleInput && !titleInput.value) {
        titleInput.value = file.name.replace(/\.[^/.]+$/, "");
      }
    };
    reader.readAsDataURL(file);
  }

  async handlePhotoUpload() {
    if (!this.selectedFileDataUrl) {
      toast.show({ title: 'No Image', message: 'Please select or drag an image to upload.', type: 'warning', icon: 'warning' });
      return;
    }

    const title = document.getElementById('admin-photo-title')?.value || 'Untitled Photo';
    const categorySelect = document.getElementById('admin-photo-category')?.value || 'traditional';
    const customCatInput = document.getElementById('admin-custom-category-name')?.value.trim();

    let finalCategory = categorySelect;
    if (categorySelect === 'custom' && customCatInput) {
      const slug = customCatInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!this.categories.some(c => c.id === slug)) {
        this.saveCategories([...this.categories, { id: slug, name: customCatInput }]);
      }
      finalCategory = slug;
    }

    const desc = document.getElementById('admin-photo-desc')?.value.trim() || 'Master wedding photograph by Yazh Photography.';

    const newPhoto = {
      id: `photo-${Date.now()}`,
      title,
      category: finalCategory,
      story: desc,
      location: 'Tamil Nadu',
      date: new Date().toISOString(),
      imageData: this.selectedFileDataUrl
    };

    try {
      await photoDB.savePhoto(newPhoto);
      sound.playSuccessChime();
      toast.success(`"${title}" published to Portfolio.`);

      // Reset form
      document.getElementById('admin-photo-upload-form')?.reset();
      this.selectedFileDataUrl = null;
      document.getElementById('admin-photo-preview-card')?.classList.remove('has-image');
      const customGroup = document.getElementById('custom-cat-input-group');
      if (customGroup) customGroup.style.display = 'none';

      this.renderPhotoLibrary();
      this.renderDashboardData();
    } catch (err) {
      console.error(err);
      toast.show({ title: 'Upload Failed', message: 'Could not store image in browser storage.', type: 'error', icon: 'error' });
    }
  }

  async renderPhotoLibrary() {
    const grid = document.getElementById('admin-photo-library-grid');
    if (!grid) return;

    try {
      const photos = await photoDB.getAllPhotos();
      const countBadge = document.getElementById('admin-library-photo-count');
      if (countBadge) countBadge.textContent = `${photos.length} Photos`;

      let filtered = photos;
      if (this.mediaSearchQuery) {
        filtered = filtered.filter(p => p.title.toLowerCase().includes(this.mediaSearchQuery) || p.category.toLowerCase().includes(this.mediaSearchQuery));
      }

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--text-muted);">
            <p>No photos match the current query. Upload photos to see them here.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(p => {
        const catObj = this.categories.find(c => c.id === p.category);
        const catName = catObj ? catObj.name : p.category;
        const uploadDate = new Date(p.date || Date.now()).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric'
        });

        return `
          <div class="photo-manager-card" data-id="${p.id}">
            <div class="photo-manager-thumb-wrap">
              <img src="${p.imageData || p.url}" alt="${p.title}" class="photo-manager-thumb" />
              <span class="photo-manager-cat-badge">${catName}</span>
            </div>
            <div class="photo-manager-content">
              <h4 class="photo-manager-title" title="${p.title}">${p.title}</h4>
              <span class="photo-manager-meta">Added: ${uploadDate}</span>
              <div class="photo-manager-actions">
                <button type="button" class="btn-photo-action btn-edit-photo" data-id="${p.id}" title="Edit Caption">
                  <i data-lucide="edit-2" style="width: 12px; height: 12px;"></i> Edit
                </button>
                <button type="button" class="btn-photo-action btn-photo-delete" data-id="${p.id}" title="Remove Photo">
                  <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Delete
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      if (window.lucide) window.lucide.createIcons();

      // Bind Edit Caption
      grid.querySelectorAll('.btn-edit-photo').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const photo = photos.find(p => p.id === id);
          if (!photo) return;

          const newTitle = prompt('Edit Photo Title / Caption:', photo.title);
          if (newTitle && newTitle.trim()) {
            photo.title = newTitle.trim();
            await photoDB.savePhoto(photo);
            toast.success('Photo title updated.');
            this.renderPhotoLibrary();
          }
        });
      });

      // Bind Delete Photo
      grid.querySelectorAll('.btn-photo-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (confirm('Are you sure you want to remove this photograph from the studio library?')) {
            await photoDB.deletePhoto(id);
            toast.info('Photo removed from studio library.');
            this.renderPhotoLibrary();
            this.renderDashboardData();
          }
        });
      });
    } catch (e) {
      console.warn('Failed to load photos from DB', e);
    }
  }

  renderReviewsManager() {
    const table = document.getElementById('admin-reviews-table-body');
    if (!table) return;

    const reviews = JSON.parse(localStorage.getItem('yazh_client_reviews') || '[]');
    if (reviews.length === 0) {
      table.innerHTML = `<tr><td colspan="5" class="text-center py-4" style="text-align:center; padding:2rem; color:var(--text-muted);">No client reviews submitted yet.</td></tr>`;
      return;
    }

    table.innerHTML = reviews.map(r => `
      <tr>
        <td><strong>${r.name}</strong><br><small style="color:var(--text-dim)">${r.location || 'Tamil Nadu'}</small></td>
        <td><span style="color:#fbbf24; font-weight:700;">${'★'.repeat(r.rating)}</span> (${r.rating}/5)</td>
        <td><strong>${r.eventType}</strong></td>
        <td><em>"${r.title}"</em><br><small style="color:var(--text-muted);">${r.comment}</small></td>
        <td>
          <button type="button" class="btn btn-outline btn-sm btn-delete-review" data-id="${r.id}" style="color:var(--color-error); border-color:rgba(239,68,68,0.3); padding:0.25rem 0.55rem; font-size:0.75rem;">
            Delete
          </button>
        </td>
      </tr>
    `).join('');

    table.querySelectorAll('.btn-delete-review').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (confirm('Remove this review from public display?')) {
          const updated = reviews.filter(r => r.id !== id);
          localStorage.setItem('yazh_client_reviews', JSON.stringify(updated));
          toast.info('Review removed.');
          this.renderReviewsManager();
          document.dispatchEvent(new CustomEvent('reviewsUpdated', { detail: updated }));
        }
      });
    });
  }

  async renderDashboardData() {
    const bookings = JSON.parse(localStorage.getItem('yazh_bookings') || '[]');
    const totalRevINR = bookings.reduce((sum, b) => sum + (b.totalINR || 0), 0);
    const advanceRevINR = bookings.reduce((sum, b) => sum + (b.advanceINR || 5000), 0);
    const remainingRevINR = bookings.reduce((sum, b) => sum + (b.remainingINR || (b.totalINR - 5000)), 0);

    const revEl = document.getElementById('admin-total-revenue');
    const bookingsCountEl = document.getElementById('admin-bookings-count');
    const advanceRevEl = document.getElementById('admin-advance-revenue');
    const remainingRevEl = document.getElementById('admin-remaining-revenue');

    if (revEl) revEl.textContent = currency.format(totalRevINR || 135000);
    if (bookingsCountEl) bookingsCountEl.textContent = bookings.length || 1;
    if (advanceRevEl) advanceRevEl.textContent = currency.format(advanceRevINR || 10000);
    if (remainingRevEl) remainingRevEl.textContent = currency.format(remainingRevINR || 125000);

    const bookingsTable = document.getElementById('admin-bookings-table-body');
    if (bookingsTable) {
      if (bookings.length === 0) {
        bookingsTable.innerHTML = `<tr><td colspan="6" class="text-center py-4" style="text-align:center; padding:2rem; color:var(--text-muted);">No booking inquiries yet.</td></tr>`;
      } else {
        bookingsTable.innerHTML = bookings.map(b => {
          const cleanPhone = (b.clientPhone || '').replace(/\D/g, '');
          const waLink = `https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(b.clientName)},%20thank%20you%20for%20contacting%20Yazh%20Photography!`;

          return `
            <tr>
              <td><strong>${b.id}</strong></td>
              <td>
                <div class="inquiry-client-col">
                  <span class="inquiry-client-name">${b.clientName}</span>
                  <span class="inquiry-client-contacts">📞 ${b.clientPhone} · ✉️ ${b.clientEmail}</span>
                </div>
              </td>
              <td><span class="inquiry-package-badge">${b.packageName}</span></td>
              <td><strong>${b.eventDate}</strong><br><small style="color:var(--text-dim)">${b.location}</small></td>
              <td>
                <div class="inquiry-payment-box">
                  <span class="inquiry-total-val">${currency.format(b.totalINR)}</span>
                  <span class="inquiry-advance-val">Advance: ${currency.format(b.advanceINR || 5000)}</span>
                  <span class="inquiry-remaining-val">Due: ${currency.format(b.remainingINR || (b.totalINR - 5000))}</span>
                </div>
              </td>
              <td>
                <div class="inquiry-actions-col">
                  <a href="${waLink}" target="_blank" rel="noopener" class="btn-inquiry-whatsapp" title="Chat on WhatsApp">
                    <span>💬 WhatsApp</span>
                  </a>
                  <button type="button" class="btn-photo-action btn-photo-delete btn-delete-inquiry" data-id="${b.id}" title="Delete Lead" style="padding:0.35rem 0.6rem;">
                    <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();

        bookingsTable.querySelectorAll('.btn-delete-inquiry').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            if (confirm('Delete this inquiry record?')) {
              const updated = bookings.filter(b => b.id !== id);
              localStorage.setItem('yazh_bookings', JSON.stringify(updated));
              toast.info('Inquiry record deleted.');
              this.renderDashboardData();
            }
          });
        });
      }
    }
  }
}
