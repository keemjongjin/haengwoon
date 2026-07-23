import Link from "next/link";

export const metadata = { title: "About — Haengwoon" };

export default function AboutPage() {
  return (
    <div className="article">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>

      <p>
        안녕하세요, <strong>keemj2</strong>입니다. 개발을 좋아하고, 좋은 음악을
        아카이빙하는 개발자예요. 이 사이트는 기술 글과 음악 기록을 한 곳에 담되,
        서로 섞이지 않도록 <strong>Tech</strong>와 <strong>Music</strong> 두
        세계로 나눠 두었습니다.
      </p>

      <h2>관심사</h2>
      <ul>
        <li>-</li>
        <li>-</li>
        <li>-</li>
      </ul>
    </div>
  );
}
