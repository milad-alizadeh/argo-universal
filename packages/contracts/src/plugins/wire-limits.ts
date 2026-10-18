import type { WireNode } from './wire';

// A 2,000-row Text list measures 155,850 bytes; leave room for richer rows and reserve 1 KiB for the snapshot envelope when a viewer reconnects.
export const pluginMessageBytes = 1_048_576;

export const pluginPageBytes = 1_047_552;

// Foundations / Text / Secondary, inside the existing PluginPage content surface.
export const pluginPageFallback: WireNode = {
  type: 'Text',
  key: 'fallback',
  props: {
    children: 'This Plugin page could not be displayed.',
    role: 'secondary',
    tone: 'muted',
  },
  children: [],
  slots: {},
};
