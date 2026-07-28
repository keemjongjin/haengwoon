/**
 * app/layout.tsx의 `<head>`에 인라인 스크립트로 삽입 — 페인트 전에 data-mode(경로 기반) /
 * data-theme(localStorage)를 지정해 깜빡임(FOUC)을 방지한다. React 렌더보다 먼저 실행돼야
 * 의미가 있어서 일반 컴포넌트가 아니라 dangerouslySetInnerHTML로 직접 스크립트를 심는다.
 */
export function ThemeScript() {
  const code = `
    (function () {
      try {
        var p = location.pathname;
        var mode = p === '/music' || p.indexOf('/music/') === 0 ? 'music' : 'tech';
        var theme = localStorage.getItem('theme') || 'light';
        var el = document.documentElement;
        el.dataset.mode = mode;
        el.dataset.theme = theme;
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
