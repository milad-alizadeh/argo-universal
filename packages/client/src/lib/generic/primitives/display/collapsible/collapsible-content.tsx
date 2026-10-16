import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { type ComponentType, type ReactElement, useContext } from 'react';
import { View } from 'react-native';
import { CollapsibleLayoutSyncContext } from './collapsible-context';
import { LayoutSyncedContent } from './collapsible-layout-content';
import type { CollapsibleContentProps as ContentProps } from './collapsible-props';
import { useStateData } from './collapsible-state-data';

const webContentMotion =
  'overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up motion-reduce:animate-none';

// The caller's padding sits inside the animated box, whose height then reaches zero; padding on the box itself would stop it short and then snap shut.
function WebContent({
  className,
  children,
  forceMount,
  ...props
}: ContentProps): ReactElement {
  return (
    <RadixCollapsible.Content forceMount={forceMount} asChild>
      <View {...props} {...useStateData()} className={webContentMotion}>
        <View className={className}>{children}</View>
      </View>
    </RadixCollapsible.Content>
  );
}

// The web animates with CSS; a layout-synced list animates with its rows instead.
export function CollapsibleContent(props: ContentProps): ReactElement {
  const layoutSync = useContext(CollapsibleLayoutSyncContext);

  if (layoutSync)
    return <LayoutSyncedContent {...props} layoutSync={layoutSync} />;

  return <WebContent {...props} />;
}

CollapsibleContent satisfies ComponentType<ContentProps>;
