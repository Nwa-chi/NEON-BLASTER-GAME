import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const EMAIL_HEADER = "oai-authenticated-user-email";
const NAME_HEADER = "oai-authenticated-user-full-name";
const NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";
// Server-only SHA-256 allowlist. This keeps administrator addresses out of
// the public repository while remaining reliable in runtimes that do not
// expose hosted environment bindings through process.env.
const ADMIN_EMAIL_HASHES = new Set([
  "8b80d5b37488ddab57acb5e31f78120a9c42af85f41e086a64cfdb6a87b63621",
]);

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get(EMAIL_HEADER);
  if (!email) return null;

  const encodedName = requestHeaders.get(NAME_HEADER);
  let fullName: string | null = null;
  if (encodedName && requestHeaders.get(NAME_ENCODING_HEADER) === "percent-encoded-utf-8") {
    try { fullName = decodeURIComponent(encodedName); } catch { fullName = null; }
  }

  return { email, fullName, displayName: fullName ?? email };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(`/signin-with-chatgpt?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`);
}

export function isAuthorizedAdmin(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const emailHash = createHash("sha256").update(normalizedEmail).digest("hex");
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return ADMIN_EMAIL_HASHES.has(emailHash) || allowed.includes(normalizedEmail);
}

export function signOutPath(returnTo = "/admin/login") {
  return `/signout-with-chatgpt?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
