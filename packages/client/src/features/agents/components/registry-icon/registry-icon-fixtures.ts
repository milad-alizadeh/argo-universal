import { encodedIcon, iconAgent } from '../registry-icons.mocks';
import type { RegistryIconProps } from './registry-icon';

const agentName = iconAgent.entry.name;

// No icon in the Registry entry: the Agent glyph stands in for it.
export const unavailableRegistryIcon = {
  uri: undefined,
  agentName,
  size: 'sm',
} satisfies RegistryIconProps;

// The Registry's own encoded SVG, painted in the foreground.
export const loadedRegistryIcon = {
  uri: encodedIcon,
  agentName,
  size: 'sm',
} satisfies RegistryIconProps;
