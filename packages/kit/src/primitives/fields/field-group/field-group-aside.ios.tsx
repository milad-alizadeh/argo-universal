import {
  scrollDisabled,
  useScrollGeometryChange,
} from '@expo/ui/swift-ui/modifiers';
import { type ReactElement, type ReactNode, useMemo, useState } from 'react';
import type { FieldGroupKitProps } from '../../kit-props';
import { AsideHost } from './field-group-aside-host.native';
import { ColumnFieldGroup, transparent } from './field-group-form';

type AsideProps = FieldGroupKitProps<'FieldGroup'> & { children?: ReactNode };

// A Form has no height of its own, so it reports its rows' height and the Host takes it (iOS 18, the App's minimum).
function useFormHeight(): [number, ReturnType<typeof useScrollGeometryChange>] {
  const [height, setHeight] = useState(1);

  const measure = useScrollGeometryChange(({ contentHeight }) =>
    setHeight(Math.ceil(contentHeight)),
  );

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
