import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Neon(PostgreSQL) 연결. DATABASE_URL 미설정 시 사용 시점에 에러.
const url = process.env.DATABASE_URL;

/**
 * Drizzle 클라이언트. DATABASE_URL이 없으면 null을 강제 캐스팅해 넣어두는데, 실제로 이 값을
 * 쓰는 건 항상 repo.ts의 requireDb()를 거쳐서라 그쪽에서 "DATABASE_URL이 설정되지 않았습니다"
 * 에러로 먼저 걸러진다 — 여기서 타입만 맞춰두고 런타임 null 체크는 repo.ts에 위임.
 */
export const db = url
  ? drizzle(neon(url), { schema })
  : (null as unknown as ReturnType<typeof drizzle>);

export { schema };
