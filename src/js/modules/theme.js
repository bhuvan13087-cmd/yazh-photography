// Minimalist Theme Switcher: Light (Museum White) & Dark (Studio Onyx)
export class ThemeManager {
  constructor() {
    this.theme = localStorage.getItem('yazh_theme') || 'dark';
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
