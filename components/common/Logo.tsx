// 네잎클로버 사이트 로고. 하트 모양(진짜 클로버 잎 형태) 잎 4장, 줄기 없음.
// currentColor 하나만 쓰는 무채색 SVG — 배경/테마에 맞춰 색이 따라감.
export function Logo({ className, size = 20 }: { className?: string; size?: number }) {
  const petal =
    "M12 12 C9 9.5 7 6.8 7 4.8 C7 3 8.8 2 10.5 2.8 C11.5 3.3 12 4 12 4.8 C12 4 12.5 3.3 13.5 2.8 C15.2 2 17 3 17 4.8 C17 6.8 15 9.5 12 12 Z";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={petal} />
      <path d={petal} transform="rotate(90 12 12)" />
      <path d={petal} transform="rotate(180 12 12)" />
      <path d={petal} transform="rotate(270 12 12)" />
    </svg>
  );
}
