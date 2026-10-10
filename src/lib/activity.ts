// Active-time tracker for lessons.
// Counts time only while the page is visible, and caps idle gaps: if there is no
// interaction for more than IDLE_MS, at most IDLE_MS of that gap is counted.
export const IDLE_MS = 2 * 60 * 1000;

type Listener = () => void;

class ActivityTracker {
  private acc = 0; // ms accumulated and not yet taken
  private segStart = 0;
  private lastInput = 0;
  private running = false;
  private users = 0;
  private hideListeners = new Set<Listener>();
  private bound = false;

  private now() { return Date.now(); }
  private flush(now = this.now()) {
    if (!this.running) return;
    const end = Math.min(now, this.lastInput + IDLE_MS);
    if (end > this.segStart) this.acc += end - this.segStart;
    this.segStart = now;
  }
  private onInput = () => { if (!this.running) return; const n = this.now(); this.flush(n); this.lastInput = n; };
  private onVis = () => {
    if (document.visibilityState === 'hidden') { this.flush(); this.running = false; this.hideListeners.forEach((l) => l()); }
    else if (this.users > 0) this.resume();
  };
  private onHide = () => { this.flush(); this.running = false; this.hideListeners.forEach((l) => l()); };
  private resume() { const n = this.now(); this.running = true; this.segStart = n; this.lastInput = n; }
  private bind() {
    if (this.bound || typeof document === 'undefined') return;
    this.bound = true;
    for (const ev of ['pointerdown', 'keydown', 'input', 'touchstart', 'wheel', 'scroll']) window.addEventListener(ev, this.onInput, { passive: true, capture: true });
    document.addEventListener('visibilitychange', this.onVis);
    window.addEventListener('pagehide', this.onHide);
  }
  /** Start counting (ref-counted). */
  start() { this.bind(); this.users++; if (this.users === 1 && document.visibilityState !== 'hidden') this.resume(); }
  stop() { this.users = Math.max(0, this.users - 1); if (!this.users) { this.flush(); this.running = false; } }
  /** Active seconds since the last take() (fractional). */
  take(): number { this.flush(); const s = this.acc / 1000; this.acc = 0; return s; }
  peek(): number { this.flush(); return this.acc / 1000; }
  /** Called when the page is hidden/closed – persist pending time there. */
  onHidden(l: Listener) { this.hideListeners.add(l); return () => { this.hideListeners.delete(l); }; }
}

export const activity = new ActivityTracker();
(globalThis as any).__doucovaniActivity = activity; // for tests
