import { scrollDisabled } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement, ReactNode } from 'react';
import type { FieldGroupKitProps } from '../../kit-props';
import { AsideHost } from './field-group-aside-host.native';
import { ColumnFieldGroup, transparent } from './field-group-form';

const noScroll = [scrollDisabled()];

type AsideProps = FieldGroupKitProps<'FieldGroup'> & { children?: ReactNode };

// In a Screen's aside SwiftUI's Form keeps its rows and cards but does not scroll; its Host takes the Form's height.
export function AsideFieldGroup(props: AsideProps): ReactElement {
  return (
    <AsideHost>
      <ColumnFieldGroup {...props} style={transparent} modifiers={noScroll} />
    </AsideHost>
  );
}
