import { sound } from '../utils/sound.js';
import { toast } from '../utils/toast.js';

export class HeroManager {
  constructor() {
    this.init();
  }

  init() {
    const soundToggle = document.getElementById('sound-toggle-btn');
    soundToggle?.addEventListener('click', () => {
      const isEnabled = sound.toggle();
      soundToggle.classList.toggle('muted', !isEnabled);
      soundToggle.setAttribute('title', isEnabled ? 'Audio Shutter: On' : 'Audio Shutter: Muted');
      if (isEnabled) {
        sound.playShutter();
        toast.info('Audio feedback enabled.');
      } else {
        toast.info('Audio feedback muted.');
      }
    });

    if (window.lucide) window.lucide.createIcons();
  }
}
