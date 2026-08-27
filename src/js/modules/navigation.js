import { currency, CURRENCIES } from './currency.js';

export class NavigationManager {
  constructor() {
    this.header = document.getElementById('main-header');
    this.mobileMenu = document.getElementById('mobile-nav-drawer');
    this.init();
  }

  init() {
    this.setupStickyScroll();
    this.setupCurrencySelector();
    this.setupMobileMenu();
    this.setupSmoothScroll();
  }

  setupStickyScroll() {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        this.header?.classList.add('scrolled');
      } else {
        this.header?.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  setupCurrencySelector() {
    const curBtn = document.getElementById('currency-selector-btn');
    const curMenu = document.getElementById('currency-dropdown-menu');
    const curLabel = document.getElementById('current-currency-label');

    if (!curBtn || !curMenu) return;

    // Set initial
    const cur = currency.getCurrency();
    if (curLabel) curLabel.textContent = cur.code;

    curBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      curMenu.classList.toggle('open');
    });

    window.addEventListener('click', () => {
      curMenu.classList.remove('open');
    });

    curMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.currency-item');
      if (item) {
        const code = item.dataset.currency;
        currency.setCurrency(code);
        if (curLabel) curLabel.textContent = code;
        curMenu.classList.remove('open');
      }
    });

    document.addEventListener('currencyChange', (e) => {
      if (curLabel) curLabel.textContent = e.detail.code;
    });
  }

  setupMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('mobile-nav-close');
    const backdrop = document.getElementById('mobile-nav-backdrop');

    const openMenu = () => {
      this.mobileMenu?.classList.add('active', 'open');
      backdrop?.classList.add('active', 'open');
      document.body.style.overflow = 'hidden';
      if (window.lucide) window.lucide.createIcons();
    };

    const closeMenu = () => {
      this.mobileMenu?.classList.remove('active', 'open');
      backdrop?.classList.remove('active', 'open');
      document.body.style.overflow = '';
    };

    toggleBtn?.addEventListener('click', openMenu);
    closeBtn?.addEventListener('click', closeMenu);
    backdrop?.addEventListener('click', closeMenu);

    this.mobileMenu?.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Custom Package Builder link inside mobile drawer
    const customLink = document.getElementById('mobile-link-custom-builder');
    customLink?.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
      const customBtn = document.getElementById('view-custom-builder-btn');
      customBtn?.click();
      const bookingSec = document.getElementById('booking-section');
      if (bookingSec) {
        const headerHeight = 65;
        const targetPos = bookingSec.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });
      }
    });
  }

  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href.length <= 1) return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const headerHeight = window.innerWidth <= 768 ? 65 : 80;
          const targetPos = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({
            top: targetPos,
            behavior: 'smooth'
          });
        }
      });
    });
  }
}
