import Link from "next/link";

export const metadata = { title: "About — Haengwoon" };

export default function AboutPage() {
  return (
    <div className="article">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>

      <p>
        안녕하세요, <strong>jongjin</strong>입니다. 프론트엔드를 좋아하고, 좋은 음악을
        아카이빙하는 개발자예요. 이 사이트는 기술 글과 음악 기록을 한 곳에 담되, 서로 섞이지
        않도록 <strong>Tech</strong>와 <strong>Music</strong> 두 세계로 나눠 두었습니다.
      </p>

      <h2>관심사</h2>
      <ul>
        <li>타입 안전하고 단순한 프론트엔드 아키텍처</li>
        <li>운영비를 최소화하는 서버리스 설계</li>
        <li>인디 록과 앰비언트, 그리고 인생 명반 발굴</li>
      </ul>

      <h2>이 사이트</h2>
      <p>
        Next.js와 TypeScript로 직접 만들었습니다. 기술 글은 마크다운으로, 음악 기록은
        데이터베이스로 관리해요. 자세한 이야기는 <Link href="/posts">Posts</Link>와{" "}
        <Link href="/projects">Projects</Link>에서 볼 수 있습니다.
      </p>
    </div>
  );
}
