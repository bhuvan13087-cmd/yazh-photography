// Yazh Photography — Executive Studio Dashboard Suite
// Desktop-First Business Management System
// Clean Production UI & Client-Event-Only Notification Controller

import { currency } from './currency.js';
import { dataStore } from '../utils/dataStore.js';
import { cloudStorage } from '../utils/cloudStorage.js';
import { toast } from '../utils/toast.js';
import { sound } from '../utils/sound.js';
import { PORTFOLIO_ITEMS, PORTFOLIO_CATEGORIES } from '../data/portfolio.js';

export class AdminDashboard {
  constructor() {
    this.isAuthenticated = sessionStorage.getItem('yazh_admin_authenticated') === 'true';
    this.currentTab = 'overview';
    this.selectedFile = null;
    this.selectedFileDataUrl = null;
    this.isUploading = false;
    this.isDeleting = false;
    this.isSavingEdit = false;
    this.replacingItemId = null;
    this.pendingDeleteId = null;
    
    // Filters & search states
    this.photoSearchQuery = '';
    this.photoCategoryFilter = 'all';
    this.photoStatusFilter = 'all';
    this.bookingSearchQuery = '';
    this.bookingStatusFilter = 'all';
    
    this.init();
  }

  async init() {
    this.bindEvents();
    this.setupAuth();
    this.setupModals();
    this.setupClock();
    this.setupPhotoUploader();
    this.setupCategoryManager();

    // Event listeners for data updates (UI updates silently without routine toasts)
    document.addEventListener('bookingsUpdated', () => this.refreshActiveViews());
    document.addEventListener('photosUpdated', () => this.refreshActiveViews());
    document.addEventListener('packagesUpdated', () => this.refreshActiveViews());
    document.addEventListener('servicesUpdated', () => this.refreshActiveViews());
    document.addEventListener('reviewsUpdated', () => this.refreshActiveViews());
    document.addEventListener('categoriesUpdated', () => {
      this.refreshCategories();
      this.renderPhotoLibrary();
    });
    document.addEventListener('currencyChange', () => this.refreshActiveViews());

    // Genuine Incoming Client Event Notifications ONLY
    document.addEventListener('newBookingInquiry', (e) => {
      const b = e.detail;
      if (b) {
        sound.playSuccessChime();
        toast.show({
          title: 'New Booking Inquiry',
          message: `${b.clientName} submitted an inquiry for ${b.packageName} (${b.eventDate || 'Date TBD'}).`,
          type: 'info',
          icon: 'info'
        });
      }
    });

    document.addEventListener('newClientReview', (e) => {
      const r = e.detail;
      if (r) {
        sound.playSuccessChime();
        toast.show({
          title: 'New Client Review',
          message: `${r.name} submitted a ${r.rating}★ review for ${r.eventType || 'Wedding'}.`,
          type: 'info',
          icon: 'info'
        });
      }
    });
  }

  setupClock() {
    const clockEl = document.getElementById('admin-clock-badge');
    const updateTime = () => {
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // ==========================================
  // AUTHENTICATION & SESSION
  // ==========================================
  setupAuth() {
    const authForm = document.getElementById('admin-auth-form');
    const emailInput = document.getElementById('admin-auth-email');
    const pwdInput = document.getElementById('admin-auth-passcode');
    const togglePwdBtn = document.getElementById('admin-toggle-pwd-visibility');
    const logoutBtn = document.getElementById('admin-logout-btn');

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

    // Handle Login Submit
    authForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const enteredEmail = emailInput?.value.trim().toLowerCase();
      const enteredPassword = pwdInput?.value.trim();

      const expectedEmail = dataStore.getAdminEmail().toLowerCase();
      const emailMatches = enteredEmail === expectedEmail || enteredEmail.includes('yazhphotography');
      const passwordValid = await dataStore.verifyAdminPassword(enteredPassword);

      if (emailMatches && passwordValid) {
        this.isAuthenticated = true;
        sessionStorage.setItem('yazh_admin_authenticated', 'true');
        sound.playSuccessChime();
        if (pwdInput) pwdInput.value = '';
        this.renderAuthView();
        await this.loadAllViews();
      } else {
        sound.playShutter();
        const container = document.querySelector('.admin-auth-container');
        container?.classList.add('admin-auth-shake');
        setTimeout(() => container?.classList.remove('admin-auth-shake'), 500);

        if (!emailMatches) {
          toast.show({ title: 'Access Denied', message: `Unrecognized studio email: "${enteredEmail}".`, type: 'error', icon: 'error' });
        } else {
          toast.show({ title: 'Incorrect Password', message: 'Master security key incorrect.', type: 'error', icon: 'error' });
        }
      }
    });

    // Handle Logout
    logoutBtn?.addEventListener('click', () => {
      this.isAuthenticated = false;
      sessionStorage.removeItem('yazh_admin_authenticated');
      this.renderAuthView();
    });
  }

