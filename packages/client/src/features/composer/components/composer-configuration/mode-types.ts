import type { SessionConfigOption } from '@repo/contracts';
import type { ComposerConfigurationProps } from './configuration-types';

export type Mode = Extract<SessionConfigOption, { type: 'select' }>;

export interface ModeContentsProps {
  configuration: ComposerConfigurationProps;
  mode: Mode;
  close: () => void;
}
