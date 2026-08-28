// Luxury Theme Switcher: White & Gold (Default Public Theme) & Studio Onyx (Dark)
export class ThemeManager {
  constructor() {
    const saved = localStorage.getItem('yazh_theme');
    this.theme = (saved === 'dark' || saved === 'light') ? saved : 'light';
    this.init();
  }

  init() {
    this.applyTheme(this.theme);
    this.bindEvents();
  }

  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('yazh_theme', theme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('title', theme === 'dark' ? 'Switch to Minimalist Light' : 'Switch to Minimalist Dark');
      themeToggleBtn.innerHTML = theme === 'dark'
        ? '<i data-lucide="sun" style="width: 16px; height: 16px;"></i>'
        : '<i data-lucide="moon" style="width: 16px; height: 16px;"></i>';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  toggle() {
    const nextTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
  }

  bindEvents() {
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
      this.toggle();
    });
  }
}

export const themeManager = new ThemeManager();
