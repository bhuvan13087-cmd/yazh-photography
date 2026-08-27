// Subtle Web Audio API sound effects for luxury camera tactile experience
class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Camera mechanical focal plane shutter sound simulation
  playShutter() {
    if (!this.enabled) return;
    try {
      this.init();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Click 1: Mirror lift / first curtain
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      const filter1 = this.audioCtx.createBiquadFilter();

      filter1.type = 'bandpass';
      filter1.frequency.setValueAtTime(1400, now);
      filter1.Q.setValueAtTime(3, now);

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(240, now);
      osc1.frequency.exponentialRampToValueAtTime(40, now + 0.04);

      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(this.audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.05);

      // Click 2: Second curtain / shutter closure
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      const filter2 = this.audioCtx.createBiquadFilter();

      filter2.type = 'bandpass';
      filter2.frequency.setValueAtTime(950, now + 0.07);
      filter2.Q.setValueAtTime(2, now + 0.07);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(180, now + 0.07);
      osc2.frequency.exponentialRampToValueAtTime(30, now + 0.12);

      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.28, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(this.audioCtx.destination);

      osc2.start(now + 0.07);
      osc2.stop(now + 0.14);
    } catch (e) {
      console.warn('Audio not available or blocked by user gesture', e);
    }
  }

  // Soft gold chime on successful cart addition or checkout
  playSuccessChime() {
    if (!this.enabled) return;
    try {
      this.init();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const notes = [587.33, 880, 1174.66]; // D5, A5, D6 chords

      notes.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.65);
      });
    } catch (e) {
      console.warn('Audio not available', e);
    }
  }
}

export const sound = new SoundEngine();
