import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";
import { getAllPosts } from "@/lib/posts";

// GET /api/admin/stats → Overview 대시보드용 요약 통계 (관리자 전용)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const [counts, visits, activity] = await Promise.all([
    repo.getSummaryCounts(),
    repo.getVisitStats(),
    repo.getRecentActivity(5),
  ]);
  // 블로그 글 수는 파일 기반(git)이라 DB 통계와 별도로 합산
  const postsCount = getAllPosts().length;
  return NextResponse.json({ ok: true, counts: { ...counts, posts: postsCount }, visits, activity });
}
