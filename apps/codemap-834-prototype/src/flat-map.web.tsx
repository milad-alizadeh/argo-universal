import { Canvas, Group, Picture, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cullLabels, type MapProps } from './model';

export default function FlatMap({
  tiles,
  palette,
  selected,
  onSelect,
  command,
  onLabels,
  onReady,
}: MapProps) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 700 });
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const scale = Math.min(size.width / 115, size.height / 100);
  // Skia's asynchronous root retains pictures; CanvasKit finalizes their smart pointers.
  const picture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(-51, -41, 102, 82));
    const paint = Skia.Paint();
    paint.setAntiAlias(false);
    for (const tile of tiles) {
      paint.setColor(
        Skia.Color(
          tile.id === selected
            ? palette.foreground
            : palette[tile.tone as keyof typeof palette],
        ),
      );
      canvas.drawRect(Skia.XYWHRect(tile.x, tile.y, tile.w, tile.h), paint);
    }
    const result = recorder.finishRecordingAsPicture();
    recorder.dispose();
    paint.dispose();
    return result;
  }, [tiles, palette, selected]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry!.contentRect.width,
        height: entry!.contentRect.height,
      }),
    );
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    onReady({
      engine: 'Skia / CanvasKit',
      files: tiles.length,
      dpr: window.devicePixelRatio,
    });
    let raf = 0;
    window.__mapPan834 = (duration) =>
      new Promise((done) => {
        const start = performance.now();
        let last = start;
        const times: number[] = [];
        const initial = cameraRef.current;
        function frame(now: number) {
          times.push(now - last);
          last = now;
          setCamera({
            ...initial,
            x: initial.x + Math.sin((now - start) / 1200) * 140,
          });
          if (now - start < duration) raf = requestAnimationFrame(frame);
          else {
            const sorted = times.slice(1).sort((a, b) => a - b);
            done({
              frames: sorted.length,
              elapsedMs: now - start,
              fps: (sorted.length * 1000) / (now - start - times[0]!),
              p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
              metric:
                'requestAnimationFrame cadence while Skia picture transform pans; not GPU completion',
            });
          }
        }
        raf = requestAnimationFrame(frame);
      });
    return () => {
      cancelAnimationFrame(raf);
      delete window.__mapPan834;
    };
  }, [onReady, tiles.length]);
  useEffect(() => {
    setCamera((current) =>
      command.action === 'fit'
        ? { x: 0, y: 0, zoom: 1 }
        : {
            ...current,
            zoom: current.zoom * (command.action === 'in' ? 1.25 : 0.8),
          },
    );
  }, [command]);
  useEffect(() => {
    const labels = [...tiles]
      .sort((a, b) => b.area - a.area)
      .filter(
        (tile) =>
          tile.w * scale * camera.zoom > 100 &&
          tile.h * scale * camera.zoom > 24,
      )
      .map((tile) => ({
        id: tile.id,
        text: tile.path.split('/').pop()!,
        x: size.width / 2 + camera.x + tile.x * scale * camera.zoom,
        y: size.height / 2 + camera.y + tile.y * scale * camera.zoom,
      }));
    onLabels(cullLabels(labels, size.width, size.height));
  }, [tiles, size, camera, scale, onLabels]);
  const drag = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  return (
    <div
      ref={host}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onWheel={(event) => {
        event.preventDefault();
        setCamera((c) => ({
          ...c,
          zoom: Math.max(
            0.2,
            Math.min(12, c.zoom * Math.exp(-event.deltaY * 0.001)),
          ),
        }));
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          x: event.clientX,
          y: event.clientY,
          startX: camera.x,
          startY: camera.y,
        };
      }}
      onPointerMove={(event) => {
        if (drag.current)
          setCamera((c) => ({
            ...c,
            x: drag.current!.startX + event.clientX - drag.current!.x,
            y: drag.current!.startY + event.clientY - drag.current!.y,
          }));
      }}
      onPointerUp={(event) => {
        if (
          drag.current &&
          Math.hypot(
            event.clientX - drag.current.x,
            event.clientY - drag.current.y,
          ) < 5
        ) {
          const bounds = event.currentTarget.getBoundingClientRect();
          const x =
            (event.clientX - bounds.left - size.width / 2 - camera.x) /
            (scale * camera.zoom);
          const y =
            (event.clientY - bounds.top - size.height / 2 - camera.y) /
            (scale * camera.zoom);
          const tile = tiles.findLast(
            (t) => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h,
          );
          if (tile) onSelect(tile.id);
        }
        drag.current = null;
      }}
    >
      <Canvas style={{ width: size.width, height: size.height }}>
        <Group
          transform={[
            { translateX: size.width / 2 + camera.x },
            { translateY: size.height / 2 + camera.y },
            { scale: scale * camera.zoom },
          ]}
        >
          <Picture picture={picture} />
        </Group>
      </Canvas>
    </div>
  );
}
