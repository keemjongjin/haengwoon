"use client";

import { useState } from "react";
import { useAdminToast, describeFailure } from "./AdminToastContext";

export function PostVisibilityToggle({ slug, initialHidden }: { slug: string; initialHidden: boolean }) {
  const { showError } = useAdminToast();
  const [hidden, setHidden] = useState(initialHidden);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !hidden;
    const res = await fetch("/api/admin/posts/visibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, hidden: next }),
    });
    if (res.ok) {
      setHidden(next);
    } else {
      showError(await describeFailure(res));
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={
        "rounded-full border px-3 py-1 text-xs disabled:opacity-50 " +
        (hidden ? "border-line text-mut hover:border-acc" : "border-acc text-acc")
      }
    >
      {hidden ? "숨김" : "공개"}
    </button>
  );
}
