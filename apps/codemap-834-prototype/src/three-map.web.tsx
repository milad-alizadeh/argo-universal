import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cullLabels, type MapProps } from './model';

declare global {
  interface Window {
    __mapPan834?: (duration: number) => Promise<Record<string, unknown>>;
  }
}
export default function ThreeMap(props: MapProps) {
  return (
    <Canvas
      dpr={1}
      frameloop="demand"
      camera={{ position: [95, 100, 115], fov: 42, near: 0.1, far: 1000 }}
      gl={{ antialias: true }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
function Scene({
  tiles,
  palette,
  selected,
  onSelect,
  command,
  onLabels,
  onReady,
}: MapProps) {
  const { camera, gl, invalidate, size } = useThree();
  const mesh = useRef<InstancedMesh>(null);
  const controls = useMemo(
    () => new OrbitControls(camera, gl.domElement),
    [camera, gl],
  );
  const ordered = useMemo(
    () => [...tiles].sort((a, b) => b.area - a.area),
    [tiles],
  );
  const sample = useRef<{
    start: number;
    last: number;
    intervals: number[];
    duration: number;
    done: (value: Record<string, unknown>) => void;
    camera: Vector3;
    target: Vector3;
  } | null>(null);
  useEffect(() => {
    controls.enableDamping = false;
    controls.maxPolarAngle = Math.PI * 0.49;
    const changed = () => invalidate();
    controls.addEventListener('change', changed);
    return () => {
      controls.removeEventListener('change', changed);
      controls.dispose();
    };
  }, [controls, invalidate]);
  useLayoutEffect(() => {
    const object = new Object3D();
    for (const [i, tile] of tiles.entries()) {
      object.position.set(
        tile.x + tile.w / 2,
        tile.elevation / 2,
        tile.y + tile.h / 2,
      );
      object.scale.set(tile.w, tile.elevation, tile.h);
      object.updateMatrix();
      mesh.current!.setMatrixAt(i, object.matrix);
      mesh.current!.setColorAt(
        i,
        new Color(
          tile.id === selected
            ? palette.foreground
            : palette[tile.tone as keyof typeof palette],
        ),
      );
    }
    mesh.current!.instanceMatrix.needsUpdate = true;
    if (mesh.current!.instanceColor)
      mesh.current!.instanceColor.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
    invalidate();
  }, [tiles, palette, selected, invalidate]);
  useEffect(() => {
    const context = gl.getContext();
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    onReady({
      renderer: debug
        ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : context.getParameter(context.RENDERER),
      engine: 'three.js / R3F',
      dpr: gl.getPixelRatio(),
      files: tiles.length,
    });
    window.__mapPan834 = (duration) =>
      new Promise((done) => {
        const start = performance.now();
        sample.current = {
          start,
          last: start,
          intervals: [],
          duration,
          done,
          camera: camera.position.clone(),
          target: controls.target.clone(),
        };
        invalidate();
      });
    return () => {
      delete window.__mapPan834;
    };
  }, [gl, camera, controls, onReady, invalidate, tiles.length]);
  useEffect(() => {
    if (command.action === 'fit') {
      camera.position.set(95, 100, 115);
      controls.target.set(0, 0, 0);
    } else
      camera.position
        .sub(controls.target)
        .multiplyScalar(command.action === 'in' ? 0.8 : 1.25)
        .add(controls.target);
    controls.update();
    invalidate();
  }, [command, camera, controls, invalidate]);
  const lastLabels = useRef(0);
  useFrame(() => {
    const now = performance.now();
    const run = sample.current;
    if (run) {
      run.intervals.push(now - run.last);
      run.last = now;
      const elapsed = now - run.start;
      const offset = Math.sin(elapsed / 1200) * 18;
      camera.position.copy(run.camera).add(new Vector3(offset, 0, 0));
      controls.target.copy(run.target).add(new Vector3(offset, 0, 0));
      controls.update();
      if (elapsed >= run.duration) {
        const times = run.intervals.slice(1).sort((a, b) => a - b);
        run.done({
          frames: times.length,
          elapsedMs: elapsed,
          fps: (times.length * 1000) / (elapsed - run.intervals[0]!),
          p95FrameMs: times[Math.floor(times.length * 0.95)],
          drawCalls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          metric:
            'R3F submitted render cadence while camera pans; not GPU completion',
        });
        sample.current = null;
      } else invalidate();
    }
    if (now - lastLabels.current < 100) return;
    lastLabels.current = now;
    const candidates = [];
    for (const tile of ordered) {
      const center = new Vector3(
        tile.x + tile.w / 2,
        tile.elevation,
        tile.y + tile.h / 2,
      ).project(camera);
      const edge = new Vector3(
        tile.x + tile.w,
        tile.elevation,
        tile.y + tile.h / 2,
      ).project(camera);
      if (
        center.z < -1 ||
        center.z > 1 ||
        Math.abs(center.x - edge.x) * size.width < 38
      )
        continue;
      candidates.push({
        id: tile.id,
        text: tile.path.split('/').pop()!,
        x: ((center.x + 1) * size.width) / 2,
        y: ((1 - center.y) * size.height) / 2,
      });
      if (candidates.length >= 150) break;
    }
    onLabels(cullLabels(candidates, size.width, size.height));
  });
  return (
    <>
      <color attach="background" args={[palette.card]} />
      <ambientLight color={palette.light} intensity={1.5} />
      <directionalLight
        color={palette.light}
        intensity={2}
        position={[30, 100, 60]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[101, 81]} />
        <meshStandardMaterial color={palette.muted} roughness={1} />
      </mesh>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, tiles.length]}
        onClick={(event) => {
          event.stopPropagation();
          if (event.instanceId !== undefined)
            onSelect(tiles[event.instanceId]!.id);
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={palette.light} roughness={1} />
      </instancedMesh>
    </>
  );
}
