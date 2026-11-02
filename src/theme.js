const key = 'pixel-lab-theme';

// Only the document theme changes; the three labs retain their existing DOM and state.
export function initTheme(root, storage) {
  const button = root.querySelector('#theme-toggle');
  let theme = 'standard';
  try { if (storage?.getItem(key) === 'cyber') theme = 'cyber'; } catch { /* Private browsing may block storage. */ }
  const render = () => {
    if (theme === 'cyber') root.documentElement.dataset.theme = 'cyber';
    else delete root.documentElement.dataset.theme;
    button.textContent = theme === 'cyber' ? 'Standard theme' : 'Cyber theme';
    // The label names the theme it switches to, so no pressed state is exposed.
    button.setAttribute('aria-label', button.textContent);
  };
  render();
  button.addEventListener('click', () => {
    theme = theme === 'cyber' ? 'standard' : 'cyber';
    render();
    try { storage?.setItem(key, theme); } catch { /* Still usable without persistence. */ }
  });
}
