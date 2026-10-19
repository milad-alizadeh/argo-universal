import { z } from 'zod';

export const PluginIdentifier = z.string().regex(/^[a-z][a-z0-9-]*$/);
