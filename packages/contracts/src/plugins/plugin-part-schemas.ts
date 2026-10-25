import { actionListWireParts } from './action-list-wire-parts';
import { canvasWireParts } from './canvas-wire-parts';
import { coreWireParts } from './core-wire-parts';
import { emptyStateWirePart } from './empty-state-wire-part';
import { iconButtonPart } from './icon-button-part';
import { imageWirePart } from './image-wire-part';
import { layoutWireParts } from './layout-wire-parts';
import { listWireParts } from './list-wire-parts';
import { mediaWireParts } from './media-wire-parts';
import { overlayWireParts } from './overlay-wire-parts';
import { contentPartSchemas } from './parts/content';
import { fieldsPartSchemas } from './parts/fields';
import { inputsPartSchemas } from './parts/inputs';
import { layoutPartSchemas } from './parts/layout';
import { overlaysPartSchemas } from './parts/overlays';
import { scaffoldsPartSchemas } from './parts/scaffolds';
import { statusPartSchemas } from './parts/status';
import { visualPartSchemas } from './parts/visual';
import { proseWireParts } from './prose-wire-parts';
import { scaffoldWireParts } from './scaffold-wire-parts';
import { selectionPartSchemas } from './selection-parts';
import { tableWireParts } from './table-wire-parts';
import type { WirePartDefinition } from './wire-part-definition';

// Every kit component, declared once where its props live; `wire` marks the ones a Plugin can send (wire-parts.ts) and `group` the kit folder that draws it.
export const pluginPartSchemas = {
  ...proseWireParts,
  ...layoutWireParts,
  ...scaffoldWireParts,
  ...listWireParts,
  ...tableWireParts,
  ...actionListWireParts,
  ...selectionPartSchemas,
  ...inputsPartSchemas,
  ...fieldsPartSchemas,
  IconButton: iconButtonPart,
  ...overlayWireParts,
  ...mediaWireParts,
  Image: imageWirePart,
  ...coreWireParts,
  EmptyState: emptyStateWirePart,
  ...canvasWireParts,
  ...contentPartSchemas,
  ...layoutPartSchemas,
  ...overlaysPartSchemas,
  ...scaffoldsPartSchemas,
  ...statusPartSchemas,
  ...visualPartSchemas,
} satisfies Record<string, WirePartDefinition>;

export type PluginPartName = keyof typeof pluginPartSchemas;
