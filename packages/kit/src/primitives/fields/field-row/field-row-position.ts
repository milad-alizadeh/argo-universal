import type { FieldItemPosition } from '@expo/ui';
import { createContext } from 'react';

// Where a row sits in its Section, for Android's connected-list corners; the Section provides it to each row.
export const PositionContext = createContext<FieldItemPosition>('only');

// Whether the whole FieldGroup holds still; the group provides it to each row.
export const GroupDisabledContext = createContext(false);

/*
 * Per-position corner radii, copied from Expo UI's Android FieldGroup.Section (FieldSection.android.tsx): a
 * single row is fully rounded, the ends of a section round their outer corners fully and the rest slightly.
 */
const full = 20;

const small = 4;

type Corners = {
  topStart: number;
  topEnd: number;
  bottomStart: number;
  bottomEnd: number;
};

const corners = (top: number, bottom: number): Corners => ({
  topStart: top,
  topEnd: top,
  bottomStart: bottom,
  bottomEnd: bottom,
});

const radii = {
  only: corners(full, full),
  leading: corners(full, small),
  trailing: corners(small, full),
  middle: corners(small, small),
} satisfies Record<FieldItemPosition, Corners>;

export const cornerRadii = (position: FieldItemPosition): Corners =>
  radii[position];
