import Image from "next/image";

// 앨범 커버 플레이스홀더 (실제 coverImageUrl 있으면 그걸 사용, 없으면 색블록).
const HUES = ["#c026d3", "#dc2626", "#1d4ed8", "#0891b2", "#7c3aed", "#ea580c"];

export function Cover({
  id,
  title,
  url,
  size = 56,
  className = "",
}: {
  id: number;
  title: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const hue = HUES[id % HUES.length];
  if (url) {
    return (
      <Image
        src={url}
        alt={title}
        width={size}
        height={size}
        className={"rounded-lg object-cover " + className}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={"flex shrink-0 items-center justify-center rounded-lg font-bold " + className}
      style={{ width: size, height: size, background: `${hue}33`, color: hue, fontSize: size * 0.4 }}
    >
      {title.slice(0, 1)}
    </div>
  );
}
