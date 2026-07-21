// 날짜를 YYYY.MM.DD 로 표기 (레퍼런스 jeong-min.com 스타일)
export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
