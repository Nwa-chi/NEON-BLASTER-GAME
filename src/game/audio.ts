// Tiny Web Audio synthesized SFX — no assets required, super snappy.
export class AudioSystem {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  muted = false;

  resume() {
    if (!this.ctx) {
      const AC =
        (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime, 0.01);
    }
    return this.muted;
  }

  private blip(
    freq: number,
    dur: number,
    type: OscillatorType = "square",
    volume = 0.3,
    slideTo?: number,
  ) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, volume = 0.4, filterFreq = 1200) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  shoot() {
    this.blip(880, 0.06, "square", 0.15, 440);
  }

  hit() {
    this.blip(220, 0.12, "sawtooth", 0.25, 80);
    this.noise(0.15, 0.2, 800);
  }

  explode() {
    this.noise(0.5, 0.5, 600);
    this.blip(120, 0.4, "sawtooth", 0.35, 30);
  }

  death() {
    this.noise(0.9, 0.6, 1200);
    this.blip(200, 0.8, "sawtooth", 0.4, 25);
    this.blip(80, 1.0, "triangle", 0.3, 20);
  }

  combo() {
    this.blip(660, 0.08, "triangle", 0.2, 880);
    this.blip(880, 0.1, "triangle", 0.18, 1320);
  }

  ui() {
    this.blip(520, 0.05, "square", 0.1);
  }
}
