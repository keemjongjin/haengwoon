import { Comments } from "@/components/features/Comments";

export const metadata = { title: "Guestbook — Haengwoon" };

// 방명록. GitHub Discussions(Giscus) 고정 스레드 재사용 — 모든 방문자가 같은 곳에 남김.
export default function GuestbookPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Guestbook</h1>
      <p className="mt-2 text-sm text-mut">
        지나가다 한마디 남겨주세요. GitHub 계정으로 남길 수 있어요.
      </p>
      <div className="mt-8">
        <Comments term="guestbook" />
      </div>
    </div>
  );
}
