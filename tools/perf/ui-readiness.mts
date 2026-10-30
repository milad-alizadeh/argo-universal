export type UiReadiness =
  | { kind: 'feed'; text: string }
  | { kind: 'scroll'; testId: string; from: number }
  | { kind: 'older-page'; testId: string; height: number }
  | { kind: 'expanded'; contentId: string }
  | { kind: 'input'; text: string }
  // `text` shown inside the element `selector` names, and in the reading area.
  | { kind: 'text'; selector: string; text: string }
  // The Sessions list narrowed to the query: a title it matches is drawn and one it does not match is gone.
  | { kind: 'search'; included: string; excluded: string };

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);

  if (!element) throw new Error('UI readiness element is not drawn yet');

  return element;
}

function testElement(id: string): HTMLElement {
  return requiredElement(`[data-testid="${id}"]`);
}

function messageInput(): HTMLElement {
  return requiredElement('[role="textbox"][aria-label="Message"]');
}

function usableInput(): boolean {
  const input = messageInput();

  return (
    input.getBoundingClientRect().height > 0 &&
    input.getAttribute('aria-disabled') !== 'true'
  );
}

function textParent(container: HTMLElement, text: string): HTMLElement | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (String(node.textContent).includes(text)) return node.parentElement;
    node = walker.nextNode();
  }

  return null;
}

function inReadingArea(box: DOMRect, viewport: DOMRect): boolean {
  return (
    box.bottom > Math.max(viewport.top, 0) &&
    box.top < Math.min(viewport.bottom, innerHeight)
  );
}

function visibleText(container: HTMLElement, text: string): HTMLElement | null {
  const element = textParent(container, text);

  if (!element) return null;

  return inReadingArea(
    element.getBoundingClientRect(),
    container.getBoundingClientRect(),
  )
    ? element
    : null;
}

function feedReady(
  readiness: Extract<UiReadiness, { kind: 'feed' }>,
): HTMLElement | null {
  if (!usableInput()) return null;

  return visibleText(testElement('feed-scroll'), readiness.text);
}

function scrollReady(
  readiness: Extract<UiReadiness, { kind: 'scroll' }>,
): HTMLElement | null {
  const list = testElement(readiness.testId);

  if (!String(list.textContent).trim()) return null;

  return Math.abs(list.scrollTop - readiness.from) > 1 ? list : null;
}

function pageReady(
  readiness: Extract<UiReadiness, { kind: 'older-page' }>,
): HTMLElement | null {
  const feed = testElement(readiness.testId);

  const loading = document.querySelector(
    '[role="progressbar"][aria-label="Loading earlier"]',
  );

  return feed.scrollHeight > readiness.height + 1 && !loading ? feed : null;
}

function textReady(
  readiness: Extract<UiReadiness, { kind: 'text' }>,
): HTMLElement | null {
  return visibleText(requiredElement(readiness.selector), readiness.text);
}

function searchReady(
  readiness: Extract<UiReadiness, { kind: 'search' }>,
): HTMLElement | null {
  const list = testElement('sessions-scroll');

  if (textParent(list, readiness.excluded)) return null;

  return textParent(list, readiness.included);
}

function detailReady(
  readiness: Exclude<UiReadiness, { kind: 'feed' | 'scroll' }>,
): HTMLElement | null {
  if (readiness.kind === 'text') return textReady(readiness);

  if (readiness.kind === 'search') return searchReady(readiness);

  return contentReady(readiness);
}

function contentReady(
  readiness: Exclude<
    UiReadiness,
    { kind: 'feed' | 'scroll' | 'text' | 'search' }
  >,
): HTMLElement | null {
  if (readiness.kind === 'older-page') return pageReady(readiness);

  if (readiness.kind === 'expanded')
    return document.getElementById(readiness.contentId);

  return inputReady(readiness);
}

function inputReady(
  readiness: Extract<UiReadiness, { kind: 'input' }>,
): HTMLElement | null {
  const input = messageInput();

  return input.textContent === readiness.text ? input : null;
}

function readyElement(readiness: UiReadiness): HTMLElement | null {
  if (readiness.kind === 'feed') return feedReady(readiness);

  if (readiness.kind === 'scroll') return scrollReady(readiness);

  return detailReady(readiness);
}

function readyGeometry(readiness: UiReadiness): string {
  try {
    const element = readyElement(readiness);

    return element ? visibleGeometry(element) : '';
  } catch {
    return '';
  }
}

function visibleGeometry(element: HTMLElement): string {
  const box = element.getBoundingClientRect();

  if (box.height <= 0 || getComputedStyle(element).visibility === 'hidden')
    return '';

  return `${box.x},${box.y},${box.width},${box.height}`;
}

export const readinessScript = [
  requiredElement,
  testElement,
  messageInput,
  usableInput,
  feedReady,
  textParent,
  inReadingArea,
  visibleText,
  scrollReady,
  pageReady,
  textReady,
  searchReady,
  detailReady,
  contentReady,
  inputReady,
  readyElement,
  readyGeometry,
  visibleGeometry,
]
  .map(String)
  .join('\n');
