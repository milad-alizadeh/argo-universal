type FadedEdges = { top: boolean; bottom: boolean };

// Which edges of a web scroll view fade its content now: the depth its scroll-driven mask gives each edge.
export function fadedEdges(scroll: HTMLElement): FadedEdges {
  const style = getComputedStyle(scroll);

  const fades = (edge: 'top' | 'bottom'): boolean =>
    Number.parseFloat(style.getPropertyValue(`--scroll-fade-${edge}`)) > 0;

  return { top: fades('top'), bottom: fades('bottom') };
}

type FadedInlineEdges = { leading: boolean; trailing: boolean };

// Which edges of a horizontal web scroll view fade its content now.
export function fadedInlineEdges(scroll: HTMLElement): FadedInlineEdges {
  const style = getComputedStyle(scroll);

  const fades = (edge: 'leading' | 'trailing'): boolean =>
    Number.parseFloat(style.getPropertyValue(`--scroll-fade-${edge}`)) > 0;

  return { leading: fades('leading'), trailing: fades('trailing') };
}

const length = (style: CSSStyleDeclaration, name: string): number =>
  Number.parseFloat(style.getPropertyValue(name)) || 0;

// Where a web scroll view's bottom fade begins on screen: content below it is faded, or hidden under what covers the edge.
export function bottomFadeStart(scroll: HTMLElement): number {
  const style = getComputedStyle(scroll);

  const covered =
    length(style, '--scroll-fade-bottom') +
    length(style, '--scroll-fade-bottom-inset');

  return scroll.getBoundingClientRect().bottom - covered;
}
