import { actionsComponents } from './components/actions';
import { contentComponents } from './components/content';
import { controlsComponents } from './components/controls';
import { fieldsComponents } from './components/fields';
import { layoutComponents } from './components/layout';
import { listsComponents } from './components/lists';
import { overlaysComponents } from './components/overlays';
import { scaffoldsComponents } from './components/scaffolds';
import { statusComponents } from './components/status';
import { visualComponents } from './components/visual';
import type { KitComponentDefinition } from './kit-component-definition';

// Every kit component, one file per kit group; `wire` marks the ones a Plugin can send (kit-components.ts).
export const kitComponentSchemas = {
  ...actionsComponents,
  ...contentComponents,
  ...controlsComponents,
  ...fieldsComponents,
  ...layoutComponents,
  ...listsComponents,
  ...overlaysComponents,
  ...scaffoldsComponents,
  ...statusComponents,
  ...visualComponents,
} satisfies Record<string, KitComponentDefinition>;
