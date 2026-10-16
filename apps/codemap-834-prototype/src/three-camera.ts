import { useEffect } from 'react';
import type { ThreeContext } from './three-context';

const fit = { x: 95, y: 100, z: 115 };

export const fitPosition: [number, number, number] = [fit.x, fit.y, fit.z];

const zoomIn = 0.8;

const zoomOut = 1.25;

type CommandContext = Pick<
  ThreeContext,
  'camera' | 'controls' | 'command' | 'invalidate'
>;

function applyCommand(ctx: CommandContext): void {
  if (ctx.command.action === 'fit') {
    ctx.camera.position.set(...fitPosition);
    ctx.controls.target.set(0, 0, 0);
  } else
    ctx.camera.position
      .sub(ctx.controls.target)
      .multiplyScalar(ctx.command.action === 'in' ? zoomIn : zoomOut)
      .add(ctx.controls.target);
  ctx.controls.update();
  ctx.invalidate();
}

export function useThreeCommand(ctx: ThreeContext): void {
  const { command, camera, controls, invalidate } = ctx;
  useEffect(
    () => applyCommand({ command, camera, controls, invalidate }),
    [command, camera, controls, invalidate],
  );
}
