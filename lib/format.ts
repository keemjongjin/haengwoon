// 날짜를 YYYY.MM.DD 로 표기 (레퍼런스 jeong-min.com 스타일)
export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

// KST(Asia/Seoul) 기준 오늘 날짜를 YYYY-MM-DD로 반환. 서버가 UTC로 도는 배포 환경(Vercel)에서
// new Date().toISOString()을 쓰면 KST 자정~오전 9시 사이엔 아직 UTC로 전날이라 리뷰일이
// 하루 전으로 잘못 저장되는 문제가 있어 타임존을 명시해서 계산한다.
export function todayKST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}
