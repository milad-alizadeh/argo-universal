import { z } from 'zod';

export const PartVersions = z.record(
  z.string().min(1),
  z.number().int().positive(),
);

export type PartVersions = z.infer<typeof PartVersions>;

export const PluginSurface = z.object({
  platform: z.enum(['ios', 'android', 'web', 'desktop']),
  parts: PartVersions,
});

export type PluginSurface = z.infer<typeof PluginSurface>;

// Render context belongs to one App; legacy Connections did not report a surface.
export type PluginRenderContext = Readonly<{
  surface?: Readonly<{
    platform: PluginSurface['platform'];
    parts: Readonly<PartVersions>;
  }>;
}>;
