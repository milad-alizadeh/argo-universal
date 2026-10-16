import {
  useEffect,
  useImperativeHandle,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { CameraAction, MapProps } from './model';

export interface FlatCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface Size {
  width: number;
  height: number;
}

export type SetCamera = Dispatch<SetStateAction<FlatCamera>>;

export interface FlatContext extends MapProps {
  host: RefObject<HTMLDivElement | null>;
  size: Size;
  camera: FlatCamera;
  setCamera: SetCamera;
  scale: number;
}

const zoomIn = 1.25;

const zoomOut = 0.8;

const mapWidth = 115;

const mapHeight = 100;

const fitCamera: FlatCamera = { x: 0, y: 0, zoom: 1 };

export function cameraCommand(
  current: FlatCamera,
  action: CameraAction,
): FlatCamera {
  if (action === 'fit') return fitCamera;

  return {
    ...current,
    zoom: current.zoom * (action === 'in' ? zoomIn : zoomOut),
  };
}

function observe(
  host: HTMLDivElement | null,
  setSize: Dispatch<SetStateAction<Size>>,
): (() => void) | undefined {
  if (!host) return;

  const observer = new ResizeObserver(([entry]) => {
    if (entry)
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
  });

  observer.observe(host);

  return () => observer.disconnect();
}

function useSize(host: RefObject<HTMLDivElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 1000, height: 700 });
  useEffect(() => observe(host.current, setSize), [host]);

  return size;
}

function useCommands(ref: MapProps['cameraRef'], setCamera: SetCamera): void {
  useImperativeHandle(
    ref,
    () => ({
      run: (action): void =>
        setCamera((current) => cameraCommand(current, action)),
    }),
    [setCamera],
  );
}

export function useFlatContext(
  props: MapProps,
  host: RefObject<HTMLDivElement | null>,
): FlatContext {
  const size = useSize(host);

  const [camera, setCamera] = useState(() =>
    cameraCommand(fitCamera, props.command.action),
  );

  useCommands(props.cameraRef, setCamera);
  const scale = Math.min(size.width / mapWidth, size.height / mapHeight);

  return { ...props, host, size, camera, setCamera, scale };
}
