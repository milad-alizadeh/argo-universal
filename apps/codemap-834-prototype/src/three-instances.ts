import { useLayoutEffect, type RefObject } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import { tileColor, type Tile } from './model';
import type { ThreeContext } from './three-context';

const halves = 2;

type InstanceScene = Pick<
  ThreeContext,
  'tiles' | 'palette' | 'selected' | 'invalidate'
>;

interface InstanceContext {
  mesh: InstancedMesh;
  object: Object3D;
  scene: InstanceScene;
}

function position(object: Object3D, tile: Tile): void {
  object.position.set(
    tile.x + tile.w / halves,
    tile.elevation / halves,
    tile.y + tile.h / halves,
  );
  object.scale.set(tile.w, tile.elevation, tile.h);
  object.updateMatrix();
}

function writeInstance(ctx: InstanceContext, tile: Tile, index: number): void {
  position(ctx.object, tile);
  ctx.mesh.setMatrixAt(index, ctx.object.matrix);

  const color =
    tile.id === ctx.scene.selected
      ? ctx.scene.palette.foreground
      : tileColor(tile, ctx.scene.palette);

  ctx.mesh.setColorAt(index, new Color(color));
}

function updateInstances(mesh: InstancedMesh, scene: InstanceScene): void {
  const ctx = { mesh, scene, object: new Object3D() };

  for (const [index, tile] of scene.tiles.entries())
    writeInstance(ctx, tile, index);
  mesh.instanceMatrix.needsUpdate = true;

  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  scene.invalidate();
}

export function useInstances(
  scene: ThreeContext,
  ref: RefObject<InstancedMesh | null>,
): void {
  const { tiles, palette, selected, invalidate } = scene;
  useLayoutEffect(() => {
    if (ref.current)
      updateInstances(ref.current, {
        tiles,
        palette,
        selected,
        invalidate,
      });
  }, [ref, tiles, palette, selected, invalidate]);
}
