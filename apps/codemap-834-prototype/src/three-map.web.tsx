import { Canvas, type CanvasProps } from '@react-three/fiber';
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  type JSX,
  type RefObject,
} from 'react';
import type { InstancedMesh } from 'three';
import { mapExtent, type RendererProps } from './model';
import { usePointerPick } from './pointer-pick';
import { useThreeContext, type ThreeContext } from './three-context';
import { useInstances } from './three-instances';
import { useThreeLabels } from './three-labels';
import { useThreePan } from './three-pan';
import { clipRange, fieldOfView, fitCamera } from './three-projection';
import { useThreeReady } from './three-ready';

const fit = fitCamera(mapExtent).position;

const canvasOptions: CanvasProps = {
  dpr: 1,
  frameloop: 'demand',
  camera: { position: [fit.x, fit.y, fit.z], fov: fieldOfView, ...clipRange },
  gl: { antialias: true },
};

const halves = 2;

const floorRotation: [number, number, number] = [-Math.PI / halves, 0, 0];

const floorClearance = 0.1;

const floorPosition: [number, number, number] = [
  mapExtent.x + mapExtent.w / halves,
  -floorClearance,
  mapExtent.y + mapExtent.h / halves,
];

const lightOffset = { x: 30, y: 100, z: 60 };

const lightPosition: [number, number, number] = [
  lightOffset.x,
  lightOffset.y,
  lightOffset.z,
];

/** World units the floor extends past the map extent. */
const floorMargin = 1;

const floorSize: [number, number] = [
  mapExtent.w + floorMargin,
  mapExtent.h + floorMargin,
];

function Floor({ ctx }: { ctx: ThreeContext }): JSX.Element {
  return (
    <mesh rotation={floorRotation} position={floorPosition}>
      <planeGeometry args={floorSize} />
      <meshStandardMaterial color={ctx.palette.muted} roughness={1} />
    </mesh>
  );
}

interface DrawingProps {
  ctx: ThreeContext;
  mesh: RefObject<InstancedMesh | null>;
}

function Buildings({ ctx, mesh }: DrawingProps): JSX.Element {
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, ctx.tiles.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={ctx.palette.light} roughness={1} />
    </instancedMesh>
  );
}

function Lights({ ctx }: { ctx: ThreeContext }): JSX.Element {
  return (
    <>
      <ambientLight color={ctx.palette.light} intensity={1.5} />
      <directionalLight
        color={ctx.palette.light}
        intensity={2}
        position={lightPosition}
      />
    </>
  );
}

function Drawing({ ctx, mesh }: DrawingProps): JSX.Element {
  return (
    <>
      <color attach="background" args={[ctx.palette.card]} />
      <Lights ctx={ctx} />
      <Floor ctx={ctx} />
      <Buildings ctx={ctx} mesh={mesh} />
    </>
  );
}

function useScene(
  ctx: ThreeContext,
  mesh: RefObject<InstancedMesh | null>,
): void {
  const canvas = useMemo(() => ({ current: ctx.gl.domElement }), [ctx.gl]);
  useInstances(ctx, mesh);
  usePointerPick(canvas, ctx.viewport, ctx.onSelect);
  useThreePan(ctx);
  useThreeLabels(ctx);
  useThreeReady(ctx);
  useEffect(() => (): void => ctx.controls.dispose(), [ctx.controls]);
}

function Scene(props: RendererProps): JSX.Element {
  const ctx = useThreeContext(props);
  const mesh = useRef<InstancedMesh | null>(null);
  useScene(ctx, mesh);

  return <Drawing ctx={ctx} mesh={mesh} />;
}

function ThreeMap(props: RendererProps): JSX.Element {
  return (
    <Canvas {...canvasOptions}>
      <Scene {...props} />
    </Canvas>
  );
}

export default memo(ThreeMap);
