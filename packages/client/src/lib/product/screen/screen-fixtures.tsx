import type { ScreenProps } from './screen';
import { ScreenPreviewContent } from './screen-preview.mocks';

// What the Screen holds: the same content and surface in every state, so only the insets differ.
const content = {
  className: 'bg-content',
  children: <ScreenPreviewContent />,
};

export const safeAreaScreen = { ...content } satisfies ScreenProps;

export const bottomEdgeScreen = {
  ...content,
  edges: ['bottom'],
} satisfies ScreenProps;

export const insetsDisabledScreen = {
  ...content,
  safeArea: false,
} satisfies ScreenProps;
