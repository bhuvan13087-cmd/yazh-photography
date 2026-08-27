// Luxury Toast Notification System
class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  show({ title, message, type = 'info', icon = 'sparkles', duration = 4000 }) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    const iconMap = {
      success: '✓',
      info: '✦',
      warning: '⚠',
      error: '✕',
      cart: '🛍',
      camera: '📷',
      heart: '♥'
    };

    toast.innerHTML = `
      <div class="toast-icon-wrapper">
        <span class="toast-symbol">${iconMap[icon] || '✦'}</span>
      </div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
      <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    this.container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 350);
    };

    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
  }

  success(message, title = 'Success') {
    this.show({ title, message, type: 'success', icon: 'success' });
  }

  info(message, title = 'Notification') {
    this.show({ title, message, type: 'info', icon: 'info' });
  }

  cart(message, title = 'Added to Cart') {
    this.show({ title, message, type: 'success', icon: 'cart' });
  }

  shutter(message, title = 'Captured') {
    this.show({ title, message, type: 'info', icon: 'camera' });
  }
}

export const toast = new ToastManager();
