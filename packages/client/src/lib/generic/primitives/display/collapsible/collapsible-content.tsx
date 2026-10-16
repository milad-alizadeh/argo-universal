import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { type ComponentType, type ReactElement, useContext } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import {
  CollapsibleLayoutSyncContext,
  OpenContext,
} from './collapsible-context';
import { LayoutSyncedContent } from './collapsible-layout-content';
import type { CollapsibleContentProps as ContentProps } from './collapsible-props';

const webContentMotion = (open: boolean): string =>
  cn(
    'overflow-hidden motion-reduce:animate-none',
    open ? 'animate-collapsible-down' : 'animate-collapsible-up',
  );

// The caller's padding sits inside the animated box, whose height then reaches zero; padding on the box itself would stop it short and then snap shut.
function WebContent({
  className,
  children,
  forceMount,
  ...props
}: ContentProps): ReactElement {
  const open = useContext(OpenContext);

  return (
    <RadixCollapsible.Content forceMount={forceMount} asChild>
      <View {...props} className={webContentMotion(open)}>
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
