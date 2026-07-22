import { redirect } from "next/navigation";

// 구 경로 호환: 통합 관리자 페이지로 이동.
export default function LegacyMusicAdminPage() {
  redirect("/admin/music");
}
