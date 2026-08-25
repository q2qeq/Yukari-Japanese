import crypto from "crypto";

// 세션 저장용 테이블 없이, 서명된 쿠키 하나로 로그인 상태를 유지합니다.
// staff.id / name / role을 담고, HMAC-SHA256 서명으로 위변조를 막습니다.

const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  throw new Error("SESSION_SECRET이 설정되지 않았습니다 (.env.local 확인)");
}

export type SessionPayload = {
  staffId: string;
  name: string;
  role: "owner" | "teacher";
  exp: number;
};

function sign(json: Buffer): Buffer {
  return crypto.createHmac("sha256", SECRET as string).update(json).digest();
}

export function signSession(
  payload: Omit<SessionPayload, "exp">,
  ttlSeconds = 60 * 60 * 24 * 30,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const json = Buffer.from(JSON.stringify({ ...payload, exp }));
  const sig = sign(json);
  return `${json.toString("base64url")}.${sig.toString("base64url")}`;
}

export function verifySession(
  token: string | undefined | null,
): SessionPayload | null {
  if (!token) return null;
  const [dataB64, sigB64] = token.split(".");
  if (!dataB64 || !sigB64) return null;

  const json = Buffer.from(dataB64, "base64url");
  const expected = sign(json);
  const got = Buffer.from(sigB64, "base64url");
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) {
    return null;
  }

  try {
    const payload = JSON.parse(json.toString()) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
