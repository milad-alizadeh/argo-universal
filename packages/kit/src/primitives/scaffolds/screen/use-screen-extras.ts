import { useState } from 'react';
import type { SelectionMode } from '#kit/selection-mode';
import {
  useDeclaredActions,
  type ActionGroup,
  type HeaderDeclaration,
} from '#primitives/actions/action';
import type { HeaderSite } from './header-site';
import type { PageOptions, ScreenProps } from './screen-props';

type Declared = Pick<ScreenProps, 'titleMenu' | 'options' | 'optionsBadge'>;

export interface ScreenExtras {
  titleGroups: ActionGroup[];
  pageOptions: PageOptions | null;
  // The node the title menu's shortcuts run under.
  anchor: string;
}

const nothingDeclared: Declared = {};

// Where the Screen draws its own heading, the sheet hangs on the heading's Options button.
const anchoredSites: readonly HeaderSite[] = ['heading', 'list column'];

/*
 * The title's menu and the page's options, read once beside the header's Actions. A selecting List's header replaces
 * the Screen's, so neither is declared meanwhile. The App owns whether the options are open: a Plugin's choices inside
 * them change its Page state, and the sheet stays open across the redraws they cause.
 */
export function useScreenExtras(
  props: Declared,
  { selection, site }: { selection: SelectionMode | null; site: HeaderSite },
): ScreenExtras {
  const shown = selection?.header ? nothingDeclared : props;
  const title = useDeclaredActions(shown.titleMenu);
  const [open, setOpen] = useState(false);

  const pageOptions = shown.options
    ? {
        content: shown.options,
        badge: shown.optionsBadge,
        open,
        onOpenChange: setOpen,
        anchored: anchoredSites.includes(site),
      }
    : null;

  return { titleGroups: title.groups, pageOptions, anchor: title.id };
}

// The title menu's shortcuts run under the Screen, with the header's own.
export const withAnchor = (
  declaration: HeaderDeclaration,
  anchor: string,
): HeaderDeclaration => ({
  ...declaration,
  anchors: [...declaration.anchors, anchor],
});
