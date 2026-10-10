import { render } from 'preact';
import { App } from './ui/App';
import './styles.css';

render(<App />, document.getElementById('app')!);

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !import.meta.env.DEV) {
  // New versions: the SW installs in the background, skips waiting and claims clients;
  // the page then reloads once so the next open always runs the newest build.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    }).catch(() => {});
  });
}
