import { z } from 'zod';
import type { Point } from './canvas-props';

const number = z.number().finite();

export const canvasMatrix = z.tuple([
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]);

export type Matrix = z.output<typeof canvasMatrix>;

export function matrixPoint(point: Point, matrix: Matrix): Point {
  const [a, c, tx, b, d, ty] = matrix;

  return {
    x: a * point.x + c * point.y + tx,
    y: b * point.x + d * point.y + ty,
  };
}

export function rotationMatrix(angle: number, point: Point): Matrix {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [cos, -sin, point.x, sin, cos, point.y, 0, 0, 1];
}
