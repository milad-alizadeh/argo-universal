import type { RefObject } from 'react';
import type { ViewInstance } from 'react-native';
import type { Rect } from './list-drop-aim';

type Measured = [x: number, y: number, width: number, height: number];

// The drag hit-tests and draws in window coordinates.
export async function measureView(
  view: RefObject<Pick<ViewInstance, 'measureInWindow'> | null>,
): Promise<Rect | undefined> {
  const current = view.current;

  if (!current) return;

  return new Promise((resolve) => {
    current.measureInWindow((...[x, y, width, height]: Measured) =>
      resolve({ x, y, width, height }),
    );
  });
}
