import { actionsPartSchemas } from './parts/actions';
import { contentPartSchemas } from './parts/content';
import { fieldsPartSchemas } from './parts/fields';
import { inputsPartSchemas } from './parts/inputs';
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
  ...inputsPartSchemas,
  ...fieldsPartSchemas,
  ...listsPartSchemas,
  ...overlaysPartSchemas,
  ...scaffoldsPartSchemas,
  ...visualPartSchemas,
  ...wireParts,
  // The kit receives local handlers; a Plugin can leave its draft controls without wire handlers.
  Picker: inputsPartSchemas.Picker,
  Switch: inputsPartSchemas.Switch,
  Checkbox: inputsPartSchemas.Checkbox,
  Slider: inputsPartSchemas.Slider,
  TextInput: inputsPartSchemas.TextInput,
  SplitButton: actionsPartSchemas.SplitButton,
} satisfies Record<string, WirePartDefinition>;

// Which group file each part is declared in; the kit draws the same group under the same name (tools/kit-pairing-rules.mts).
export const pluginPartGroups = {
  actions: actionsPartSchemas,
  content: contentPartSchemas,
  fields: fieldsPartSchemas,
  inputs: inputsPartSchemas,
  layout: layoutPartSchemas,
  lists: listsPartSchemas,
  overlays: overlaysPartSchemas,
  scaffolds: scaffoldsPartSchemas,
  status: statusPartSchemas,
  visual: visualPartSchemas,
} as const;

export type PluginPartName = keyof typeof pluginPartSchemas;
