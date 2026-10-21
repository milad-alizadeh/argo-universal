import { Text } from '#primitives/content/text';
import { CollapsibleContent, CollapsibleHeader } from './collapsible';
import type { CollapsibleProps } from './collapsible-props';

const className = 'w-full';

const disclosure = (
  <>
    <CollapsibleHeader icon="read" label="Read 6 files, searched 2 times" />
    <CollapsibleContent className="pt-2">
      <Text>Content sits 8 below the trigger.</Text>
    </CollapsibleContent>
  </>
);

export const closedCollapsible = {
  className,
  children: disclosure,
  defaultOpen: false,
} satisfies CollapsibleProps;

export const openCollapsible = {
  className,
  children: disclosure,
  defaultOpen: true,
} satisfies CollapsibleProps;
