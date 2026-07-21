import { AdminPanel } from "@/components/music/AdminPanel";

export const metadata = { title: "Admin — Haengwoon" };

export default function AdminPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">🔒 Admin</h1>
      <AdminPanel />
    </div>
  );
}
