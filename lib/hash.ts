import { createHash } from "node:crypto";

// 익명 댓글 삭제용 비밀번호 해시 (개발 단계 단순 해시).
export function hashPassword(pw: string): string {
  return createHash("sha256").update(`haengwoon:${pw}`).digest("hex");
}
