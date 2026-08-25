import "server-only";
import { cookies } from "next/headers";
import { verifySession, type SessionPayload } from "./session";

export const SESSION_COOKIE = "academy_session";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
