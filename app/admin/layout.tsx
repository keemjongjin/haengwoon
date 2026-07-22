import { AdminGate } from "@/components/admin/AdminGate";
import { AdminToastProvider } from "@/components/admin/AdminToastContext";

export const metadata = { title: "Admin — Haengwoon" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminToastProvider>
      <div>
        <h1 className="mb-6 text-2xl font-semibold">🔒 Admin</h1>
        <AdminGate>{children}</AdminGate>
      </div>
    </AdminToastProvider>
  );
}
