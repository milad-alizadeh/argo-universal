import { Canvas, type CanvasProps } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useRef, type JSX, type RefObject } from 'react';
import type { InstancedMesh } from 'three';
import type { MapProps } from './model';
import { fitPosition, useThreeCommand } from './three-camera';
import { useThreeContext, type ThreeContext } from './three-context';
import { useInstances } from './three-instances';
import { useThreeLabels } from './three-labels';
import { useThreePan } from './three-pan';
import { useThreeReady } from './three-ready';

const canvasOptions: CanvasProps = {
  dpr: 1,
  frameloop: 'demand',
  camera: { position: fitPosition, fov: 42, near: 0.1, far: 1000 },
  gl: { antialias: true },
};

const halves = 2;

const floorRotation: [number, number, number] = [-Math.PI / halves, 0, 0];

const floorClearance = 0.1;

const floorPosition: [number, number, number] = [0, -floorClearance, 0];

const lightOffset = { x: 30, y: 100, z: 60 };

const lightPosition: [number, number, number] = [
  lightOffset.x,
  lightOffset.y,
  lightOffset.z,
];

const floorDimensions = { width: 101, height: 81 };

const floorSize: [number, number] = [
  floorDimensions.width,
  floorDimensions.height,
];

function select(event: ThreeEvent<MouseEvent>, ctx: ThreeContext): void {
  event.stopPropagation();

  if (event.instanceId === undefined) return;
  const tile = ctx.tiles.at(event.instanceId);

  if (tile) ctx.onSelect(tile.id);
}

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
  const onClick = (event: ThreeEvent<MouseEvent>): void => select(event, ctx);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, ctx.tiles.length]}
      onClick={onClick}
    >
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
  useInstances(ctx, mesh);
  useThreeCommand(ctx);
  useThreePan(ctx);
  useThreeLabels(ctx);
  useThreeReady(ctx);
  useEffect(() => (): void => ctx.controls.dispose(), [ctx.controls]);
}

function Scene(props: MapProps): JSX.Element {
  const ctx = useThreeContext(props);
  const mesh = useRef<InstancedMesh | null>(null);
  useScene(ctx, mesh);

  return <Drawing ctx={ctx} mesh={mesh} />;
}

export default function ThreeMap(props: MapProps): JSX.Element {
  return (
    <Canvas {...canvasOptions}>
      <Scene {...props} />
    </Canvas>
  );
}
