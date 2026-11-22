import { useState } from 'react';
import type { SelectionMode } from '#kit/selection-mode';
import {
  useDeclaredActions,
  type ActionGroup,
  type HeaderDeclaration,
} from '#primitives/actions/action';
import type { HeaderKind, HeaderPlan, HeaderSite } from './header-site';
import { screenHeadersOf } from './screen-headers';
import type { PageOptions, ScreenHeaders, ScreenProps } from './screen-props';
import { useHeaderDeclaration } from './use-header-declaration';
import { useHeaderPlan } from './use-header-plan';

type Declared = Pick<ScreenProps, 'titleMenu' | 'options' | 'optionsBadge'>;

interface ScreenExtras {
  titleGroups: ActionGroup[];
  pageOptions: PageOptions | null;
  // The node the title menu's shortcuts run under.
  anchor: string;
}

const nothingDeclared: Declared = {};

// Where the Screen draws its own heading, the sheet hangs on the heading's Options button.
const anchoredSites: ReadonlySet<HeaderSite> = new Set([
  'heading',
  'list column',
]);

type OpenState = Pick<PageOptions, 'open' | 'onOpenChange'>;

function pageOptionsOf(
  declared: Declared,
  state: OpenState,
  site: HeaderSite,
): PageOptions | null {
  if (!declared.options) return null;

  return {
    ...state,
    content: declared.options,
    badge: declared.optionsBadge,
    anchored: anchoredSites.has(site),
  };
}

/*
 * Whether the options are open. Options that go away, while a List selects or when a page draws without them, close
 * with them, so they never come back already open.
 */
function useOptionsOpen(present: boolean): OpenState {
  const [open, onOpenChange] = useState(false);
  const shown = open && present;

  if (open !== shown) onOpenChange(false);

  return { open: shown, onOpenChange };
}

/*
 * The title's menu and the page's options, read once beside the header's Actions. A selecting List's header replaces
 * the Screen's, so neither is declared meanwhile. The App owns whether the options are open: a Plugin's choices inside
 * them change its Page state, and the sheet stays open across the redraws they cause.
 */
function useScreenExtras(
  props: Declared,
  { selection, site }: { selection: SelectionMode | null; site: HeaderSite },
): ScreenExtras {
  const declared = selection?.header ? nothingDeclared : props;
  const title = useDeclaredActions(declared.titleMenu);
  const state = useOptionsOpen(Boolean(declared.options));

  return {
    titleGroups: title.groups,
    pageOptions: pageOptionsOf(declared, state, site),
    anchor: title.id,
  };
}

// The title menu's shortcuts run under the Screen, with the header's own.
const withAnchor = (
  declaration: HeaderDeclaration,
  anchor: string,
): HeaderDeclaration => ({
  ...declaration,
  anchors: [...declaration.anchors, anchor],
});

export interface HeaderDrawing {
  declaration: HeaderDeclaration;
  headers: ScreenHeaders;
  titleGroups: ActionGroup[];
  pageOptions: PageOptions | null;
  plan: HeaderPlan;
}

// Everything a Screen's header draws from, read once: its Actions, its title's menu, its options and where it draws.
export function useHeaderDrawing(
  props: ScreenProps,
  kind: HeaderKind,
  selection: SelectionMode | null,
): HeaderDrawing {
  const declared = useHeaderDeclaration(props, selection);
  const plan = useHeaderPlan(kind, Boolean(props.title));
  const extras = useScreenExtras(props, { selection, site: plan.site });
  const declaration = withAnchor(declared, extras.anchor);
  const { titleGroups, pageOptions } = extras;
  const headers = screenHeadersOf(declaration);

  return { declaration, headers, titleGroups, pageOptions, plan };
}
