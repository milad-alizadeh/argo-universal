export interface SidebarFrame {
  x: number;
  width: number;
  top: number;
  bottom: number;
}

type SidebarRect = Pick<
  DOMRectReadOnly,
  'left' | 'width' | 'height' | 'top' | 'bottom'
>;

export const hiddenSidebarFrame: SidebarFrame = {
  x: 0,
  width: 0,
  top: 0,
  bottom: 0,
};

export function createSidebarGlassReporter(
  send: (frame: SidebarFrame) => void,
) {
  let previous: SidebarFrame | undefined;

  return (
    rect: SidebarRect | undefined,
    viewportHeight: number,
    zoom: number,
  ): void => {
    const frame =
      rect && rect.width > 0 && rect.height > 0
        ? {
            x: rect.left * zoom,
            width: rect.width * zoom,
            top: rect.top * zoom,
            bottom: Math.max(0, (viewportHeight - rect.bottom) * zoom),
          }
        : hiddenSidebarFrame;

    if (
      previous?.x === frame.x &&
      previous.width === frame.width &&
      previous.top === frame.top &&
      previous.bottom === frame.bottom
    )
      return;

    previous = frame;
    send(frame);
  };
}
