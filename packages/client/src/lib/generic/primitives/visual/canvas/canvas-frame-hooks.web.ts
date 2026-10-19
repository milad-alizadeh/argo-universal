import { useEffect, useState } from 'react';
import { zoomCamera } from './canvas-camera';
import { localPoint } from './canvas-frame-events.web';
import type { CanvasFrameProps } from './canvas-props';

const wheelRate = 0.002;

function observeSize(
  host: HTMLDivElement,
  onSize: CanvasFrameProps['onSize'],
): () => void {
  const observer = new ResizeObserver(() =>
    onSize({ x: 0, y: 0, width: host.clientWidth, height: host.clientHeight }),
  );

  observer.observe(host);

  return () => observer.disconnect();
}

function wheelCamera(
  event: WheelEvent,
  host: HTMLDivElement,
  props: CanvasFrameProps,
): void {
  event.preventDefault();
  const factor = Math.exp(-event.deltaY * wheelRate);
  props.onCamera(zoomCamera(props.view, localPoint(event, host), factor));
}

function observeWheel(
  host: HTMLDivElement,
  props: CanvasFrameProps,
): () => void {
  const wheel = (event: WheelEvent): void => wheelCamera(event, host, props);
  host.addEventListener('wheel', wheel, { passive: false });

  return () => host.removeEventListener('wheel', wheel);
}

export function useFrameSize(
  host: HTMLDivElement | null,
  onSize: CanvasFrameProps['onSize'],
): void {
  useEffect(() => {
    return host ? observeSize(host, onSize) : undefined;
  }, [host, onSize]);
}

export function useWheel(
  host: HTMLDivElement | null,
  props: CanvasFrameProps,
): void {
  useEffect(() => {
    if (!host || props.camera === 'fixed') return;

    return observeWheel(host, props);
  }, [host, props]);
}

export function useCanvasHost(
  props: CanvasFrameProps,
): React.RefCallback<HTMLDivElement> {
  const [host, ref] = useState<HTMLDivElement | null>(null);
  useFrameSize(host, props.onSize);
  useWheel(host, props);

  return ref;
}
