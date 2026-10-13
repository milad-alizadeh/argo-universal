type FadedEdges = { top: boolean; bottom: boolean };

// Which edges of a web scroll view fade its content now: the depth its scroll-driven mask gives each edge.
export function fadedEdges(scroll: HTMLElement): FadedEdges {
  const style = getComputedStyle(scroll);

  const fades = (edge: 'top' | 'bottom'): boolean =>
    Number.parseFloat(style.getPropertyValue(`--scroll-fade-${edge}`)) > 0;

  return { top: fades('top'), bottom: fades('bottom') };
}
