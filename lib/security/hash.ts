import { createHash } from "node:crypto";

// 익명 댓글 삭제용 비밀번호 해시 (개발 단계 단순 해시).
/** 댓글 작성 시 입력한 삭제용 비밀번호를 해시해 DB(comments.passwordHash)에 저장할 값으로 변환. */
export function hashPassword(pw: string): string {
  return createHash("sha256").update(`haengwoon:${pw}`).digest("hex");
}
