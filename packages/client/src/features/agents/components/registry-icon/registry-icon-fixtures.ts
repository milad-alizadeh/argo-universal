import type { RegistryIconProps } from '@repo/kit/primitives/content/agent-logo';
import { encodedIcon, iconAgent } from '../registry-icons.mocks';

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
