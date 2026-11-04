import { z } from 'zod';

export const PluginIdentifier = z.string().regex(/^[a-z][a-z0-9-]*$/);

// The longest Plugin id any call from an App may name.
export const maxPluginIdLength = 64;
