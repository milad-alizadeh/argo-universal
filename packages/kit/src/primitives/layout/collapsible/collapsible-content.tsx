import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { type ComponentType, type ReactElement, useContext } from 'react';
import { View } from 'react-native';
import {
  CollapsibleLayoutSyncContext,
  contentAccessibility,
  OpenContext,
} from './collapsible-context';
import { LayoutSyncedContent } from './collapsible-layout-content';
import type { CollapsibleContentProps as ContentProps } from './collapsible-props';
import { useWebContentMotion } from './collapsible-web-motion';

// The caller's padding sits inside the moving box, whose height then reaches zero; padding on the box itself would stop it short and then snap shut. Closing content is already hidden from touches and assistive technology while it leaves.
function WebContent({
  className,
  children,
  forceMount,
  ...props
}: ContentProps): ReactElement | null {
  const open = useContext(OpenContext);
  const motion = useWebContentMotion(open, forceMount);

  if (!motion.mounted) return null;

  return (
    <RadixCollapsible.Content forceMount asChild>
      <View
        {...props}
        {...contentAccessibility(open)}
        ref={motion.box}
        className="overflow-hidden"
      >
        <View ref={motion.content} className={className}>
          {children}
        </View>
      </View>
    </RadixCollapsible.Content>
  );
}

// The web moves the content's height with a CSS transition; a layout-synced list animates with its rows instead.
export function CollapsibleContent(props: ContentProps): ReactElement | null {
  const layoutSync = useContext(CollapsibleLayoutSyncContext);

  if (layoutSync)
    return <LayoutSyncedContent {...props} layoutSync={layoutSync} />;

  return <WebContent {...props} />;
}

CollapsibleContent satisfies ComponentType<ContentProps>;
