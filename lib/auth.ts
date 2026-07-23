import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// 관리자 단일 패스워드(ADMIN_KEY) → JWT. PLAN.md §5.2 / DECISIONS.log.
// 배포 환경(NODE_ENV=production)에서 JWT_SECRET 누락 시 fail-fast —
// 조용히 알려진 기본값으로 서명하면 누구나 admin JWT를 위조할 수 있음.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET 환경변수가 설정되지 않았습니다. 배포 환경에서는 필수입니다.");
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
export const AUTH_COOKIE = "admin_token";

export function checkAdminKey(key: string): boolean {
  return Boolean(process.env.ADMIN_KEY) && key === process.env.ADMIN_KEY;
}

export async function issueToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** 서버 컴포넌트/라우트에서 현재 요청이 관리자인지 확인 */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(AUTH_COOKIE)?.value);
}
