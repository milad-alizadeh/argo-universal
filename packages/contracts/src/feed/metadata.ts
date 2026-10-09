import { z } from 'zod';

const acpMetadata = z.record(z.string(), z.unknown()).optional();
export const createFeedMetadataSchema = <Extension extends z.ZodObject>(
  argoExtensionSchema: Extension,
): z.ZodOptional<
  z.ZodObject<
    {
      argo: z.ZodOptional<Extension>;
      acp: typeof acpMetadata;
    },
    z.core.$strict
  >
> =>
  z
    .strictObject({ argo: argoExtensionSchema.optional(), acp: acpMetadata })
    .optional();
