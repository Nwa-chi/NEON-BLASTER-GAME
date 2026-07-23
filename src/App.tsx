import { useEffect, useRef, useState } from "react";
import { Game, type GameState, type HighScore } from "./game/Game";

type HudState = {
  score: number;
  best: number;
  combo: number;
  wave: number;
  multiplier: number;
};

export default function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);

  const [gameState, setGameState] = useState<GameState>("menu");
  const [hud, setHud] = useState<HudState>({
    score: 0,
    best: 0,
    combo: 0,
    wave: 1,
    multiplier: 1,
  });
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [muted, setMuted] = useState(false);

  // boot the game once
  useEffect(() => {
    if (!canvasRef.current) return;
    const g = new Game(canvasRef.current);
    gameRef.current = g;
    g.onStateChange = (s) => setGameState(s);
    g.onScoreChange = (score, best, combo, wave, multiplier) => {
      setHud((h) => {
        if (
          h.score === score &&
          h.best === best &&
          h.combo === combo &&
          h.wave === wave &&
          h.multiplier === multiplier
        )
          return h;
        return { score, best, combo, wave, multiplier };
      });
    };
    g.start();
    setHighScores(g.getHighScores());
    return () => {
      g.stop();
    };
  }, []);

  // keep high-score list in sync when game over triggers
  useEffect(() => {
    if (gameState === "gameover" && gameRef.current) {
      setHighScores(gameRef.current.getHighScores());
    }
  }, [gameState]);

  const start = () => gameRef.current?.newGame();
  const togglePause = () => gameRef.current?.togglePause();
  const resume = () => {
    if (gameState === "paused") gameRef.current?.togglePause();
  };

  const toggleMute = () => {
    if (gameRef.current) {
      const m = gameRef.current.audio.toggleMute();
      setMuted(m);
    }
  };

  const formatNum = (n: number) => n.toLocaleString();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05060f] font-sans text-white select-none">
      {/* Canvas — fills viewport */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full touch-none"
      />

      {/* HUD (playing) */}
      {gameState === "playing" && (
        <>
          <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-start justify-between p-4 sm:p-6">
            <div className="flex flex-col gap-1">
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">Score</div>
              <div className="font-mono text-3xl font-black leading-none text-white drop-shadow-[0_0_12px_rgba(110,240,255,0.6)] sm:text-4xl">
                {formatNum(hud.score)}
              </div>
              <div className="font-mono text-xs text-white/50">
                BEST {formatNum(Math.max(hud.best, hud.score))}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/70">Wave</div>
              <div className="font-mono text-3xl font-black leading-none text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,79,216,0.6)] sm:text-4xl">
                {hud.wave}
              </div>
              {hud.multiplier > 1 && (
                <div className="font-mono text-sm font-bold text-yellow-300 drop-shadow-[0_0_10px_rgba(255,221,85,0.8)]">
                  ×{hud.multiplier} · {hud.combo} combo
                </div>
              )}
            </div>
          </div>

          {/* Top-right buttons */}
          <div className="pointer-events-none absolute right-4 top-24 flex flex-col gap-2 sm:right-6 sm:top-28">
            <button
              onClick={togglePause}
              className="pointer-events-auto rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/80 backdrop-blur hover:bg-white/10 active:scale-95"
              aria-label="Pause"
            >
              Pause
            </button>
            <button
              onClick={toggleMute}
              className="pointer-events-auto rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/80 backdrop-blur hover:bg-white/10 active:scale-95"
              aria-label="Toggle sound"
            >
              {muted ? "Sound Off" : "Sound On"}
            </button>
          </div>

          {/* Mobile hint */}
          <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-white/40 sm:hidden">
            Drag to move · Ship auto-fires at your touch
          </div>
        </>
      )}

      {/* START SCREEN */}
      {gameState === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/40 via-black/20 to-black/60 p-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.5em] text-cyan-300/70">Arena Shooter</div>
              <h1 className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400 bg-clip-text text-6xl font-black tracking-tight text-transparent sm:text-7xl drop-shadow-[0_0_30px_rgba(110,240,255,0.3)]">
                NEON
                <br />
                BLASTER
              </h1>
              <p className="mx-auto max-w-xs text-sm text-white/60">
                Shatter asteroids. Build combos. Survive the wave.
              </p>
            </div>

            <button
              onClick={start}
              className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-10 py-4 text-lg font-black uppercase tracking-[0.2em] text-black shadow-[0_0_40px_rgba(255,79,216,0.6)] transition hover:scale-105 active:scale-95"
            >
              <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 blur-xl opacity-60" />
              Start
            </button>

            <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-1 font-bold text-cyan-300">⌨️ Desktop</div>
                <div>WASD / Arrows · move</div>
                <div>Mouse · aim</div>
                <div>Any key · auto-fire</div>
                <div>P / Esc · pause</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-1 font-bold text-fuchsia-300">📱 Touch</div>
                <div>Drag · move</div>
                <div>Ship aims at finger</div>
                <div>Auto-fires while touching</div>
                <div>Tap Pause (top-right)</div>
              </div>
            </div>

            {highScores.length > 0 && <HighScoreTable scores={highScores} best={hud.best} />}
          </div>
        </div>
      )}

      {/* PAUSE */}
      {gameState === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-6 text-center">
            <h2 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(110,240,255,0.5)]">
              PAUSED
            </h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={resume}
                className="rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300 px-8 py-3 text-base font-black uppercase tracking-[0.2em] text-black shadow-[0_0_30px_rgba(110,240,255,0.5)] transition hover:scale-105 active:scale-95"
              >
                Resume
              </button>
              <button
                onClick={start}
                className="rounded-full border border-white/20 bg-white/5 px-8 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/10 active:scale-95"
              >
                Restart
              </button>
            </div>
            <div className="text-xs text-white/40">Press P or Esc to resume</div>
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-5 text-center">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.5em] text-fuchsia-300/80">Run complete</div>
              <h2 className="bg-gradient-to-r from-fuchsia-400 via-pink-300 to-yellow-300 bg-clip-text text-5xl font-black tracking-tight text-transparent drop-shadow-[0_0_30px_rgba(255,79,216,0.5)] sm:text-6xl">
                GAME OVER
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <Stat label="Score" value={formatNum(hud.score)} color="text-cyan-300" />
              <Stat label="Wave" value={`${hud.wave}`} color="text-fuchsia-300" />
              <Stat label="Best ×" value={`${Math.max(1, ...highScores.map((s) => s.score)).toLocaleString()}`} color="text-yellow-300" alt={formatNum(hud.best)} />
            </div>

            <button
              onClick={start}
              className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-10 py-3 text-base font-black uppercase tracking-[0.2em] text-black shadow-[0_0_40px_rgba(255,79,216,0.6)] transition hover:scale-105 active:scale-95"
            >
              <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 blur-xl opacity-60" />
              Play Again
            </button>

            <SharePanel score={hud.score} wave={hud.wave} best={hud.best} />

            <HighScoreTable scores={highScores} best={hud.best} highlightLatest />
          </div>
        </div>
      )}

      {/* Corner brand */}
      <div className="pointer-events-none absolute bottom-3 left-4 text-[10px] uppercase tracking-[0.3em] text-white/30">
        v1.0 · Neon Blaster
      </div>
      {gameState === "menu" && (
        <a
          href="/admin/login"
          className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.24em] text-white/25 transition hover:text-cyan-200"
        >
          Admin
        </a>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  alt,
}: {
  label: string;
  value: string;
  color: string;
  alt?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="text-[9px] uppercase tracking-widest text-white/50">{label}</div>
      <div className={`font-mono text-xl font-black ${color}`}>{alt ?? value}</div>
    </div>
  );
}

