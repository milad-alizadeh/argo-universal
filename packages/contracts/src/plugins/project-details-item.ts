import { z } from 'zod';
import { tones } from '#kit-tokens';
import { PluginIcon, PluginPath } from '#plugin-manifest-fields';

// A Project details row's label and its trailing value both stay short: it is a settings row, not a paragraph.
export const projectDetailsTextLimit = 40;

// How many rows one Plugin may add to a Project.
export const projectDetailsRowLimit = 6;

/*
 * One row a Plugin adds to Project details. Argo draws it; a Plugin never sends a kit tree here (ADR-0046).
 * A row that writes carries an `action` and the Plugin draws the choice on the page it opens.
 */
export const ProjectDetailsItem = z.strictObject({
  icon: PluginIcon.optional(),
  title: z.string().trim().min(1).max(projectDetailsTextLimit),
  // The trailing value a settings row shows, such as the Tracker this Project chose.
  value: z.string().trim().min(1).max(projectDetailsTextLimit).optional(),
  tone: z.enum(tones).optional(),
  // Opens this Plugin page when the row is pressed.
  action: z.strictObject({ path: PluginPath }).optional(),
});

export type ProjectDetailsItem = z.infer<typeof ProjectDetailsItem>;
