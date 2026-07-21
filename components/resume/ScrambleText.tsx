"use client";

import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}=+*^?#";

// 텍스트가 무작위 문자에서 실제 문자로 "디코딩"되는 효과.
export function ScrambleText({
  text,
  className,
  duration = 900,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(text);
  const frame = useRef(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(progress * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealed || text[i] === " ") out += text[i];
        else out += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setDisplay(out);
      frame.current++;
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDisplay(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration]);

  return (
    <span className={className} aria-label={text}>
      {display}
    </span>
  );
}
