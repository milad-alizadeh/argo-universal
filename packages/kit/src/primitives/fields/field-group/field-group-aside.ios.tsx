import {
  scrollDisabled,
  useScrollGeometryChange,
} from '@expo/ui/swift-ui/modifiers';
import { type ReactElement, type ReactNode, useMemo, useState } from 'react';
import { useListPlace } from '#kit/list-place';
import type { FieldGroupKitProps } from '../../kit-props';
import { AsideHost } from './field-group-aside-host.native';
import { ColumnFieldGroup, transparent } from './field-group-form';

type AsideProps = FieldGroupKitProps<'FieldGroup'> & { children?: ReactNode };

// Give a fitted sheet's lazy Form room to lay out its first row and report its content height.
const sheetFormInitialHeight = 64;

// A Form has no height of its own, so it reports its rows' height and the Host takes it (iOS 18, the App's minimum).
function useFormHeight(): [number, ReturnType<typeof useScrollGeometryChange>] {
  const inSheet = useListPlace() === 'inset';
  const [height, setHeight] = useState(inSheet ? sheetFormInitialHeight : 1);

  const measure = useScrollGeometryChange(({ contentHeight }) => {
    // The host reports zero before the sheet lays out the Form.
    if (contentHeight > 0) setHeight(Math.ceil(contentHeight));
  });

  return [height, measure];
}

// In a Screen's aside SwiftUI's Form keeps its rows and cards but does not scroll, at its rows' height.
export function AsideFieldGroup(props: AsideProps): ReactElement {
  const [height, measure] = useFormHeight();

  const modifiers = useMemo(
    () => (measure ? [scrollDisabled(), measure] : [scrollDisabled()]),
    [measure],
  );

  return (
    <AsideHost height={height}>
      <ColumnFieldGroup {...props} style={transparent} modifiers={modifiers} />
    </AsideHost>
  );
}
