import { ThemeManager } from './modules/theme.js';
import { NavigationManager } from './modules/navigation.js';
import { HeroManager } from './modules/heroSlider.js';
import { PortfolioViewer } from './modules/portfolioView.js';
import { BookingEngine } from './modules/bookingEngine.js';
import { CustomPackageBuilder } from './modules/customPackageBuilder.js';
import { ReviewManager } from './modules/reviewManager.js';
import { AdminDashboard } from './modules/adminDashboard.js';
import { BookingInvoiceManager } from './modules/bookingInvoice.js';
import { sound } from './utils/sound.js';
import { toast } from './utils/toast.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme Switcher (Dark/Light)
  const themeManager = new ThemeManager();

  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Initialize Navigation
  const navigation = new NavigationManager();

  // Initialize Hero Manager
  const heroManager = new HeroManager();

  // Initialize Portfolio & Lightbox
  const portfolioViewer = new PortfolioViewer();

  // Initialize Booking Engine
  const bookingEngine = new BookingEngine();

  // Initialize Custom Package Builder
  const customPackageBuilder = new CustomPackageBuilder();

  // Initialize Client Review System
  const reviewManager = new ReviewManager();

  // Initialize Booking Invoice & Bill Manager
  const bookingInvoiceManager = new BookingInvoiceManager();
  window.bookingInvoiceManager = bookingInvoiceManager;

  // Initialize Admin Dashboard
  const adminDashboard = new AdminDashboard();

  // Setup Scroll Reveal Animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal-on-scroll').forEach(el => {
    revealObserver.observe(el);
  });

  // Re-run icons when any DOM updates
  setTimeout(() => {
    if (window.lucide) window.lucide.createIcons();
  }, 100);
});
