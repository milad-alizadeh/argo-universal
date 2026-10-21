import { Icon } from '@repo/kit/primitives/content/icon';
import type { ComponentProps, ReactElement } from 'react';
import { isFastMode } from './configuration-values';

interface Props {
  name: NonNullable<ComponentProps<typeof Icon>['name']>;
  filled?: boolean;
}

export function ConfigurationRowIcon(props: Props): ReactElement {
  return <Icon {...props} fitArtwork role={{ compact: 'body', wide: 'row' }} />;
}

/*
 * Fast mode's row shows the filled lightning, as the trigger does when it is on. Every other switch an Agent
 * sends draws none: ACP names an option and says nothing of its shape, so a glyph there would be Argo
 * guessing at one Agent's vocabulary (owner, 2026-10-20).
 */
export function optionIcon(
  option: Parameters<typeof isFastMode>[0],
): ReactElement | undefined {
  if (!isFastMode(option)) return undefined;

  return <ConfigurationRowIcon name="fast-mode" filled />;
}
