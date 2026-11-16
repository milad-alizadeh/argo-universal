import { scrollDisabled } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement, ReactNode } from 'react';
import { OutsideColumn } from '#kit/content-column/content-column';
import { Host, InsideHostContext } from '#primitives/native/host';
import type { FieldGroupKitProps } from '../../kit-props';
import { ColumnFieldGroup, transparent } from './field-group-form';

const noScroll = [scrollDisabled()];

/*
 * In a Screen's aside SwiftUI's Form keeps its rows and cards but does not scroll: its Host takes the Form's height,
 * so it scrolls with the aside or the body that holds it, and it takes no column.
 */
type AsideProps = FieldGroupKitProps<'FieldGroup'> & { children?: ReactNode };

export function AsideFieldGroup(props: AsideProps): ReactElement {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <InsideHostContext.Provider value>
        <OutsideColumn>
          <Form {...props} />
        </OutsideColumn>
      </InsideHostContext.Provider>
    </Host>
  );
}

const Form = (props: AsideProps): ReactElement => (
  <ColumnFieldGroup {...props} style={transparent} modifiers={noScroll} />
);
