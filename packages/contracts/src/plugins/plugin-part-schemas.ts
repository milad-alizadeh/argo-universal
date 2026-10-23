import { actionsPartSchemas } from './parts/actions';
import { contentPartSchemas } from './parts/content';
import { controlsPartSchemas } from './parts/controls';
import { fieldsPartSchemas } from './parts/fields';
import { layoutPartSchemas } from './parts/layout';
import { listsPartSchemas } from './parts/lists';
import { overlaysPartSchemas } from './parts/overlays';
import { scaffoldsPartSchemas } from './parts/scaffolds';
import { statusPartSchemas } from './parts/status';
import { visualPartSchemas } from './parts/visual';
import { wireParts } from './wire-parts';
import type { WirePartDefinition } from './wire-parts';

export const pluginPartSchemas = {
  ...layoutPartSchemas,
  ...contentPartSchemas,
  ...statusPartSchemas,
  ...actionsPartSchemas,
  ...controlsPartSchemas,
  ...fieldsPartSchemas,
  ...listsPartSchemas,
  ...overlaysPartSchemas,
  ...scaffoldsPartSchemas,
  ...visualPartSchemas,
  ...wireParts,
  // The kit receives local handlers; a Plugin can leave its draft controls without wire handlers.
  Slider: controlsPartSchemas.Slider,
  SplitButton: actionsPartSchemas.SplitButton,
} satisfies Record<string, WirePartDefinition>;

// Which group file each part is declared in; the kit draws the same group under the same name (tools/kit-pairing-rules.mts).
export const pluginPartGroups = {
  actions: actionsPartSchemas,
  content: contentPartSchemas,
  controls: controlsPartSchemas,
  fields: fieldsPartSchemas,
  layout: layoutPartSchemas,
  lists: listsPartSchemas,
  overlays: overlaysPartSchemas,
  scaffolds: scaffoldsPartSchemas,
  status: statusPartSchemas,
  visual: visualPartSchemas,
} as const;

export type PluginPartName = keyof typeof pluginPartSchemas;
