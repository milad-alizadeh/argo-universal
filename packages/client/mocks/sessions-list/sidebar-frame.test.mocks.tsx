import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Scaffold } from '../../src/features/frame/scaffold/scaffold';

export function SidebarFrame({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <Scaffold
      sizeClass="wide"
      sidebarShown
      onSidebarShownChange={() => {}}
      inspectorState="closed"
      onInspectorStateChange={() => {}}
      inspectorAvailable={false}
      workbenchIntent="auto"
      onWorkbenchIntentChange={() => {}}
      sidebar={<View style={{ width: 56 }} />}
      list={<Screen title="Sessions">{children}</Screen>}
      inspector={() => null}
    />
  );
}
