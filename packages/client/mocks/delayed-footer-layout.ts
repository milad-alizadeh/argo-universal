let delayedLayouts = 0;
let active = false;
const timers = new Set<ReturnType<typeof setTimeout>>();

export function getDelayedFooterLayouts() {
  return delayedLayouts;
}

export function installFooterLayoutDelay() {
  const OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        const delayed = entries.filter(
          ({ target, contentRect }) =>
            active &&
            contentRect.height === 96 &&
            target.querySelector('[role="progressbar"]'),
        );
        callback(
          entries.filter((entry) => !delayed.includes(entry)),
          observer,
        );
        if (delayed.length > 0) {
          delayedLayouts += delayed.length;
          const timer = setTimeout(() => {
            timers.delete(timer);
            if (active) callback(delayed, observer);
          }, 1200);
          timers.add(timer);
        }
      });
    }
  };
  return () => {
    window.ResizeObserver = OriginalResizeObserver;
  };
}

export function delayFooterLayout() {
  delayedLayouts = 0;
  active = true;
  return () => {
    active = false;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  };
}
