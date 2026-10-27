import type { IconSizeValue } from '../../../symbols/icon-size';

export interface RegistryIconProps {
  // The Registry entry's icon; the Agent glyph stands in when it is missing or fails to load.
  uri: string | undefined;
  agentName: string;
  size: IconSizeValue;
}

export type LoadedIconProps = Required<RegistryIconProps> & { uri: string };
