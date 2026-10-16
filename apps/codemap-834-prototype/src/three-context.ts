import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import type { Camera, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MapProps } from './model';

const polarAngleFraction = 0.49;

const maximumPolarAngle = Math.PI * polarAngleFraction;

export interface ThreeContext extends MapProps {
  camera: Camera;
  gl: WebGLRenderer;
  controls: OrbitControls;
  invalidate: () => void;
  size: { width: number; height: number };
}

function createControls(
  camera: Camera,
  element: HTMLCanvasElement,
): OrbitControls {
  const controls = new OrbitControls(camera, element);
  controls.enableDamping = false;
  controls.maxPolarAngle = maximumPolarAngle;

  return controls;
}

export function useThreeContext(props: MapProps): ThreeContext {
  const { camera, gl, invalidate, size } = useThree();

  const controls = useMemo(
    () => createControls(camera, gl.domElement),
    [camera, gl],
  );

  return { ...props, camera, gl, controls, invalidate, size };
}
