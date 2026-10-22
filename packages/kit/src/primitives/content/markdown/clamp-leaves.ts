import {
  createContext,
  useCallback,
  useContext,
  type RefCallback,
} from 'react';
import type { ViewInstance } from 'react-native';
import { type TextRole, useTextStyle } from '#primitives/content/text';

type MeasurableNode = Pick<ViewInstance, 'measureLayout'>;

// A drawn piece of markdown a clamp may cut below; text also gives its line height.
export interface ClampLeaf {
  node: MeasurableNode;
  lineHeight?: number;
}

type RegisterLeaf = (leaf: ClampLeaf) => () => void;

// Supplied by a clamped message, so its markdown reports where each line and block ends.
export const ClampLeaves = createContext<RegisterLeaf | undefined>(undefined);

// The web resolves a line height as a pixel string, native as a number.
export function useLineHeight(role: TextRole): number | undefined {
  const lineHeight = Number.parseFloat(String(useTextStyle(role).lineHeight));

  return Number.isFinite(lineHeight) ? lineHeight : undefined;
}

export function useClampLeaf(lineHeight?: number): RefCallback<MeasurableNode> {
  const register = useContext(ClampLeaves);

  return useCallback(
    (node) => {
      if (!node || !register) return;

      const release = register({ node, lineHeight });

      return () => {
        release();
      };
    },
    [register, lineHeight],
  );
}
