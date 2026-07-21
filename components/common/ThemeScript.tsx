// 페인트 전에 data-mode(경로 기반) / data-theme(localStorage) 를 지정해 깜빡임(FOUC) 방지.
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
