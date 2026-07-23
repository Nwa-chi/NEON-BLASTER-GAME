import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const EMAIL_HEADER = "oai-authenticated-user-email";
const NAME_HEADER = "oai-authenticated-user-full-name";
const NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";

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
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export function signOutPath(returnTo = "/admin/login") {
  return `/signout-with-chatgpt?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
