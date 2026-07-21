import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Neon(PostgreSQL) 연결. DATABASE_URL 미설정 시 사용 시점에 에러.
const url = process.env.DATABASE_URL;

export const db = url
  ? drizzle(neon(url), { schema })
  : (null as unknown as ReturnType<typeof drizzle>);

export { schema };
