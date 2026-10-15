// A type, not an interface, so it reads as a Web Animations keyframe.
type SlideStyle = { transform: string; opacity: number };

// Content that keeps its width rides on the pane's moving edge and fades as it narrows, so text slides away whole instead of being wiped.
export function slideStyle(width: number, contentWidth: number): SlideStyle {
  const hiddenPart = Math.max(0, contentWidth - width);

  return {
    transform: `translateX(${-hiddenPart}px)`,
    opacity: contentWidth > 0 ? 1 - hiddenPart / contentWidth : 1,
  };
}
