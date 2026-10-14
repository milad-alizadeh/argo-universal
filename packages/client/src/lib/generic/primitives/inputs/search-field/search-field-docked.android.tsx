import type * as React from 'react';
import { View } from 'react-native';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import { DockedSearchFieldContent } from './search-field-docked-content';
import type { DockedSearchFieldProps } from './search-field-props';

/*
 * A bare native text field drawn as Material's search bar at the top of a list, scrolling with it, in the theme's selection tint.
 * The class places it in the list's gutter. A wide window searches from its title row instead.
 */
export function DockedSearchField({
  className,
  ...props
}: Omit<DockedSearchFieldProps, 'appearance'>): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <View className={className}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <DockedSearchFieldContent {...props} />
      </Host>
    </View>
  );
}
