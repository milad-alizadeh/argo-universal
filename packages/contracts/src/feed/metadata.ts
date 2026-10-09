import { z } from 'zod';

const acpMetadata = z.record(z.string(), z.unknown()).optional();
export const createFeedMeta = <Extension extends z.ZodObject>(
  extension: Extension,
): z.ZodOptional<
  z.ZodObject<
    {
      argo: z.ZodOptional<Extension>;
      acp: typeof acpMetadata;
    },
    z.core.$strict
  >
> =>
  z.strictObject({ argo: extension.optional(), acp: acpMetadata }).optional();