function SharePanel({
  score,
  wave,
  best,
}: {
  score: number;
  wave: number;
  best: number;
}) {
  const [copied, setCopied] = useState(false);

  const card = `🎮 NEON BLASTER
💥 Score: ${score.toLocaleString()}
🌊 Wave: ${wave}
🔥 Personal Best: ${best.toLocaleString()}

Think you can beat me? Play Neon Blaster! 🚀`;

  const tweetText = encodeURIComponent(
    `💥 I just scored ${score.toLocaleString()} on Wave ${wave} in Neon Blaster! 🎮 🔥 Beat that? #NeonBlaster #IndieGame`,
  );
  const tweetUrl = encodeURIComponent(window.location.href);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(card);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = card;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/50">
        Share your run publicly
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={copy}
          className="flex-1 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200 transition hover:bg-cyan-400/20 active:scale-95"
        >
          {copied ? "✓ Copied!" : "📋 Copy Score"}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-full border border-sky-300/40 bg-sky-400/10 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-sky-200 transition hover:bg-sky-400/20 active:scale-95"
        >
          🐦 Tweet It
        </a>
      </div>
      <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 text-left font-mono text-[11px] leading-relaxed text-white/80">
        {card}
      </pre>
    </div>
  );
}

function HighScoreTable({
  scores,
  best,
  highlightLatest,
}: {
  scores: HighScore[];
  best: number;
  highlightLatest?: boolean;
}) {
  if (scores.length === 0) return null;
  const latest = scores.reduce((acc, s, i) => (acc === -1 || s.date > scores[acc].date ? i : acc), -1);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-300/80">High Scores</div>
        <div className="text-[10px] text-white/40">Best {best.toLocaleString()}</div>
      </div>
      <ul className="space-y-1 font-mono text-sm">
        {scores.slice(0, 8).map((s, i) => {
          const isLatest = highlightLatest && i === latest;
          return (
            <li
              key={`${s.date}-${i}`}
              className={`flex items-center justify-between rounded px-2 py-1 ${
                isLatest ? "bg-yellow-300/10 text-yellow-200" : "text-white/80"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-4 text-white/40">{i + 1}</span>
                <span>· WAVE {s.wave}</span>
              </span>
              <span className={isLatest ? "font-bold" : ""}>{s.score.toLocaleString()}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