  renderAuthView() {
    const authView = document.getElementById('admin-auth-view');
    const dashView = document.getElementById('admin-dashboard-view');
    const emailBadge = document.getElementById('admin-sidebar-email');

    if (this.isAuthenticated) {
      if (authView) authView.style.display = 'none';
      if (dashView) {
        dashView.style.display = 'flex';
        dashView.classList.remove('hidden');
      }
      if (emailBadge) emailBadge.textContent = dataStore.getAdminEmail();
      this.switchTab(this.currentTab || 'overview');
    } else {
      if (authView) authView.style.display = 'flex';
      if (dashView) {
        dashView.style.display = 'none';
        dashView.classList.add('hidden');
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // NAVIGATION & TAB SWITCHING
  // ==========================================
  bindEvents() {
    // Open Admin Modal Triggers
    document.querySelectorAll('.btn-open-admin').forEach(btn => {
      btn.addEventListener('click', () => this.open());
    });

    // Close Modal Triggers
    const modal = document.getElementById('admin-dashboard-modal');
    modal?.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el) this.close();
      });
    });

    // Sidebar Navigation Buttons
    const navBtns = document.querySelectorAll('.admin-nav-item');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Top Header Quick Upload Button
    document.getElementById('btn-admin-top-upload')?.addEventListener('click', () => {
      this.switchTab('media');
      document.getElementById('admin-photo-title')?.focus();
    });

    // Quick Action Cards on Overview
    document.getElementById('btn-quick-upload-card')?.addEventListener('click', () => {
      this.switchTab('media');
      document.getElementById('admin-photo-title')?.focus();
    });

    document.getElementById('btn-quick-inquiries-card')?.addEventListener('click', () => {
      this.switchTab('bookings');
    });

    document.getElementById('btn-quick-packages-card')?.addEventListener('click', () => {
      this.switchTab('packages');
    });

    document.getElementById('btn-quick-password-card')?.addEventListener('click', () => {
      this.openSubModal('admin-password-modal');
    });

    document.getElementById('btn-overview-view-all-inquiries')?.addEventListener('click', () => {
      this.switchTab('bookings');
    });

    // Search and filters for Photo Library
    const searchInput = document.getElementById('admin-photo-search-input');
    const clearSearchBtn = document.getElementById('btn-clear-photo-search');

    searchInput?.addEventListener('input', (e) => {
      this.photoSearchQuery = e.target.value.toLowerCase().trim();
      if (clearSearchBtn) {
        clearSearchBtn.style.display = this.photoSearchQuery ? 'block' : 'none';
      }
      this.renderPhotoLibrary();
    });

    clearSearchBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      this.photoSearchQuery = '';
      clearSearchBtn.style.display = 'none';
      this.renderPhotoLibrary();
      searchInput?.focus();
    });

    document.getElementById('admin-photo-category-filter')?.addEventListener('change', (e) => {
      this.photoCategoryFilter = e.target.value;
      this.renderPhotoLibrary();
    });

    document.getElementById('admin-photo-status-filter')?.addEventListener('change', (e) => {
      this.photoStatusFilter = e.target.value;
      this.renderPhotoLibrary();
    });

    // Search and filters for Bookings
    document.getElementById('admin-booking-search-input')?.addEventListener('input', (e) => {
      this.bookingSearchQuery = e.target.value.toLowerCase().trim();
      this.renderBookings();
    });

    document.getElementById('admin-booking-status-filter')?.addEventListener('change', (e) => {
      this.bookingStatusFilter = e.target.value;
      this.renderBookings();
    });
  }

  open() {
    const modal = document.getElementById('admin-dashboard-modal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.renderAuthView();
    if (this.isAuthenticated) {
      this.loadAllViews();
    }
  }

  close() {
    const modal = document.getElementById('admin-dashboard-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Update sidebar navigation active states
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update section views
    document.querySelectorAll('.admin-section-view').forEach(panel => {
      panel.classList.remove('active');
      panel.style.display = 'none';
    });

    const activeSection = document.getElementById(`admin-view-${tabName}`);
    if (activeSection) {
      activeSection.classList.add('active');
      activeSection.style.display = 'block';
    }

    // Update Header Breadcrumb
    const breadcrumbActive = document.getElementById('admin-breadcrumb-active');
    if (breadcrumbActive) {
      const titles = {
        overview: 'Overview Dashboard',
        media: 'Photo Library & Cloud Asset Manager',
        bookings: 'Booking Inquiries & Leads',
        packages: 'Package & Service Pricing',
        reviews: 'Client Reviews Moderation'
      };
      breadcrumbActive.textContent = titles[tabName] || 'Overview';
    }

    // Load active section data
    if (this.isAuthenticated) {
      if (tabName === 'overview') this.renderOverview();
      else if (tabName === 'media') this.renderPhotoLibrary();
      else if (tabName === 'bookings') this.renderBookings();
      else if (tabName === 'packages') this.renderPackages();
      else if (tabName === 'reviews') this.renderReviews();
    }

    if (window.lucide) window.lucide.createIcons();
  }

  async loadAllViews() {
    await this.refreshCategories();
    await Promise.all([
      this.renderOverview(),
      this.renderPhotoLibrary(),
      this.renderBookings(),
      this.renderPackages(),
      this.renderReviews()
    ]);
    this.updateSidebarCounters();
  }

  async refreshActiveViews() {
    if (!this.isAuthenticated) return;
    if (this.currentTab === 'overview') this.renderOverview();
    else if (this.currentTab === 'media') this.renderPhotoLibrary();
    else if (this.currentTab === 'bookings') this.renderBookings();
    else if (this.currentTab === 'packages') this.renderPackages();
    else if (this.currentTab === 'reviews') this.renderReviews();
    this.updateSidebarCounters();
  }

  async updateSidebarCounters() {
    const photos = await dataStore.getPhotos();
    const bookings = await dataStore.getBookings();
    const packages = await dataStore.getPackages();
    const reviews = await dataStore.getReviews();

    const photoBadge = document.getElementById('admin-nav-photo-count');
    const bookingBadge = document.getElementById('admin-nav-booking-count');
    const pkgBadge = document.getElementById('admin-nav-pkg-count');
    const reviewBadge = document.getElementById('admin-nav-review-count');

    if (photoBadge) photoBadge.textContent = photos.length;
    if (bookingBadge) bookingBadge.textContent = bookings.length;
    if (pkgBadge) pkgBadge.textContent = packages.length;
    if (reviewBadge) reviewBadge.textContent = reviews.length;
  }

  // ==========================================
  // SECTION 1: OVERVIEW DASHBOARD
  // ==========================================
  async renderOverview() {
    const bookings = await dataStore.getBookings();

    // 4 Real dynamic KPI metric calculations
    const pipelineValue = bookings.reduce((sum, b) => sum + (Number(b.totalINR) || 0), 0);
    const advanceCollected = bookings.reduce((sum, b) => sum + (Number(b.advanceINR) || 0), 0);
    const balanceDue = bookings.reduce((sum, b) => sum + (Number(b.remainingINR) || 0), 0);

    const pipelineEl = document.getElementById('admin-kpi-pipeline');
    const bookingsEl = document.getElementById('admin-kpi-bookings');
    const advanceEl = document.getElementById('admin-kpi-advance');
    const dueEl = document.getElementById('admin-kpi-due');

    if (pipelineEl) pipelineEl.textContent = currency.format(pipelineValue);
    if (bookingsEl) bookingsEl.textContent = bookings.length;
    if (advanceEl) advanceEl.textContent = currency.format(advanceCollected);
    if (dueEl) dueEl.textContent = currency.format(balanceDue);

    // Recent Inquiries Table on Overview (Top 5)
    const recentTbody = document.getElementById('overview-recent-inquiries-tbody');
    if (recentTbody) {
      if (bookings.length === 0) {
        recentTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 2.5rem; color: #6b7280;">
              No booking inquiries on record yet.
            </td>
          </tr>
        `;
      } else {
        recentTbody.innerHTML = bookings.slice(0, 5).map(b => {
          const statusClass = this.getStatusBadgeClass(b.status);
          return `
            <tr>
              <td><strong style="color: #c5a059;">${b.id}</strong></td>
              <td><strong>${b.clientName}</strong><br><small style="color:#9ca3af;">${b.clientPhone}</small></td>
              <td><span style="font-weight:600; color:#ffffff;">${b.packageName}</span></td>
              <td><strong>${b.eventDate || 'Date TBD'}</strong><br><small style="color:#6b7280;">${b.location || 'Tamil Nadu'}</small></td>
              <td><strong>${currency.format(b.totalINR)}</strong><br><small style="color:#10b981;">Adv: ${currency.format(b.advanceINR)}</small></td>
              <td><span class="admin-badge ${statusClass}">${b.status || 'New'}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    this.updateSidebarCounters();
    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // SECTION 2: PHOTO LIBRARY & CLOUD UPLOAD
  // ==========================================
  setupPhotoUploader() {
    const dropzone = document.getElementById('admin-photo-dropzone');
    const fileInput = document.getElementById('admin-photo-file-input');
    const replaceInput = document.getElementById('admin-photo-replace-input');
    const uploadForm = document.getElementById('admin-photo-upload-form');
    const removeFileBtn = document.getElementById('btn-remove-selected-file');
    const clearFormBtn = document.getElementById('btn-admin-clear-upload');

    dropzone?.addEventListener('click', (e) => {
      if (e.target.closest('#btn-remove-selected-file')) return;
      if (e.target !== fileInput && !this.isUploading) {
        fileInput?.click();
      }
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handleFileSelection(file);
    });

    replaceInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && this.replacingItemId) {
        this.handleReplaceFileSelection(file);
      }
    });

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.isUploading) dropzone.classList.add('dragover');
    });

    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (this.isUploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) this.handleFileSelection(file);
    });

    removeFileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearSelectedFile();
    });

    clearFormBtn?.addEventListener('click', () => {
      this.clearSelectedFile();
      uploadForm?.reset();
    });

    uploadForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handlePhotoUpload();
    });
  }

  handleFileSelection(file) {
    const validation = cloudStorage.validateImageFile(file);
    if (!validation.valid) {
      toast.show({ title: 'Invalid Image', message: validation.error, type: 'warning', icon: 'warning' });
      this.clearSelectedFile();
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.selectedFileDataUrl = e.target.result;
      const idleState = document.getElementById('dropzone-idle-state');
      const selectedState = document.getElementById('dropzone-selected-state');
      const previewImg = document.getElementById('admin-photo-preview-img');
      const fileNameEl = document.getElementById('admin-photo-file-name');
      const fileSizeEl = document.getElementById('admin-photo-file-size');

      if (idleState) idleState.style.display = 'none';
      if (selectedState) selectedState.style.display = 'flex';
      if (previewImg) previewImg.src = this.selectedFileDataUrl;
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileSizeEl) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        fileSizeEl.textContent = `${sizeMb} MB`;
      }

      const titleInput = document.getElementById('admin-photo-title');
      if (titleInput && !titleInput.value) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
        titleInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
    };
    reader.readAsDataURL(file);
  }

  clearSelectedFile() {
    this.selectedFile = null;
    this.selectedFileDataUrl = null;
    const fileInput = document.getElementById('admin-photo-file-input');
    if (fileInput) fileInput.value = '';

    const idleState = document.getElementById('dropzone-idle-state');
    const selectedState = document.getElementById('dropzone-selected-state');
    const previewImg = document.getElementById('admin-photo-preview-img');

    if (idleState) idleState.style.display = 'flex';
    if (selectedState) selectedState.style.display = 'none';
    if (previewImg) previewImg.src = '';
  }

  async handlePhotoUpload() {
    if (!this.selectedFile) {
      toast.show({ title: 'No Image Selected', message: 'Please select an image file to upload.', type: 'warning', icon: 'warning' });
      return;
    }

    if (this.isUploading) return;
    this.isUploading = true;

    const progressBox = document.getElementById('admin-upload-progress-container');
    const progressBar = document.getElementById('admin-upload-progress-bar');
    const progressText = document.getElementById('admin-upload-status-text');
    const progressPercent = document.getElementById('admin-upload-status-percent');
    const submitBtn = document.getElementById('btn-admin-submit-upload');

    if (progressBox) progressBox.style.display = 'flex';
    if (progressBar) progressBar.style.width = '10%';
    if (progressText) progressText.textContent = 'Connecting to Cloud CDN...';
    if (progressPercent) progressPercent.textContent = '10%';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-spinner"></span> Uploading to Cloud CDN...';
    }

    const title = document.getElementById('admin-photo-title')?.value.trim() || 'Untitled Photograph';
    const categorySelect = document.getElementById('admin-photo-category')?.value || 'traditional';
    const desc = document.getElementById('admin-photo-desc')?.value.trim() || 'Master wedding photograph by Yazh Photography.';
    const publishRadio = document.querySelector('input[name="admin-upload-publish-status"]:checked');
    const isPublished = publishRadio ? publishRadio.value === 'published' : true;

    try {
      // 1. Upload binary to Cloud CDN
      const uploadResult = await cloudStorage.uploadImageFile(this.selectedFile, (pct, status) => {
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressText) progressText.textContent = status;
        if (progressPercent) progressPercent.textContent = `${pct}%`;
      });

      // 2. Save metadata to persistent cloud dataStore
      const categories = await dataStore.getCategories();
      const catObj = categories.find(c => c.id === categorySelect);

      await dataStore.addPhoto({
        id: `photo-${Date.now()}`,
        title,
        category: categorySelect,
        categoryName: catObj ? catObj.name : categorySelect,
        description: desc,
        image: uploadResult.url,
        thumbnail: uploadResult.thumbnail,
        url: uploadResult.url,
        published: isPublished
      });

      sound.playSuccessChime();

      // Reset form and selected file state
      document.getElementById('admin-photo-upload-form')?.reset();
      this.clearSelectedFile();

      // Immediate UI synchronization without browser refresh (no routine toast)
      await this.renderPhotoLibrary();
      await this.renderOverview();
    } catch (err) {
      console.error('Upload Error:', err);
      toast.show({ title: 'Upload Failed', message: 'Upload failed. Please try again.', type: 'error', icon: 'error' });
    } finally {
      this.isUploading = false;
      if (progressBox) progressBox.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="cloud-upload" style="width: 16px; height: 16px;"></i> Publish to Public Portfolio';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async handleReplaceFileSelection(file) {
    const itemId = this.replacingItemId;
    if (!itemId) return;

    const validation = cloudStorage.validateImageFile(file);
    if (!validation.valid) {
      toast.show({ title: 'Invalid File', message: validation.error, type: 'warning', icon: 'warning' });
      return;
    }

    try {
      const uploadResult = await cloudStorage.uploadImageFile(file);
      await dataStore.replacePhoto(itemId, uploadResult);
      sound.playSuccessChime();
      await this.renderPhotoLibrary();
    } catch (err) {
      console.error(err);
      toast.show({ title: 'Replace Failed', message: 'Unable to replace image. Please try again.', type: 'error', icon: 'error' });
    } finally {
      this.replacingItemId = null;
      const replaceInput = document.getElementById('admin-photo-replace-input');
      if (replaceInput) replaceInput.value = '';
    }
  }

  async renderPhotoLibrary() {
    const grid = document.getElementById('admin-photo-grid-container');
    if (!grid) return;

    const allPhotos = await dataStore.getPhotos();
    const categories = await dataStore.getCategories();

    const countBadge = document.getElementById('admin-library-count-badge');
    if (countBadge) countBadge.textContent = `${allPhotos.length} Photos Stored`;

    let filtered = allPhotos;
    if (this.photoCategoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === this.photoCategoryFilter);
    }
    if (this.photoStatusFilter === 'published') {
      filtered = filtered.filter(p => p.published !== false);
    } else if (this.photoStatusFilter === 'draft') {
      filtered = filtered.filter(p => p.published === false);
    }
    if (this.photoSearchQuery) {
      filtered = filtered.filter(p => 
        (p.title || '').toLowerCase().includes(this.photoSearchQuery) ||
        (p.categoryName || '').toLowerCase().includes(this.photoSearchQuery) ||
        (p.description || '').toLowerCase().includes(this.photoSearchQuery)
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="admin-empty-state" style="grid-column: 1 / -1;">
          <div class="admin-empty-icon">🖼️</div>
          <h4 class="admin-empty-title">No photos yet</h4>
          <p class="admin-empty-desc">
            ${this.photoSearchQuery || this.photoCategoryFilter !== 'all' || this.photoStatusFilter !== 'all' 
              ? 'No photographs match your active filter or search query.' 
              : 'Upload your first photograph to showcase in your portfolio.'}
          </p>
          <button type="button" class="btn btn-primary btn-sm" id="btn-empty-upload-cta">
            <i data-lucide="cloud-upload" style="width: 14px; height: 14px;"></i> Upload Photograph
          </button>
        </div>
      `;

      grid.querySelector('#btn-empty-upload-cta')?.addEventListener('click', () => {
        const uploadCard = document.getElementById('admin-upload-main-card');
        uploadCard?.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('admin-photo-title')?.focus();
      });

      if (window.lucide) window.lucide.createIcons();
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const catObj = categories.find(c => c.id === p.category);
      const catName = catObj ? catObj.name : (p.categoryName || p.category || 'Wedding');
      const isPub = p.published !== false;
      const statusBadge = isPub 
        ? `<span class="admin-photo-pill-status badge-published btn-toggle-publish" data-id="${p.id}" title="Click to move to Draft">✓ Published</span>`
        : `<span class="admin-photo-pill-status badge-draft btn-toggle-publish" data-id="${p.id}" title="Click to Publish">Draft</span>`;

      const displayImg = p.image || p.thumbnail || p.url || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80';

      return `
        <div class="admin-photo-card" data-id="${p.id}">
          <div class="admin-photo-thumb-box">
            <img src="${displayImg}" alt="${p.title}" class="admin-photo-thumb" loading="lazy" />
            <span class="admin-photo-pill-category">${catName}</span>
            ${statusBadge}
          </div>
          <div class="admin-photo-meta-box">
            <h4 class="admin-photo-card-title" title="${p.title}">${p.title}</h4>
            <p class="admin-photo-card-desc">${p.description || 'Master wedding photograph by Yazh Photography.'}</p>
            <div class="admin-photo-card-actions">
              <button type="button" class="btn-tbl-action btn-replace-photo-card" data-id="${p.id}" title="Replace Image File">
                <i data-lucide="refresh-cw" style="width: 12px; height: 12px;"></i> Replace
              </button>
              <button type="button" class="btn-tbl-action btn-edit-photo-card" data-id="${p.id}" title="Edit Metadata">
                <i data-lucide="edit-2" style="width: 12px; height: 12px;"></i> Edit
              </button>
              <button type="button" class="btn-tbl-action btn-tbl-delete btn-delete-photo-card" data-id="${p.id}" data-title="${encodeURIComponent(p.title)}" title="Delete Photo">
                <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Delete
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    // Bind Replace Action
    grid.querySelectorAll('.btn-replace-photo-card').forEach(btn => {
      btn.addEventListener('click', () => {
        this.replacingItemId = btn.dataset.id;
        document.getElementById('admin-photo-replace-input')?.click();
      });
    });

    // Bind Toggle Publish Action
    grid.querySelectorAll('.btn-toggle-publish').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const currentItem = allPhotos.find(p => p.id === id);
        if (!currentItem) return;

        const newPublishedState = !(currentItem.published !== false);

        btn.textContent = 'Updating...';
        btn.style.opacity = '0.7';

        try {
          await dataStore.updatePhoto(id, { published: newPublishedState });
          await this.renderPhotoLibrary();
        } catch (err) {
          console.error(err);
          toast.show({ title: 'Update Failed', message: 'Unable to update publish status.', type: 'error', icon: 'error' });
          await this.renderPhotoLibrary();
        }
      });
    });

    // Bind Edit Details Action
    grid.querySelectorAll('.btn-edit-photo-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = allPhotos.find(p => p.id === id);
        if (item) this.openEditPhotoModal(item);
      });
    });

    // Bind Delete Action (Opens custom Delete Confirmation Modal)
    grid.querySelectorAll('.btn-delete-photo-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const title = decodeURIComponent(btn.dataset.title || 'this photograph');
        this.openDeleteConfirmModal(id, title);
      });
    });
  }

  // ==========================================
  // CUSTOM DELETE CONFIRMATION MODAL (CRITICAL FIX)
  // ==========================================
  openDeleteConfirmModal(id, title) {
    this.pendingDeleteId = id;
    const modal = document.getElementById('admin-delete-confirm-modal');
    const titleEl = document.getElementById('admin-delete-photo-title');
    const idInput = document.getElementById('admin-delete-photo-id');
    const confirmBtn = document.getElementById('btn-confirm-delete-photo');

    if (titleEl) titleEl.textContent = `"${title}"`;
    if (idInput) idInput.value = id;
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete Photograph';
      if (window.lucide) window.lucide.createIcons();
    }

    this.openSubModal('admin-delete-confirm-modal');
  }

  async executePhotoDeletion() {
    const id = this.pendingDeleteId || document.getElementById('admin-delete-photo-id')?.value;
    if (!id) return;

    if (this.isDeleting) return;
    this.isDeleting = true;

    const confirmBtn = document.getElementById('btn-confirm-delete-photo');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="btn-spinner"></span> Deleting...';
    }

    try {
      // Send delete request to persistent dataStore & Cloud Manifest
      await dataStore.deletePhoto(id);

      sound.playSuccessChime();

      // Close modal
      this.closeSubModal('admin-delete-confirm-modal');
      this.pendingDeleteId = null;

      // Immediate UI update without requiring browser refresh (no routine toast)
      await this.renderPhotoLibrary();
      await this.renderOverview();
      this.updateSidebarCounters();
    } catch (err) {
      console.error('Delete error:', err);
      // Photo remains visible, show clear error message, allow retry
      toast.show({ title: 'Delete Failed', message: 'Unable to delete photo. Please try again.', type: 'error', icon: 'error' });
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Retry Deletion';
        if (window.lucide) window.lucide.createIcons();
      }
    } finally {
      this.isDeleting = false;
    }
  }

  // ==========================================
  // EDIT PHOTO METADATA MODAL
  // ==========================================
  async openEditPhotoModal(photo) {
    const modal = document.getElementById('admin-edit-photo-modal');
    const idInput = document.getElementById('admin-edit-photo-id');
    const idDisplay = document.getElementById('admin-edit-photo-id-display');
    const previewThumb = document.getElementById('admin-edit-photo-preview-thumb');
    const titleInput = document.getElementById('admin-edit-photo-title');
    const catSelect = document.getElementById('admin-edit-photo-cat-select');
    const descInput = document.getElementById('admin-edit-photo-desc');
    const statusPubRadio = document.getElementById('admin-edit-status-pub');
    const statusDraftRadio = document.getElementById('admin-edit-status-draft');
    const saveBtn = document.getElementById('btn-save-edit-photo');

    const categories = await dataStore.getCategories();
    if (catSelect) {
      catSelect.innerHTML = categories.map(c => `
        <option value="${c.id}" ${c.id === photo.category ? 'selected' : ''}>${c.name}</option>
      `).join('');
    }

    if (idInput) idInput.value = photo.id;
    if (idDisplay) idDisplay.textContent = photo.id;
    if (previewThumb) previewThumb.src = photo.image || photo.thumbnail || photo.url;
    if (titleInput) titleInput.value = photo.title;
    if (descInput) descInput.value = photo.description || '';

    const isPub = photo.published !== false;
    if (statusPubRadio) statusPubRadio.checked = isPub;
    if (statusDraftRadio) statusDraftRadio.checked = !isPub;

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Changes';
    }

    this.openSubModal('admin-edit-photo-modal');
  }

  async handleSavePhotoEdit() {
    const id = document.getElementById('admin-edit-photo-id')?.value;
    const title = document.getElementById('admin-edit-photo-title')?.value.trim();
    const category = document.getElementById('admin-edit-photo-cat-select')?.value;
    const desc = document.getElementById('admin-edit-photo-desc')?.value.trim();
    const publishRadio = document.querySelector('input[name="admin-edit-publish-status"]:checked');
    const published = publishRadio ? publishRadio.value === 'published' : true;

    if (!id || !title) {
      toast.show({ title: 'Required Fields', message: 'Photo title is required.', type: 'warning', icon: 'warning' });
      return;
    }

    if (this.isSavingEdit) return;
    this.isSavingEdit = true;

    const saveBtn = document.getElementById('btn-save-edit-photo');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="btn-spinner"></span> Saving...';
    }

    try {
      const categories = await dataStore.getCategories();
      const catObj = categories.find(c => c.id === category);

      await dataStore.updatePhoto(id, {
        title,
        category,
        categoryName: catObj ? catObj.name : category,
        description: desc,
        published
      });

      sound.playSuccessChime();
      this.closeSubModal('admin-edit-photo-modal');
      await this.renderPhotoLibrary();
    } catch (err) {
      console.error('Update photo error:', err);
      toast.show({ title: 'Save Failed', message: 'Unable to save changes. Please try again.', type: 'error', icon: 'error' });
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Changes';
      }
    } finally {
      this.isSavingEdit = false;
    }
  }

  // ==========================================
  // SECTION 3: BOOKING INQUIRIES
  // ==========================================
  async renderBookings() {
    const tbody = document.getElementById('admin-bookings-tbody');
    if (!tbody) return;

    const bookings = await dataStore.getBookings();
    const countBadge = document.getElementById('admin-inquiries-count-badge');
    if (countBadge) countBadge.textContent = `${bookings.length} Inquiries`;

    let filtered = bookings;
    if (this.bookingStatusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === this.bookingStatusFilter);
    }
    if (this.bookingSearchQuery) {
      filtered = filtered.filter(b => 
        (b.clientName || '').toLowerCase().includes(this.bookingSearchQuery) ||
        (b.clientPhone || '').includes(this.bookingSearchQuery) ||
        (b.id || '').toLowerCase().includes(this.bookingSearchQuery)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem 1.5rem;">
            <div class="admin-empty-state" style="background: transparent; border: none; padding: 1rem;">
              <div class="admin-empty-icon">📅</div>
              <h4 class="admin-empty-title">No booking inquiries yet.</h4>
              <p class="admin-empty-desc">When public visitors submit booking requests on your website, they will appear here in real-time.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(b => {
      const cleanPhone = (b.clientPhone || '').replace(/\D/g, '');
      const waLink = `https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(b.clientName)},%20thank%20you%20for%20contacting%20Yazh%20Photography!`;
      const statusClass = this.getStatusBadgeClass(b.status);

      return `
        <tr data-id="${b.id}">
          <td><strong style="color: #c5a059;">${b.id}</strong></td>
          <td>
            <strong>${b.clientName}</strong><br>
            <small style="color: #9ca3af;">📞 ${b.clientPhone}</small><br>
            <small style="color: #6b7280;">✉️ ${b.clientEmail || 'No email'}</small>
          </td>
          <td><span style="font-weight: 700; color: #ffffff;">${b.packageName}</span></td>
          <td>
            <strong>${b.eventDate || 'Date TBD'}</strong><br>
            <small style="color: #9ca3af;">📍 ${b.location || 'Venue TBD'}</small>
          </td>
          <td>
            <strong>${currency.format(b.totalINR)}</strong><br>
            <small style="color: #10b981;">Advance: ${currency.format(b.advanceINR)}</small><br>
            <small style="color: #c5a059;">Due: ${currency.format(b.remainingINR)}</small>
          </td>
          <td>
            <span class="admin-badge ${statusClass}">${b.status || 'New'}</span>
          </td>
          <td>
            <div class="admin-table-actions">
              <a href="${waLink}" target="_blank" rel="noopener" class="btn-tbl-action btn-tbl-whatsapp" title="WhatsApp Client">
                💬 Chat
              </a>
              <button type="button" class="btn-tbl-action btn-change-status" data-id="${b.id}" title="Update Status">
                <i data-lucide="refresh-cw" style="width: 12px; height: 12px;"></i> Status
              </button>
              <button type="button" class="btn-tbl-action btn-tbl-delete btn-delete-inquiry" data-id="${b.id}" title="Delete Inquiry">
                <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    // Bind Status Change
    tbody.querySelectorAll('.btn-change-status').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const b = bookings.find(item => item.id === id);
        if (b) this.openStatusModal(b);
      });
    });

    // Bind Delete Inquiry
    tbody.querySelectorAll('.btn-delete-inquiry').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm(`Permanently delete booking inquiry ${id}? This action cannot be undone.`)) {
          btn.disabled = true;
          try {
            await dataStore.deleteBooking(id);
            sound.playSuccessChime();
            await this.renderBookings();
            await this.renderOverview();
          } catch (err) {
            console.error('Delete inquiry error:', err);
            toast.show({ title: 'Delete Failed', message: 'Unable to delete booking inquiry. Please try again.', type: 'error', icon: 'error' });
          } finally {
            btn.disabled = false;
          }
        }
      });
    });
  }

  // ==========================================
  // SECTION 4: PACKAGE & PRICING
  // ==========================================
  async renderPackages() {
    const tbody = document.getElementById('admin-packages-tbody');
    if (!tbody) return;

    const packages = await dataStore.getPackages();
    const countBadge = document.getElementById('admin-packages-count-badge');
    if (countBadge) countBadge.textContent = `${packages.length} Packages`;

    if (packages.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: #6b7280;">
            No packages found. Click "+ Add New Package" to create one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = packages.map(pkg => {
      const isAct = pkg.status !== 'disabled';
      const statusClass = isAct ? 'badge-active' : 'badge-disabled';
      const statusLabel = isAct ? 'Active' : 'Disabled';
      const deliverablesList = (pkg.deliverables || []).join(' · ');

      return `
        <tr data-id="${pkg.id}">
          <td><strong style="color: #ffffff;">${pkg.name}</strong></td>
          <td><span style="color: #c5a059; font-weight: 600;">${pkg.category || 'Wedding'}</span></td>
          <td><strong style="color: #ffffff;">${currency.format(pkg.priceINR)}</strong></td>
          <td><span>${pkg.unit || 'Full Event'}</span><br><small style="color:#6b7280;">${pkg.duration || '1 Day'}</small></td>
          <td style="max-width: 250px; font-size: 0.78rem; color: #9ca3af;" title="${deliverablesList}">${deliverablesList || '—'}</td>
          <td>
            <span class="admin-badge ${statusClass} btn-toggle-pkg-status" data-id="${pkg.id}" style="cursor: pointer;" title="Toggle Active / Disabled">
              ${statusLabel}
            </span>
          </td>
          <td>
            <div class="admin-table-actions">
              <button type="button" class="btn-tbl-action btn-edit-package" data-id="${pkg.id}">
                <i data-lucide="edit-2" style="width: 12px; height: 12px;"></i> Edit
              </button>
              <button type="button" class="btn-tbl-action btn-tbl-delete btn-delete-package" data-id="${pkg.id}">
                <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    // Bind Edit Package
    tbody.querySelectorAll('.btn-edit-package').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const pkg = packages.find(p => p.id === id);
        if (pkg) this.openPackageModal(pkg);
      });
    });

    // Bind Toggle Status
    tbody.querySelectorAll('.btn-toggle-pkg-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const pkg = packages.find(p => p.id === id);
        if (pkg) {
          const newStatus = pkg.status === 'disabled' ? 'active' : 'disabled';
          await dataStore.updatePackage(id, { status: newStatus });
          await this.renderPackages();
        }
      });
    });

    // Bind Delete Package
    tbody.querySelectorAll('.btn-delete-package').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const pkg = packages.find(p => p.id === id);
        if (confirm(`Are you sure you want to permanently delete package "${pkg?.name}"? This action cannot be undone.`)) {
          btn.disabled = true;
          try {
            await dataStore.deletePackage(id);
            sound.playSuccessChime();
            await this.renderPackages();
          } catch (err) {
            console.error('Delete package error:', err);
            toast.show({ title: 'Delete Failed', message: 'Unable to delete package. Please try again.', type: 'error', icon: 'error' });
          } finally {
            btn.disabled = false;
          }
        }
      });
    });
  }

  // ==========================================
  // SECTION 5: CLIENT REVIEWS MODERATION
  // ==========================================
  async renderReviews() {
    const tbody = document.getElementById('admin-reviews-tbody');
    if (!tbody) return;

    const reviews = await dataStore.getReviews();
    const countBadge = document.getElementById('admin-reviews-count-badge');
    if (countBadge) countBadge.textContent = `${reviews.length} Reviews`;

    if (reviews.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: #6b7280;">
            No client reviews recorded yet. Click "+ Add Client Review" to create one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = reviews.map(rev => {
      const isPub = rev.status === 'published' || rev.status === undefined;
      const statusClass = isPub ? 'badge-published' : 'badge-draft';
      const statusLabel = isPub ? 'Published' : 'Draft';
      const stars = '★'.repeat(Math.min(5, Math.max(1, rev.rating || 5)));

      return `
        <tr data-id="${rev.id}">
          <td>
            <strong style="color: #ffffff;">${rev.name}</strong><br>
            <small style="color: #9ca3af;">📍 ${rev.location || 'Tamil Nadu'}</small>
          </td>
          <td><span style="color: #c5a059; letter-spacing: 2px;">${stars}</span></td>
          <td><span style="color: #60a5fa;">${rev.eventType || 'Wedding'}</span></td>
          <td style="max-width: 250px;">
            <strong style="font-size: 0.82rem; color: #ffffff;">${rev.title}</strong><br>
            <span style="font-size: 0.76rem; color: #9ca3af;">${rev.comment}</span>
          </td>
          <td>
            <span class="admin-badge ${statusClass} btn-toggle-review-status" data-id="${rev.id}" style="cursor: pointer;" title="Toggle Published / Draft">
              ${statusLabel}
            </span>
          </td>
          <td><small style="color: #6b7280;">${rev.date || 'Recent'}</small></td>
          <td>
            <div class="admin-table-actions">
              <button type="button" class="btn-tbl-action btn-edit-review" data-id="${rev.id}">
                <i data-lucide="edit-2" style="width: 12px; height: 12px;"></i> Edit
              </button>
              <button type="button" class="btn-tbl-action btn-tbl-delete btn-delete-review" data-id="${rev.id}">
                <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    // Bind Edit Review
    tbody.querySelectorAll('.btn-edit-review').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const rev = reviews.find(r => r.id === id);
        if (rev) this.openReviewModal(rev);
      });
    });

    // Bind Toggle Status
    tbody.querySelectorAll('.btn-toggle-review-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const rev = reviews.find(r => r.id === id);
        if (rev) {
          const newStatus = rev.status === 'published' ? 'draft' : 'published';
          await dataStore.updateReview(id, { status: newStatus });
          await this.renderReviews();
        }
      });
    });

    // Bind Delete Review
    tbody.querySelectorAll('.btn-delete-review').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const rev = reviews.find(r => r.id === id);
        if (confirm(`Permanently delete review from "${rev?.name}"? This action cannot be undone.`)) {
          btn.disabled = true;
          try {
            await dataStore.deleteReview(id);
            sound.playSuccessChime();
            await this.renderReviews();
          } catch (err) {
            console.error('Delete review error:', err);
            toast.show({ title: 'Delete Failed', message: 'Unable to delete review. Please try again.', type: 'error', icon: 'error' });
          } finally {
            btn.disabled = false;
          }
        }
      });
    });
  }

  // ==========================================
  // MODAL MANAGEMENT & DIALOG STACK
  // ==========================================
  openSubModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
  }

  closeSubModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
  }

  setupModals() {
    // Universal close buttons for sub-modals
    document.querySelectorAll('.close-sub-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.admin-sub-modal');
        if (modal) modal.classList.remove('active');
      });
    });

    // Universal backdrop click handling for sub-modals
    document.querySelectorAll('.admin-sub-modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    // Universal Escape key listener for all open dialogs
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeSubModals = document.querySelectorAll('.admin-sub-modal.active');
        if (activeSubModals.length > 0) {
          activeSubModals.forEach(m => m.classList.remove('active'));
        }
      }
    });

    // Category Modal Triggers
    document.getElementById('btn-open-add-category-modal')?.addEventListener('click', () => {
      this.openAddCategoryModal();
    });

    document.getElementById('btn-top-open-add-cat')?.addEventListener('click', () => {
      this.openAddCategoryModal();
    });

    document.getElementById('btn-cat-mgr-open-add')?.addEventListener('click', () => {
      this.closeSubModal('category-manager-modal');
      this.openAddCategoryModal();
    });

    document.getElementById('btn-toggle-category-manager')?.addEventListener('click', async () => {
      this.openSubModal('category-manager-modal');
      await this.renderCategoryManagerList();
    });

    document.getElementById('btn-toggle-category-manager-top')?.addEventListener('click', async () => {
      this.openSubModal('category-manager-modal');
      await this.renderCategoryManagerList();
    });

    document.getElementById('btn-edit-modal-manage-cat')?.addEventListener('click', async () => {
      this.openSubModal('category-manager-modal');
      await this.renderCategoryManagerList();
    });

    // Handle Standalone Add Category Modal Form Submit
    document.getElementById('admin-add-category-modal-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleStandaloneAddCategory();
    });

    // Trigger Add Package Modal
    document.getElementById('btn-admin-add-package')?.addEventListener('click', () => {
      this.openPackageModal(null);
    });

    // Trigger Add Review Modal
    document.getElementById('btn-admin-add-review')?.addEventListener('click', () => {
      this.openReviewModal(null);
    });

    // Handle Delete Confirmation Submit
    document.getElementById('btn-confirm-delete-photo')?.addEventListener('click', async () => {
      await this.executePhotoDeletion();
    });

    // Handle Edit Photo Form Submit
    document.getElementById('admin-edit-photo-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSavePhotoEdit();
    });

    // Handle Package Form Submit
    document.getElementById('admin-package-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('admin-pkg-id')?.value;
      const name = document.getElementById('admin-pkg-name')?.value.trim();
      const category = document.getElementById('admin-pkg-category')?.value;
      const priceINR = Number(document.getElementById('admin-pkg-price')?.value) || 10000;
      const unit = document.getElementById('admin-pkg-unit')?.value.trim() || 'Full Event';
      const duration = document.getElementById('admin-pkg-duration')?.value.trim() || '1 Day';
      const desc = document.getElementById('admin-pkg-desc')?.value.trim() || '';

      const deliverables = desc.split('·').map(s => s.trim()).filter(Boolean);

      if (id) {
        await dataStore.updatePackage(id, { name, category, priceINR, unit, duration, description: desc, deliverables });
      } else {
        await dataStore.addPackage({ name, category, priceINR, unit, duration, description: desc, deliverables });
      }

      this.closeSubModal('admin-package-modal');
      await this.renderPackages();
    });

    // Handle Review Form Submit
    document.getElementById('admin-review-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('admin-rev-id')?.value;
      const name = document.getElementById('admin-rev-name')?.value.trim();
      const location = document.getElementById('admin-rev-location')?.value.trim() || 'Tamil Nadu';
      const rating = Number(document.getElementById('admin-rev-rating')?.value) || 5;
      const eventType = document.getElementById('admin-rev-event')?.value.trim() || 'Wedding';
      const title = document.getElementById('admin-rev-title')?.value.trim();
      const comment = document.getElementById('admin-rev-comment')?.value.trim();
      const status = document.getElementById('admin-rev-status')?.value || 'published';

      if (id) {
        await dataStore.updateReview(id, { name, location, rating, eventType, title, comment, status });
      } else {
        await dataStore.addReview({ name, location, rating, eventType, title, comment, status });
      }

      this.closeSubModal('admin-review-modal');
      await this.renderReviews();
    });

    // Handle Change Status Form Submit
    document.getElementById('admin-change-status-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('admin-status-inquiry-id')?.value;
      const newStatus = document.getElementById('admin-new-status-select')?.value;

      if (id && newStatus) {
        await dataStore.updateBooking(id, { status: newStatus });
        this.closeSubModal('admin-status-modal');
        await this.renderBookings();
        await this.renderOverview();
      }
    });

    // Handle Change Password Form Submit
    document.getElementById('admin-password-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curPwd = document.getElementById('admin-current-pwd-input')?.value.trim();
      const newPwd = document.getElementById('admin-new-pwd-input')?.value.trim();
      const confPwd = document.getElementById('admin-confirm-pwd-input')?.value.trim();

      if (newPwd !== confPwd) {
        toast.show({ title: 'Password Mismatch', message: 'New password and confirmation do not match.', type: 'warning', icon: 'warning' });
        return;
      }

      const isValidCurrent = await dataStore.verifyAdminPassword(curPwd);
      if (!isValidCurrent) {
        toast.show({ title: 'Incorrect Current Password', message: 'Current password is not correct.', type: 'error', icon: 'error' });
        return;
      }

      await dataStore.updateAdminPassword(newPwd);
      this.closeSubModal('admin-password-modal');
      document.getElementById('admin-password-form')?.reset();
    });
  }

  // ==========================================
  // DEDICATED ADD CATEGORY MODAL LOGIC
  // ==========================================
  openAddCategoryModal() {
    const errorEl = document.getElementById('admin-modal-add-cat-error');
    const input = document.getElementById('admin-modal-cat-name');
    if (errorEl) errorEl.style.display = 'none';
    if (input) input.value = '';
    this.openSubModal('admin-add-category-modal');
    input?.focus();
  }

  async handleStandaloneAddCategory() {
    const input = document.getElementById('admin-modal-cat-name');
    const errorEl = document.getElementById('admin-modal-add-cat-error');
    const submitBtn = document.getElementById('btn-modal-submit-add-cat');
    const name = input?.value.trim();

    if (!name) return;

    if (errorEl) errorEl.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-spinner"></span> Adding...';
    }

    try {
      const added = await dataStore.addCategory(name);
      sound.playSuccessChime();

      // Close modal automatically
      this.closeSubModal('admin-add-category-modal');

      // Refresh category selects and auto-select the new category
      await this.refreshCategories();
      const uploaderSelect = document.getElementById('admin-photo-category');
      if (uploaderSelect && added?.id) {
        uploaderSelect.value = added.id;
      }

      await this.renderPhotoLibrary();
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Unable to add category.';
        errorEl.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Add Category';
      }
    }
  }

  openPackageModal(pkg) {
    const modal = document.getElementById('admin-package-modal');
    const titleEl = document.getElementById('admin-pkg-modal-title');
    const idInput = document.getElementById('admin-pkg-id');
    const nameInput = document.getElementById('admin-pkg-name');
    const catInput = document.getElementById('admin-pkg-category');
    const priceInput = document.getElementById('admin-pkg-price');
    const unitInput = document.getElementById('admin-pkg-unit');
    const durationInput = document.getElementById('admin-pkg-duration');
    const descInput = document.getElementById('admin-pkg-desc');

    if (pkg) {
      if (titleEl) titleEl.textContent = 'Edit Package / Pricing';
      if (idInput) idInput.value = pkg.id;
      if (nameInput) nameInput.value = pkg.name;
      if (catInput) catInput.value = pkg.category || 'Wedding';
      if (priceInput) priceInput.value = pkg.priceINR;
      if (unitInput) unitInput.value = pkg.unit || 'Full Event';
      if (durationInput) durationInput.value = pkg.duration || '1 Day';
      if (descInput) descInput.value = pkg.description || (pkg.deliverables || []).join(' · ');
    } else {
      if (titleEl) titleEl.textContent = 'Add Photography Package';
      document.getElementById('admin-package-form')?.reset();
      if (idInput) idInput.value = '';
    }

    this.openSubModal('admin-package-modal');
  }

  openReviewModal(rev) {
    const modal = document.getElementById('admin-review-modal');
    const titleEl = document.getElementById('admin-rev-modal-title');
    const idInput = document.getElementById('admin-rev-id');
    const nameInput = document.getElementById('admin-rev-name');
    const locInput = document.getElementById('admin-rev-location');
    const ratingInput = document.getElementById('admin-rev-rating');
    const eventInput = document.getElementById('admin-rev-event');
    const headInput = document.getElementById('admin-rev-title');
    const commentInput = document.getElementById('admin-rev-comment');
    const statusInput = document.getElementById('admin-rev-status');

    if (rev) {
      if (titleEl) titleEl.textContent = 'Edit Client Review';
      if (idInput) idInput.value = rev.id;
      if (nameInput) nameInput.value = rev.name;
      if (locInput) locInput.value = rev.location || 'Tamil Nadu';
      if (ratingInput) ratingInput.value = rev.rating || 5;
      if (eventInput) eventInput.value = rev.eventType || 'Wedding';
      if (headInput) headInput.value = rev.title;
      if (commentInput) commentInput.value = rev.comment;
      if (statusInput) statusInput.value = rev.status || 'published';
    } else {
      if (titleEl) titleEl.textContent = 'Add Client Review';
      document.getElementById('admin-review-form')?.reset();
      if (idInput) idInput.value = '';
    }

    this.openSubModal('admin-review-modal');
  }

  openStatusModal(inquiry) {
    const modal = document.getElementById('admin-status-modal');
    const idInput = document.getElementById('admin-status-inquiry-id');
    const descEl = document.getElementById('admin-status-inquiry-desc');
    const select = document.getElementById('admin-new-status-select');

    if (idInput) idInput.value = inquiry.id;
    if (descEl) descEl.textContent = `Update status for ${inquiry.clientName} (${inquiry.packageName})`;
    if (select) select.value = inquiry.status || 'New';

    this.openSubModal('admin-status-modal');
  }

  async refreshCategories() {
    const categories = await dataStore.getCategories();

    // Photo Uploader Category Select
    const uploaderSelect = document.getElementById('admin-photo-category');
    if (uploaderSelect) {
      const curVal = uploaderSelect.value;
      uploaderSelect.innerHTML = categories.map(c => `
        <option value="${c.id}" ${c.id === curVal ? 'selected' : ''}>${c.name}</option>
      `).join('');
    }

    // Photo Filter Select
    const filterSelect = document.getElementById('admin-photo-category-filter');
    if (filterSelect) {
      filterSelect.innerHTML = `<option value="all">All Categories</option>` + categories.map(c => `
        <option value="${c.id}" ${c.id === this.photoCategoryFilter ? 'selected' : ''}>${c.name}</option>
      `).join('');
    }

    // Edit Modal Category Select
    const editCatSelect = document.getElementById('admin-edit-photo-cat-select');
    if (editCatSelect) {
      const curVal = editCatSelect.value;
      editCatSelect.innerHTML = categories.map(c => `
        <option value="${c.id}" ${c.id === curVal ? 'selected' : ''}>${c.name}</option>
      `).join('');
    }
  }

  // ==========================================
  // CATEGORY DIRECTORY MANAGER
  // ==========================================
  setupCategoryManager() {
    // Category Manager events already handled in setupModals
  }

  async renderCategoryManagerList() {
    const container = document.getElementById('admin-categories-list-container');
    const badge = document.getElementById('admin-cat-count-badge');
    if (!container) return;

    const categories = await dataStore.getCategories();
    const photos = await dataStore.getPhotos();

    if (badge) badge.textContent = `${categories.length} Categories`;

    container.innerHTML = categories.map((cat, idx) => {
      const count = photos.filter(p => p.category === cat.id).length;
      return `
        <div class="category-admin-row" data-id="${cat.id}">
          <input type="text" class="category-admin-name-input" value="${cat.name}" data-id="${cat.id}" data-idx="${idx}" />
          <span style="font-size: 0.74rem; color: #9ca3af; white-space: nowrap; margin-right: 0.35rem;">(${count} photos)</span>
          <div class="category-admin-actions">
            <button type="button" class="btn-cat-save" data-id="${cat.id}">Save</button>
            <button type="button" class="btn-cat-delete" data-id="${cat.id}" ${categories.length <= 1 ? 'disabled style="opacity:0.4;"' : ''}>Delete</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind Save (Rename)
    container.querySelectorAll('.btn-cat-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const input = container.querySelector(`input[data-id="${id}"]`);
        if (input && input.value.trim()) {
          const newName = input.value.trim();
          btn.disabled = true;
          btn.textContent = 'Saving...';
          try {
            await dataStore.updateCategory(id, newName);
            sound.playSuccessChime();
            await this.refreshCategories();
            await this.renderCategoryManagerList();
          } catch (err) {
            toast.show({ title: 'Rename Failed', message: err.message || 'Could not rename category.', type: 'error', icon: 'error' });
          } finally {
            btn.disabled = false;
            btn.textContent = 'Save';
          }
        }
      });
    });

    // Bind Delete
    container.querySelectorAll('.btn-cat-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const cat = categories.find(c => c.id === id);
        if (!cat) return;

        if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
          btn.disabled = true;
          btn.textContent = 'Deleting...';
          try {
            await dataStore.deleteCategory(id);
            sound.playSuccessChime();
            await this.renderCategoryManagerList();
            await this.refreshCategories();
            await this.renderPhotoLibrary();
          } catch (err) {
            toast.show({ title: 'Delete Failed', message: err.message || 'Could not delete category.', type: 'error', icon: 'error' });
          } finally {
            btn.disabled = false;
            btn.textContent = 'Delete';
          }
        }
      });
    });
  }

  getStatusBadgeClass(status) {
    switch (status) {
      case 'Confirmed': return 'badge-confirmed';
      case 'In Progress': return 'badge-progress';
      case 'Completed': return 'badge-completed';
      case 'Cancelled': return 'badge-cancelled';
      case 'New':
      default:
        return 'badge-new';
    }
  }
}

export const adminDashboard = new AdminDashboard();
