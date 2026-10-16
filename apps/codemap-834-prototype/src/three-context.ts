import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo } from 'react';
import { PerspectiveCamera, type Camera, type WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mapExtent, type RendererProps } from './model';
import { createThreeViewport, type ThreeViewport } from './three-viewport';
import { useViewportHandle } from './viewport-handle';

const polarAngleFraction = 0.49;

const maximumPolarAngle = Math.PI * polarAngleFraction;

export interface ThreeContext extends RendererProps {
  camera: PerspectiveCamera;
  gl: WebGLRenderer;
  controls: OrbitControls;
  viewport: ThreeViewport;
  invalidate: () => void;
  size: { width: number; height: number };
}

function perspective(camera: Camera): PerspectiveCamera {
  if (camera instanceof PerspectiveCamera) return camera;

  throw new Error('The 3D CodeMap requires a perspective camera');
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

type Rig = Pick<ThreeContext, 'camera' | 'controls' | 'invalidate' | 'size'>;

function useCreateViewport(
  tiles: RendererProps['tiles'],
  rig: Rig,
): ThreeViewport {
  const { camera, controls, invalidate } = rig;

  return useMemo(
    () =>
      createThreeViewport(
        { tiles, extent: mapExtent },
        { camera, controls, invalidate },
      ),
    [tiles, camera, controls, invalidate],
  );
}

function useViewport(props: RendererProps, rig: Rig): ThreeViewport {
  const viewport = useCreateViewport(props.tiles, rig);
  const { size } = rig;
  useLayoutEffect(() => viewport.resize(size), [viewport, size]);
  // A newly mounted view starts at fit.
  useLayoutEffect(() => viewport.fit(), [viewport]);
  useViewportHandle(props.overlay.viewport, viewport);

  return viewport;
}

export function useThreeContext(props: RendererProps): ThreeContext {
  const three = useThree();
  const { gl, invalidate, size } = three;
  const camera = perspective(three.camera);

  const controls = useMemo(
    () => createControls(camera, gl.domElement),
    [camera, gl],
  );

  const viewport = useViewport(props, { camera, controls, invalidate, size });

  return { ...props, camera, gl, controls, viewport, invalidate, size };
}
