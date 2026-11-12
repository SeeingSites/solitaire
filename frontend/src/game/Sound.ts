// Simple Web Audio API sound effects — no external dependencies
class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        this.enabled = false;
        return null;
      }
    }
    return this.ctx;
  }

  playTone(freq: number, duration = 0.08, type: OscillatorType = "sine", volume = 0.15) {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  click() { this.playTone(520, 0.05, "square", 0.08); }
  move() { this.playTone(440, 0.07, "sine", 0.12); }
  foundation() { this.playTone(660, 0.1, "triangle", 0.18); this.playTone(880, 0.12, "sine", 0.1); }
  win() {
    this.playTone(523, 0.15);
    setTimeout(() => this.playTone(659, 0.15), 120);
    setTimeout(() => this.playTone(784, 0.25), 240);
  }
  draw() { this.playTone(380, 0.06, "sawtooth", 0.07); }

  toggle() { this.enabled = !this.enabled; return this.enabled; }
  isEnabled() { return this.enabled; }
}

export const sound = new SoundManager();
