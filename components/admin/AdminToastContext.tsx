"use client";

// 관리자 페이지 전용 토스트 시스템. app/admin/layout.tsx가 AdminToastProvider로 감싸고,
// 그 하위 모든 관리자 컴포넌트가 useAdminToast()로 접근한다.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; type: "error" | "success" };

type AdminToastContextValue = {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
};

const AdminToastContext = createContext<AdminToastContextValue | null>(null);

// 관리자 액션 실패/성공 알림. res.ok만 체크하고 조용히 아무 반응 없던 문제 개선용 —
// 세션 만료(401)나 네트워크 오류가 나도 이제 화면에 표시됨.
export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: "error" | "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const showError = useCallback((m: string) => push(m, "error"), [push]);
  const showSuccess = useCallback((m: string) => push(m, "success"), [push]);

  return (
    <AdminToastContext.Provider value={{ showError, showSuccess }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "pointer-events-auto rounded-full px-4 py-2 text-sm font-medium shadow-lg " +
              (t.type === "error" ? "bg-red-600 text-white" : "bg-acc text-on-acc")
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </AdminToastContext.Provider>
  );
}

/** AdminToastProvider 하위에서 성공/실패 토스트를 띄우는 훅. Provider 밖에서 쓰면 즉시 에러. */
export function useAdminToast() {
  const ctx = useContext(AdminToastContext);
  if (!ctx) throw new Error("useAdminToast must be used within AdminToastProvider");
  return ctx;
}

/** 실패 응답에서 사람이 읽을 메시지 추출 — 서버가 error를 안 주면 상태코드 기반 기본 메시지 */
export async function describeFailure(res: Response): Promise<string> {
  if (res.status === 401) return "로그인이 만료됐어요. 다시 로그인해주세요.";
  const data = await res.json().catch(() => null);
  if (data?.error) return `실패했어요: ${data.error}`;
  return `실패했어요 (${res.status})`;
}
