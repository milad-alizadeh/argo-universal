import { type ButtonProps as ExpoButtonProps, Spacer } from '@expo/ui';
import {
  createModifier,
  fillMaxWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import type { IconRole } from '../../../symbols/icon-role';
import type { ButtonProps } from './button';

type ButtonSize = NonNullable<ButtonProps['size']>;

/*
 * SwiftUI's controlSize and frame, built with Expo's plain modifier factory: `@expo/ui/swift-ui/modifiers`
 * loads the ExpoUI native module on import, which the web lacks. Compose ignores both.
 */
const swiftControlSize = createModifier('controlSize', { size: 'small' });

const swiftFillWidth = createModifier('frame', { maxWidth: Infinity });

const smallHeight = 32;

export const sizes = {
  sm: {
    modifiers: [swiftControlSize],
    style: { height: smallHeight },
    iconRole: 'mark',
  },
  md: { modifiers: [], style: {}, iconRole: 'control' },
} satisfies Record<
  ButtonSize,
  Required<Pick<ExpoButtonProps, 'modifiers' | 'style'>> & {
    iconRole: IconRole;
  }
>;

/*
 * Compose fills on the Button; SwiftUI draws its capsule round the label, so the label takes the frame;
 * flexible Spacers centre the label, which the web's Row would otherwise start-align.
 */
export const widths = {
  true: {
    host: { matchContents: { vertical: true }, style: { width: '100%' } },
    modifiers: [fillMaxWidth()],
    label: [swiftFillWidth],
    edge: <Spacer flexible />,
  },
  false: {
    host: { matchContents: true },
    modifiers: [],
    label: [],
    edge: null,
  },
} as const;
