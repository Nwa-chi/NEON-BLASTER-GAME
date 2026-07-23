import Link from "next/link";
import { isAuthorizedAdmin, requireChatGPTUser, signOutPath } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

const systems = [
  { label: "Production game", value: "Online", tone: "cyan" },
  { label: "Admin access", value: "Protected", tone: "green" },
  { label: "Game version", value: "1.0", tone: "fuchsia" },
  { label: "Score storage", value: "Per device", tone: "amber" },
];

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");

  if (!isAuthorizedAdmin(user.email)) {
    return (
      <main className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-[#060711] px-6 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-rose-300/20 bg-white/[.04] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-400/10 text-2xl text-rose-300">×</div>
          <h1 className="mt-6 text-3xl font-black tracking-tight">Access restricted</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">The signed-in account is not on the Neon Blaster administrator allowlist.</p>
          <p className="mt-4 break-all rounded-xl bg-black/30 p-3 text-xs text-white/45">{user.email}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold hover:bg-white/[.06]">Back to game</Link>
            <a href={signOutPath()} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-black hover:bg-white/90">Switch account</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-y-auto bg-[#060711] text-white selection:bg-cyan-300 selection:text-black">
      <div className="min-h-full bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,.09),transparent_30%),radial-gradient(circle_at_100%_100%,rgba(217,70,239,.08),transparent_35%)]">
        <header className="sticky top-0 z-20 border-b border-white/[.07] bg-[#060711]/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-fuchsia-500 text-sm font-black text-black">NB</div>
              <div><div className="font-bold tracking-tight">Neon Blaster</div><div className="text-[10px] uppercase tracking-[.22em] text-white/35">Admin console</div></div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/65 hover:bg-white/[.06] hover:text-white">Open game</Link>
              <a href={signOutPath()} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black hover:bg-white/90">Sign out</a>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
          <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.07] px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" /> All systems normal</div>
              <h1 className="text-3xl font-black tracking-[-.035em] sm:text-4xl">Welcome back, {user.fullName ?? "Administrator"}</h1>
              <p className="mt-2 text-sm text-white/45">Production overview for Neon Blaster.</p>
            </div>
            <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3 text-right"><div className="text-[10px] uppercase tracking-[.16em] text-white/30">Authenticated as</div><div className="mt-1 text-sm font-semibold text-white/75">{user.email}</div></div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {systems.map((item) => <SystemCard key={item.label} {...item} />)}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-white/[.07] bg-white/[.03] p-6">
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Game operations</h2><p className="mt-1 text-sm text-white/40">Current production configuration and player experience.</p></div><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200">Live</span></div>
              <div className="mt-6 divide-y divide-white/[.06]">
                <Row label="Game mode" value="Endless arena survival" />
                <Row label="Primary objective" value="Destroy asteroids and build combos" />
                <Row label="Input support" value="Keyboard, mouse, and touch" />
                <Row label="Audio" value="Synthesized Web Audio effects" />
                <Row label="High scores" value="Stored privately on each player device" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/[.07] bg-gradient-to-b from-fuchsia-400/[.08] to-transparent p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-400/10 text-lg text-fuchsia-200">◎</div>
              <h2 className="mt-5 text-lg font-bold">Player analytics</h2>
              <p className="mt-2 text-sm leading-6 text-white/45">Scores currently remain on each player&apos;s device, so no personal gameplay data is collected.</p>
              <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-xs leading-5 text-white/40">Connect a privacy-friendly analytics service later to measure plays, sessions, and retention.</div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[.07] bg-white/[.03] p-6"><h2 className="text-lg font-bold">Security</h2><div className="mt-5 space-y-3"><Check text="ChatGPT identity required" /><Check text="Administrator email verified server-side" /><Check text="No password stored by Neon Blaster" /><Check text="Unauthorized accounts are denied" /></div></div>
            <div className="rounded-2xl border border-white/[.07] bg-white/[.03] p-6"><h2 className="text-lg font-bold">Quick actions</h2><div className="mt-5 grid gap-3"><Link href="/" className="flex items-center justify-between rounded-xl border border-cyan-300/15 bg-cyan-300/[.06] px-4 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-300/10"><span>Launch production game</span><span aria-hidden="true">↗</span></Link><a href={signOutPath()} className="flex items-center justify-between rounded-xl border border-white/[.08] px-4 py-3 text-sm font-semibold text-white/65 hover:bg-white/[.05]"><span>End admin session</span><span aria-hidden="true">→</span></a></div></div>
          </section>

          <footer className="mt-10 border-t border-white/[.06] py-6 text-center text-xs text-white/25">Neon Blaster Admin · Secure owner access</footer>
        </div>
      </div>
    </main>
  );
}

function SystemCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  const tones: Record<string, string> = { cyan: "text-cyan-200 bg-cyan-300/10", green: "text-emerald-200 bg-emerald-300/10", fuchsia: "text-fuchsia-200 bg-fuchsia-300/10", amber: "text-amber-200 bg-amber-300/10" };
  return <div className="rounded-2xl border border-white/[.07] bg-white/[.03] p-5"><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/35">{label}</div><div className="mt-5 flex items-center justify-between"><div className="text-2xl font-black tracking-tight">{value}</div><span className={`h-2.5 w-2.5 rounded-full ${tones[tone]}`} /></div></div>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex flex-col justify-between gap-1 py-3.5 text-sm sm:flex-row"><span className="text-white/40">{label}</span><span className="font-medium text-white/75 sm:text-right">{value}</span></div>; }
function Check({ text }: { text: string }) { return <div className="flex items-center gap-3 text-sm text-white/60"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/10 text-xs text-emerald-200">✓</span>{text}</div>; }
