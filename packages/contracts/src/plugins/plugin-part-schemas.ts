import { actionsParts } from './parts/actions';
import { contentParts } from './parts/content';
import { controlsParts } from './parts/controls';
import { fieldsParts } from './parts/fields';
import { layoutParts } from './parts/layout';
import { listsParts } from './parts/lists';
import { overlaysParts } from './parts/overlays';
import { scaffoldsParts } from './parts/scaffolds';
import { statusParts } from './parts/status';
import { visualParts } from './parts/visual';
import type { WirePartDefinition } from './wire-part-definition';

// Every kit component, one file per kit group; `wire` marks the ones a Plugin can send (wire-parts.ts).
export const pluginPartSchemas = {
  ...actionsParts,
  ...contentParts,
  ...controlsParts,
  ...fieldsParts,
  ...layoutParts,
  ...listsParts,
  ...overlaysParts,
  ...scaffoldsParts,
  ...statusParts,
  ...visualParts,
} satisfies Record<string, WirePartDefinition>;
