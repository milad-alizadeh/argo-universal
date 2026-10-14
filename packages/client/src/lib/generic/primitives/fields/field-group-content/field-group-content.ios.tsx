import { Section } from '@expo/ui/swift-ui';
import { listRowBackground, listRowInsets } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useWide } from '../../../use-wide/use-wide';
import { HostedRow } from '../field-group/field-group-row';
import {
  FieldGroupContent as WebFieldGroupContent,
  type FieldGroupContentProps,
} from './field-group-content.tsx';

/*
 * A SwiftUI Form sizes a plain React Native view as it likes, so the row hosts it and takes its height.
 * The row has its own section with no card behind it and no inset.
 */
export function FieldGroupContent(
  props: FieldGroupContentProps,
): React.JSX.Element {
  if (useWide()) return <WebFieldGroupContent {...props} />;

  return (
    <Section
      modifiers={[
        listRowBackground('transparent'),
        listRowInsets({ top: 0, bottom: 0, leading: 0, trailing: 0 }),
      ]}
    >
      <HostedRow>{props.children}</HostedRow>
    </Section>
  );
}
