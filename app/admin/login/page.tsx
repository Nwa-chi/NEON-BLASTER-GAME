import Link from "next/link";
import { redirect } from "next/navigation";
import { getChatGPTUser, isAuthorizedAdmin, signOutPath } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getChatGPTUser();
  if (user && isAuthorizedAdmin(user.email)) redirect("/admin");

  return (
    <main className="fixed inset-0 overflow-y-auto bg-[#060711] text-white selection:bg-cyan-300 selection:text-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,.14),transparent_34%),radial-gradient(circle_at_90%_80%,rgba(217,70,239,.12),transparent_36%)]" />
      <div className="relative mx-auto flex min-h-full max-w-6xl items-center justify-center px-6 py-12">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.035] shadow-2xl shadow-black/50 backdrop-blur-xl lg:grid-cols-[1.05fr_.95fr]">
          <div className="border-b border-white/10 p-8 sm:p-12 lg:border-b-0 lg:border-r">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-cyan-300/80 hover:text-cyan-200">
              <span aria-hidden="true">←</span> Neon Blaster
            </Link>
            <div className="mt-16 max-w-md">
              <div className="mb-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.2em] text-cyan-200">
                Secure operations
              </div>
              <h1 className="text-4xl font-black tracking-[-.04em] sm:text-5xl">Admin command center</h1>
              <p className="mt-5 text-base leading-7 text-white/55">
                Review the live game, release health, gameplay systems, and administrator access from one protected workspace.
              </p>
              <div className="mt-10 grid gap-3 text-sm text-white/65 sm:grid-cols-2">
                <Feature href="/admin" label="Protected route" detail="Open admin console" />
                <Feature href="#sign-in" label="Owner access" detail="Review signed-in account" />
                <Feature href="/admin" label="Live status" detail="View production overview" />
                <Feature href="/" label="Fast handoff" detail="Return to the game" />
              </div>
            </div>
          </div>

          <div id="sign-in" className="flex scroll-mt-8 items-center p-8 sm:p-12">
            <div className="w-full">
              <div className="mb-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-fuchsia-500 text-xl font-black text-black shadow-lg shadow-cyan-500/20">NB</div>
                <h2 className="text-2xl font-bold tracking-tight">Administrator sign in</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">Use the ChatGPT account assigned to Neon Blaster administration.</p>
              </div>

              {user ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[.07] p-4">
                    <p className="text-sm font-semibold text-amber-200">This account is not authorized.</p>
                    <p className="mt-1 break-all text-xs text-white/50">Signed in as {user.email}</p>
                  </div>
                  <a href={signOutPath()} className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/[.06] px-5 py-3.5 text-sm font-bold transition hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Sign out and use another account</a>
                </div>
              ) : (
                <a href="/signin-with-chatgpt?return_to=%2Fadmin" className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-black text-black shadow-lg shadow-white/10 transition hover:scale-[1.01] active:scale-[.99]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] text-white">AI</span>
                  Continue with ChatGPT
                </a>
              )}

              <div className="mt-6 flex items-center gap-3 text-[11px] uppercase tracking-[.16em] text-white/30">
                <span className="h-px flex-1 bg-white/10" /> Identity checked server-side <span className="h-px flex-1 bg-white/10" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link
      href={href}
      aria-label={`${label}: ${detail}`}
      className="group cursor-pointer rounded-xl border border-white/[.07] bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-300/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
    >
      <div className="flex items-center justify-between gap-3 font-semibold text-white/85">
        <span>{label}</span>
        <span aria-hidden="true" className="text-cyan-200/40 transition group-hover:translate-x-0.5 group-hover:text-cyan-200">→</span>
      </div>
      <div className="mt-1 text-xs text-white/35 transition group-hover:text-white/55">{detail}</div>
    </Link>
  );
}
