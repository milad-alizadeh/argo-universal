import { ipcRenderer, webFrame } from 'electron';
import {
  createSidebarGlassReporter,
  type SidebarFrame,
} from '../sidebar-glass-frame';

const panelSelector = '[data-sidebar-glass-panel]';

const activePanel = '[data-sidebar-glass-panel="native"]';

// The native view sits behind Chromium. Only the backgrounds above that view need to clear.
const sidebarCss = `
  :is(body, #root, #root *):has(${activePanel}) { background-color: transparent !important; }
  html:has(${activePanel}) {
    --page-fill: linear-gradient(var(--color-content) 0 0);
    background:
      var(--page-fill) left / var(--sidebar-left) 100% no-repeat,
      var(--page-fill) right / calc(100% - var(--sidebar-right)) 100% no-repeat,
      var(--page-fill) top / 100% var(--sidebar-top) no-repeat,
      var(--page-fill) bottom / 100% var(--sidebar-bottom) no-repeat !important;
  }
  ${activePanel} > [data-sidebar-glass-fill] {
    background: transparent !important;
    backdrop-filter: none !important;
  }
  ${activePanel} + [data-sidebar-glass-edge] { visibility: hidden !important; }
`;

export function bindSidebarGlass(): void {
  webFrame.insertCSS(sidebarCss, { cssOrigin: 'user' });
  watchPanel();
}

function applyFrame(frame: SidebarFrame): void {
  const zoom = webFrame.getZoomFactor();
  const { style } = document.documentElement;

  style.setProperty('--sidebar-left', `${frame.x / zoom}px`);
  style.setProperty('--sidebar-right', `${(frame.x + frame.width) / zoom}px`);
  style.setProperty('--sidebar-top', `${frame.top / zoom}px`);
  style.setProperty('--sidebar-bottom', `${frame.bottom / zoom}px`);
  ipcRenderer.send('window:sidebar-glass-frame', frame);
}

function watchPanel(): void {
  const report = createSidebarGlassReporter(applyFrame);

  let panel: Element | null = null;
  let scheduled = false;

  function update(): void {
    scheduled = false;

    const next = document.querySelector(panelSelector);

    if (panel !== next) {
      if (panel) observer.unobserve(panel);
      panel = next;

      if (panel) observer.observe(panel);
    }

    const rect = panel?.getBoundingClientRect();

    if (panel)
      panel.setAttribute(
        'data-sidebar-glass-panel',
        rect && rect.width > 0 && rect.height > 0 ? 'native' : '',
      );

    report(rect, window.innerHeight, webFrame.getZoomFactor());
  }

  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  const observer = new ResizeObserver(schedule);
  observer.observe(document.documentElement);
  new MutationObserver(schedule).observe(document.body, {
    subtree: true,
    childList: true,
  });
  window.addEventListener('resize', schedule);
  schedule();
}
