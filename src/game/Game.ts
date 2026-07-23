import { AudioSystem } from "./audio";
import { Haptic } from "./haptics";

// ---------- Types ----------
export type GameState = "menu" | "playing" | "paused" | "gameover";

interface Vec {
  x: number;
  y: number;
}

interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  invuln: number;
  thrust: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  trail: { x: number; y: number }[];
  fromPlayer: boolean;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  spin: number;
  tier: 3 | 2 | 1; // 3 = big, 2 = medium, 1 = small
  shape: number[]; // radii around the circle
  hp: number;
  flash: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
  shrink: number;
}

interface Popup {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
  size: number;
}

interface Star {
  x: number;
  y: number;
  z: number; // depth 0..1 for parallax
  tw: number;
}

export interface HighScore {
  name: string;
  score: number;
  date: number;
  wave: number;
}

// ---------- Constants ----------
const BG = "#05060f";
const GRID = "rgba(120, 100, 255, 0.06)";
const CYAN = "#6ef0ff";
const MAGENTA = "#ff4fd8";
const YELLOW = "#ffdd55";
const WHITE = "#ffffff";

const LS_KEY = "neon-blaster-highscores-v1";
const MAX_HIGH = 8;

// ---------- Game ----------
export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audio = new AudioSystem();

  width = 0;
  height = 0;
  dpr = 1;

  state: GameState = "menu";
  ship!: Ship;
  bullets: Bullet[] = [];
  asteroids: Asteroid[] = [];
  particles: Particle[] = [];
  popups: Popup[] = [];
  stars: Star[] = [];

  // input
  keys = new Set<string>();
  aim: Vec = { x: 0, y: 0 };
  moving: Vec = { x: 0, y: 0 }; // target pos for touch-drag movement
  hasTouchAim = false;
  hasMoveTarget = false;
  isTouch = false;
  mouseDown = false;

  // scoring
  score = 0;
  best = 0;
  combo = 0;
  comboTimer = 0;
  multiplier = 1;
  wave = 1;
  spawnTimer = 0;
  spawnInterval = 1.4;
  waveTimer = 0;
  killsThisWave = 0;

  // juice
  shakeAmount = 0;
  shakeX = 0;
  shakeY = 0;
  slowMo = 1;
  slowMoTarget = 1;
  flash = 0;
  hitStop = 0;
  time = 0;

  // firing
  fireCooldown = 0;
  fireRate = 0.12; // seconds

  // callbacks to React (lightweight)
  onStateChange?: (s: GameState) => void;
  onScoreChange?: (score: number, best: number, combo: number, wave: number, multiplier: number) => void;

  raf = 0;
  last = 0;
  running = false;
  deathTimer: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    this.buildStars();
    this.resetShip();
    this.loadHighScores();
    this.bindInput();
  }

  // ---------- Lifecycle ----------
  start() {
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.05) dt = 0.05; // clamp on tab-switch
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // ---------- State transitions ----------
  newGame() {
    this.audio.resume();
    this.audio.ui();
    if (this.deathTimer !== null) {
      clearTimeout(this.deathTimer);
      this.deathTimer = null;
    }
    this.slowMoTarget = 1;
    this.slowMo = 1;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.wave = 1;
    this.killsThisWave = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.4;
    this.waveTimer = 0;
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.popups = [];
    this.flash = 0;
    this.slowMo = 1;
    this.slowMoTarget = 1;
    this.hitStop = 0;
    this.resetShip();
    // seed a couple of asteroids so action starts within 10 seconds
    for (let i = 0; i < 2; i++) this.spawnAsteroid(true);
    this.setState("playing");
    this.emitScore();
  }

  togglePause() {
    if (this.state === "playing") {
      this.setState("paused");
      this.audio.ui();
      Haptic.selection();
    } else if (this.state === "paused") {
      this.setState("playing");
      this.audio.ui();
      Haptic.selection();
    }
  }

  private setState(s: GameState) {
    this.state = s;
    this.onStateChange?.(s);
  }

  // ---------- Input ----------
  private bindInput() {
    const c = this.canvas;
    c.addEventListener(
      "mousemove",
      (e) => {
        const r = c.getBoundingClientRect();
        this.aim.x = e.clientX - r.left;
        this.aim.y = e.clientY - r.top;
      },
      { passive: true },
    );
    c.addEventListener("mousedown", () => {
      this.mouseDown = true;
      this.audio.resume();
    });
    c.addEventListener("mouseup", () => (this.mouseDown = false));

    c.addEventListener(
      "touchstart",
      (e) => {
        this.isTouch = true;
        const t = e.touches[0];
        const r = c.getBoundingClientRect();
        this.aim.x = t.clientX - r.left;
        this.aim.y = t.clientY - r.top;
        this.hasTouchAim = true;
        this.moving.x = this.aim.x;
        this.moving.y = this.aim.y;
        this.hasMoveTarget = true;
        this.audio.resume();
        e.preventDefault();
      },
      { passive: false },
    );
    c.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches[0];
        const r = c.getBoundingClientRect();
        this.aim.x = t.clientX - r.left;
        this.aim.y = t.clientY - r.top;
        this.moving.x = this.aim.x;
        this.moving.y = this.aim.y;
        this.hasMoveTarget = true;
        e.preventDefault();
      },
      { passive: false },
    );
    c.addEventListener(
      "touchend",
      () => {
        this.hasTouchAim = false;
      },
      { passive: true },
    );

    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === "Escape" || e.key.toLowerCase() === "p") {
        if (this.state === "playing" || this.state === "paused") this.togglePause();
      }
      if (e.key === " " || e.key === "Enter") {
        if (this.state === "menu" || this.state === "gameover") this.newGame();
      }
      if (e.key.toLowerCase() === "r") {
        if (this.state === "gameover" || this.state === "paused") this.newGame();
      }
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener("resize", () => {
      this.resize();
      this.buildStars();
    });
  }

  // ---------- Update ----------
  private update(rawDt: number) {
    this.time += rawDt;

    // slow-mo easing
    this.slowMo += (this.slowMoTarget - this.slowMo) * Math.min(1, rawDt * 6);

    // hit-stop: freeze gameplay briefly on big events
    if (this.hitStop > 0) {
      this.hitStop -= rawDt;
      return;
    }

    const dt = rawDt * this.slowMo;

    // always update stars + particles + shake + popups so menus feel alive
    this.updateStars(dt);
    this.updateParticles(dt);
    this.updatePopups(dt);
    this.updateShake(dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - rawDt * 4);

    if (this.state !== "playing") return;

    // --- Ship ---
    this.updateShip(dt);

    // --- Firing ---
    this.fireCooldown -= dt;
    // fire while aiming with mouse, or any key, or touch
    const firing = this.hasTouchAim || this.mouseDown || this.keys.size > 0 || this.isTouch;
    if (firing && this.fireCooldown <= 0) {
      this.fire();
      this.fireCooldown = this.fireRate;
    }

    // --- Spawning ---
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnAsteroid(false);
      this.spawnTimer = this.spawnInterval;
    }
    this.waveTimer += dt;
    if (this.waveTimer > 18) {
      this.wave++;
      this.waveTimer = 0;
      this.spawnInterval = Math.max(0.35, this.spawnInterval * 0.88);
      this.addPopup(this.width / 2, 120, `WAVE ${this.wave}`, CYAN, 34);
      this.shakeAmount = Math.min(this.shakeAmount + 6, 20);
    }

    // --- Bullets ---
    for (const b of this.bullets) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 6) b.trail.shift();
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    this.bullets = this.bullets.filter(
      (b) => b.life > 0 && b.x > -20 && b.x < this.width + 20 && b.y > -20 && b.y < this.height + 20,
    );

    // --- Asteroids ---
    for (const a of this.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.angle += a.spin * dt;
      if (a.flash > 0) a.flash = Math.max(0, a.flash - dt * 5);
    }
    // cull off-screen (only if moving away)
    this.asteroids = this.asteroids.filter((a) => {
      const m = a.radius + 80;
      return a.x > -m && a.x < this.width + m && a.y > -m && a.y < this.height + m;
    });

    // --- Collisions ---
    this.collideBulletsAsteroids();
    this.collideShipAsteroids();

    // --- Combo decay ---
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.multiplier = 1;
      }
    }

    this.emitScore();
  }

  private resetShip() {
    this.ship = {
      x: this.width / 2,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: 12,
      invuln: 0,
      thrust: 0,
    };
    if (!this.aim.x && !this.aim.y) {
      this.aim.x = this.width / 2;
      this.aim.y = this.height / 2 - 80;
    }
  }

  private updateShip(dt: number) {
    const s = this.ship;
    // aim follows mouse/touch target
    s.angle = Math.atan2(this.aim.y - s.y, this.aim.x - s.x);

    // movement: WASD/arrows or touch-drag target
    let mx = 0;
    let my = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) mx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) mx += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) my -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) my += 1;

    const accel = 1400;
    const maxSpeed = 380;
    const friction = 0.88;

    if (this.hasMoveTarget && (this.isTouch || !this.hasTouchAim)) {
      // on touch, ship follows finger with soft pull
      const dx = this.moving.x - s.x;
      const dy = this.moving.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d > 2) {
        const pull = Math.min(accel, d * 12);
        s.vx += (dx / d) * pull * dt;
        s.vy += (dy / d) * pull * dt;
      }
      mx = 0;
      my = 0;
    }

    if (mx || my) {
      const mag = Math.hypot(mx, my) || 1;
      s.vx += (mx / mag) * accel * dt;
      s.vy += (my / mag) * accel * dt;
    }

    // clamp speed
    const sp = Math.hypot(s.vx, s.vy);
    if (sp > maxSpeed) {
      s.vx = (s.vx / sp) * maxSpeed;
      s.vy = (s.vy / sp) * maxSpeed;
    }

    // friction
    s.vx *= friction;
    s.vy *= friction;

    s.x += s.vx * dt;
    s.y += s.vy * dt;

    // keep in bounds
    const pad = s.radius + 4;
    if (s.x < pad) {
      s.x = pad;
      s.vx = Math.abs(s.vx) * 0.4;
    }
    if (s.x > this.width - pad) {
      s.x = this.width - pad;
      s.vx = -Math.abs(s.vx) * 0.4;
    }
    if (s.y < pad) {
      s.y = pad;
      s.vy = Math.abs(s.vy) * 0.4;
    }
    if (s.y > this.height - pad) {
      s.y = this.height - pad;
      s.vy = -Math.abs(s.vy) * 0.4;
    }

    s.thrust = Math.hypot(s.vx, s.vy) / maxSpeed;
    if (s.invuln > 0) s.invuln -= dt;

    // thrust trail particles
    if (Math.hypot(s.vx, s.vy) > 80) {
      const back = Math.PI + s.angle;
      const spread = 0.5;
      for (let i = 0; i < 2; i++) {
        const a = back + (Math.random() - 0.5) * spread;
        this.particles.push({
          x: s.x + Math.cos(back) * 10,
          y: s.y + Math.sin(back) * 10,
          vx: Math.cos(a) * (60 + Math.random() * 120),
          vy: Math.sin(a) * (60 + Math.random() * 120),
          life: 0.35,
          max: 0.35,
          size: 2 + Math.random() * 2,
          color: Math.random() < 0.5 ? CYAN : MAGENTA,
          gravity: 0,
          shrink: 1,
        });
      }
    }
  }

  private fire() {
    const s = this.ship;
    const speed = 720;
    const bx = s.x + Math.cos(s.angle) * 16;
    const by = s.y + Math.sin(s.angle) * 16;
    this.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(s.angle) * speed + s.vx * 0.3,
      vy: Math.sin(s.angle) * speed + s.vy * 0.3,
      life: 1.1,
      trail: [],
      fromPlayer: true,
    });
    // muzzle flash particles
    for (let i = 0; i < 5; i++) {
      const a = s.angle + (Math.random() - 0.5) * 0.6;
      this.particles.push({
        x: bx,
        y: by,
        vx: Math.cos(a) * (180 + Math.random() * 120),
        vy: Math.sin(a) * (180 + Math.random() * 120),
        life: 0.15,
        max: 0.15,
        size: 2 + Math.random() * 2,
        color: YELLOW,
        gravity: 0,
        shrink: 1,
      });
    }
    // recoil
    s.vx -= Math.cos(s.angle) * 18;
    s.vy -= Math.sin(s.angle) * 18;
    // tiny screen punch
    this.shakeAmount = Math.min(this.shakeAmount + 1.5, 6);
    this.audio.shoot();
    Haptic.light();
  }

  private spawnAsteroid(initial: boolean) {
    // pick spawn off-screen
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    const m = 40;
    if (side === 0) {
      x = -m;
      y = Math.random() * this.height;
    } else if (side === 1) {
      x = this.width + m;
      y = Math.random() * this.height;
    } else if (side === 2) {
      x = Math.random() * this.width;
      y = -m;
    } else {
      x = Math.random() * this.width;
      y = this.height + m;
    }

    // aim roughly toward the ship
    const tx = this.ship.x + (Math.random() - 0.5) * 140;
    const ty = this.ship.y + (Math.random() - 0.5) * 140;
    const baseSpeed = 80 + this.wave * 8 + Math.random() * 50;
    const ang = Math.atan2(ty - y, tx - x);
    const vx = Math.cos(ang) * baseSpeed;
    const vy = Math.sin(ang) * baseSpeed;

    const tier: 3 | 2 | 1 = initial ? 3 : Math.random() < 0.35 ? 2 : 3;
    const radius = tier === 3 ? 38 : tier === 2 ? 22 : 12;

    // procedural shape: radii around circle
    const verts = 10 + Math.floor(Math.random() * 6);
    const shape: number[] = [];
    for (let i = 0; i < verts; i++) {
      shape.push(0.75 + Math.random() * 0.45);
    }

    this.asteroids.push({
      x,
      y,
      vx,
      vy,
      radius,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2,
      tier,
      shape,
      hp: tier,
      flash: 0,
    });
  }

  private collideBulletsAsteroids() {
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const r = a.radius;
        if (dx * dx + dy * dy < r * r) {
          b.life = 0;
          this.damageAsteroid(a, b.vx, b.vy);
          break;
        }
      }
    }
    this.asteroids = this.asteroids.filter((a) => a.hp > 0);
  }

  private damageAsteroid(a: Asteroid, bvx: number, bvy: number) {
    a.hp--;
    a.flash = 1;
    // spark burst
    const n = 10 + a.tier * 4;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 260;
      this.particles.push({
        x: a.x + Math.cos(ang) * a.radius * 0.4,
        y: a.y + Math.sin(ang) * a.radius * 0.4,
        vx: Math.cos(ang) * sp + bvx * 0.1,
        vy: Math.sin(ang) * sp + bvy * 0.1,
        life: 0.4 + Math.random() * 0.4,
        max: 0.8,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() < 0.5 ? MAGENTA : YELLOW,
        gravity: 80,
        shrink: 1,
      });
    }
    this.shakeAmount = Math.min(this.shakeAmount + 2 + a.tier, 14);
    this.hitStop = Math.min(this.hitStop + 0.02, 0.05);
    this.audio.hit();
    Haptic.medium();

    if (a.hp <= 0) {
      this.explodeAsteroid(a);
    }
  }

  private explodeAsteroid(a: Asteroid) {
    // big burst
    const n = 18 + a.tier * 6;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 320;
      this.particles.push({
        x: a.x,
        y: a.y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.6 + Math.random() * 0.6,
        max: 1.2,
        size: 2 + Math.random() * 3,
        color: [CYAN, MAGENTA, YELLOW][Math.floor(Math.random() * 3)],
        gravity: 60,
        shrink: 1,
      });
    }

    // split
    if (a.tier === 3) {
      for (let i = 0; i < 2; i++) this.spawnChild(a, 2);
    } else if (a.tier === 2) {
      for (let i = 0; i < 2; i++) this.spawnChild(a, 1);
    }

    // score
    const base = a.tier === 3 ? 100 : a.tier === 2 ? 200 : 400;
    this.combo++;
    this.comboTimer = 2.2;
    this.multiplier = 1 + Math.floor(this.combo / 4);
    const gained = base * this.multiplier;
    this.score += gained;
    this.addPopup(a.x, a.y - a.radius * 0.4, `+${gained}`, this.multiplier > 1 ? YELLOW : WHITE, 18 + Math.min(this.multiplier * 3, 24));
    if (this.multiplier >= 3 && this.combo % 4 === 0) this.audio.combo();

    this.killsThisWave++;
    this.audio.explode();
    this.shakeAmount = Math.min(this.shakeAmount + 6, 22);
    Haptic.heavy();
  }

  private spawnChild(a: Asteroid, tier: 1 | 2) {
    const radius = tier === 2 ? 22 : 12;
    const ang = Math.random() * Math.PI * 2;
    const sp = 120 + Math.random() * 80;
    const verts = 9 + Math.floor(Math.random() * 5);
    const shape: number[] = [];
    for (let i = 0; i < verts; i++) shape.push(0.75 + Math.random() * 0.45);
    this.asteroids.push({
      x: a.x + Math.cos(ang) * 4,
      y: a.y + Math.sin(ang) * 4,
      vx: a.vx * 0.6 + Math.cos(ang) * sp,
      vy: a.vy * 0.6 + Math.sin(ang) * sp,
      radius,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 3,
      tier,
      shape,
      hp: tier,
      flash: 0,
    });
  }

  private collideShipAsteroids() {
    if (this.ship.invuln > 0) return;
    const s = this.ship;
    for (const a of this.asteroids) {
      const dx = a.x - s.x;
      const dy = a.y - s.y;
      const r = a.radius + s.radius - 4;
      if (dx * dx + dy * dy < r * r) {
        this.die();
        return;
      }
    }
  }

  private die() {
    // huge explosion
    const s = this.ship;
    for (let i = 0; i < 120; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 50 + Math.random() * 480;
      this.particles.push({
        x: s.x,
        y: s.y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 1 + Math.random() * 0.8,
        max: 1.8,
        size: 2 + Math.random() * 4,
        color: [CYAN, MAGENTA, YELLOW, WHITE][Math.floor(Math.random() * 4)],
        gravity: 80,
        shrink: 1,
      });
    }
    this.shakeAmount = 40;
    this.flash = 1;
    this.slowMo = 0.2;
    this.slowMoTarget = 0.2;
    this.audio.death();
    this.hitStop = 0.15;
    Haptic.error();

    // save high score
    this.saveHighScore(this.score, this.wave);

    // transition to game-over after a brief slow-mo moment
    if (this.deathTimer !== null) clearTimeout(this.deathTimer);
    this.deathTimer = window.setTimeout(() => {
      this.slowMoTarget = 1;
      if (this.state === "playing") this.setState("gameover");
      this.deathTimer = null;
    }, 700);

    // prevent immediate re-collisions from triggering multiple times
    this.ship.invuln = 999;
  }

  // ---------- Particles / Popups ----------
  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    // cap particles for perf
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private updatePopups(dt: number) {
    for (const p of this.popups) {
      p.y += p.vy * dt;
      p.vy *= 0.92;
      p.life -= dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
  }

  private addPopup(x: number, y: number, text: string, color: string, size: number) {
    this.popups.push({ x, y, vy: -60, life: 1.1, text, color, size });
  }

  // ---------- Shake ----------
  private updateShake(dt: number) {
    if (this.shakeAmount > 0.2) {
      this.shakeX = (Math.random() - 0.5) * this.shakeAmount;
      this.shakeY = (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount *= Math.pow(0.001, dt); // decay fast
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeAmount = 0;
    }
  }

  // ---------- Stars ----------
  private buildStars() {
    this.stars = [];
    const n = 140;
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 0.9 + 0.1,
        tw: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateStars(dt: number) {
    for (const s of this.stars) {
      s.tw += dt * (1 + s.z);
      s.x -= s.z * 18 * dt; // subtle drift
      if (s.x < 0) s.x += this.width;
    }
  }

  // ---------- Render ----------
  private render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // background
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    // grid (subtle)
    ctx.save();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    const gs = 48;
    const offX = (this.time * 10) % gs;
    ctx.beginPath();
    for (let x = -offX; x < w; x += gs) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += gs) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();

    // stars
    for (const s of this.stars) {
      const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.tw));
      ctx.fillStyle = `rgba(200,210,255,${a * 0.8})`;
      ctx.fillRect(s.x, s.y, s.z * 2, s.z * 2);
    }

    // apply screen shake
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // particles (behind)
    this.drawParticles(ctx, false);

    // asteroids
    for (const a of this.asteroids) this.drawAsteroid(a);

    // bullets
    for (const b of this.bullets) this.drawBullet(b);

    // ship (hide once killed — invuln > 100 is our "dead" sentinel)
    if (this.state !== "gameover" && this.ship.invuln < 100) this.drawShip();

    // particles (foreground, sparkles)
    this.drawParticles(ctx, true);

    ctx.restore();

    // popups (not shaken, above shake space)
    for (const p of this.popups) this.drawPopup(p);

    // screen flash
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(this.flash, 0.85)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // vignette
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawAsteroid(a: Asteroid) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.angle);

    // glow ring
    const glowCol = a.flash > 0 ? "rgba(255,255,255,0.9)" : "rgba(255,79,216,0.4)";
    ctx.shadowBlur = 18;
    ctx.shadowColor = a.flash > 0 ? WHITE : MAGENTA;
    ctx.strokeStyle = glowCol;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < a.shape.length; i++) {
      const r = a.radius * a.shape[i];
      const ang = (i / a.shape.length) * Math.PI * 2;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // inner fill
    ctx.shadowBlur = 0;
    ctx.fillStyle = a.flash > 0 ? "rgba(255,255,255,0.85)" : "rgba(60,20,80,0.55)";
    ctx.fill();

    // tier marker
    ctx.fillStyle = a.flash > 0 ? WHITE : MAGENTA;
    ctx.font = `bold ${a.radius * 0.7}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.rotate(-a.angle);
    ctx.fillText(`${a.tier}`, 0, 1);

    ctx.restore();
  }

  private drawBullet(b: Bullet) {
    const ctx = this.ctx;
    // trail
    ctx.save();
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      const a = (i + 1) / b.trail.length;
      ctx.fillStyle = `rgba(110,240,255,${a * 0.55})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2 + a * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // head
    ctx.shadowBlur = 14;
    ctx.shadowColor = CYAN;
    ctx.fillStyle = CYAN;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawShip() {
    const s = this.ship;
    const ctx = this.ctx;
    const flicker = s.invuln > 0 ? (Math.floor(this.time * 30) % 2 === 0 ? 0.4 : 1) : 1;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.globalAlpha = flicker;

    // outer glow triangle
    ctx.shadowBlur = 22;
    ctx.shadowColor = CYAN;
    ctx.fillStyle = CYAN;
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // cockpit
    ctx.shadowBlur = 0;
    ctx.fillStyle = MAGENTA;
    ctx.beginPath();
    ctx.arc(2, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();

    // aim reticle
    ctx.save();
    const pulse = 1 + Math.sin(this.time * 8) * 0.1;
    ctx.strokeStyle = `rgba(255,255,255,0.6)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(this.aim.x, this.aim.y, 10 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.aim.x - 14, this.aim.y);
    ctx.lineTo(this.aim.x - 5, this.aim.y);
    ctx.moveTo(this.aim.x + 5, this.aim.y);
    ctx.lineTo(this.aim.x + 14, this.aim.y);
    ctx.moveTo(this.aim.x, this.aim.y - 14);
    ctx.lineTo(this.aim.x, this.aim.y - 5);
    ctx.moveTo(this.aim.x, this.aim.y + 5);
    ctx.lineTo(this.aim.x, this.aim.y + 14);
    ctx.stroke();
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, foreground: boolean) {
    for (const p of this.particles) {
      const t = Math.max(0, p.life / p.max);
      const alpha = t;
      const size = p.size * (foreground ? 1 : 0.8) * (0.4 + t * 0.6);
      if (foreground === (p.gravity > 20)) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawPopup(p: Popup) {
    const ctx = this.ctx;
    const t = Math.max(0, p.life / 1.1);
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.font = `800 ${p.size}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ---------- Scoring & High Scores ----------
  private emitScore() {
    this.best = Math.max(this.best, this.score);
    this.onScoreChange?.(this.score, this.best, this.combo, this.wave, this.multiplier);
  }

  loadHighScores(): HighScore[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as HighScore[];
      this.best = arr[0]?.score ?? 0;
      return arr;
    } catch {
      return [];
    }
  }

  saveHighScore(score: number, wave: number) {
    const arr = this.loadHighScores();
    arr.push({
      name: "P1",
      score,
      wave,
      date: Date.now(),
    });
    arr.sort((a, b) => b.score - a.score);
    const trimmed = arr.slice(0, MAX_HIGH);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore quota errors
    }
    this.best = trimmed[0]?.score ?? 0;
    this.emitScore();
    return trimmed;
  }

  // public helper so React UI can read current list on demand
  getHighScores(): HighScore[] {
    return this.loadHighScores();
  }
}
