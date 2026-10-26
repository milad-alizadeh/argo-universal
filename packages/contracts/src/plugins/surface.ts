import { z } from 'zod';

// The Plugin wire this App and Server speak; bump it, and the minimum, for a change an older App can't draw (ADR-0034).
export const pluginWireVersion = 4;

// The oldest App wire version the Server still sends Plugin trees to.
export const minimumPluginWireVersion = 4;

export const PluginSurface = z.object({
  platform: z.enum(['ios', 'android', 'web', 'desktop']),
  wireVersion: z.number().int().positive(),
});

export type PluginSurface = z.infer<typeof PluginSurface>;

// The surface an App reports for its platform when it speaks this build's wire version.
export const currentPluginSurface = (
  platform: PluginSurface['platform'],
): PluginSurface => ({ platform, wireVersion: pluginWireVersion });

// An App that reports no wire version, or one below the minimum, sees "Update Argo" instead of Plugin trees.
export const drawsPluginWire = (surface: PluginSurface | undefined): boolean =>
  (surface?.wireVersion ?? 0) >= minimumPluginWireVersion;

// Render context belongs to one App; legacy Connections did not report a surface.
export type PluginRenderContext = Readonly<{
  serverDevice: boolean;
  projectId?: string;
  surface?: Readonly<PluginSurface>;
}>;
