import postgres from "postgres";

// 개발 중 hot-reload 시 커넥션이 계속 새로 생기는 것을 막기 위한 싱글턴 패턴.
// DATABASE_URL은 지금은 이 세션의 로컬 Postgres를 가리키지만, Supabase
// 프로젝트를 연결하면 그 커넥션 문자열로 바꾸기만 하면 됩니다 (Supabase도
// Postgres이므로 쿼리 코드는 그대로 씁니다).
const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL이 설정되지 않았습니다 (.env.local 확인)");
}

export const sql =
  globalForDb.sql ?? postgres(process.env.DATABASE_URL, { max: 5 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}
