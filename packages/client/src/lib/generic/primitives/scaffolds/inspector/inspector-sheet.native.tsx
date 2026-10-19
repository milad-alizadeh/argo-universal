import type { ReactElement } from 'react';
import { View } from 'react-native';
import { InspectorActions, InspectorBody } from './inspector-pane';
import type { InspectorProps } from './inspector-props';
import { InspectorSheetFrame } from './inspector-sheet-frame';

/*
 * The stock sheet at its medium detent (a form sheet on iPad), titled like every phone sheet and with no close
 * button: a swipe down or Back closes it. Its Actions sit above the content.
 */
export function InspectorSheet(props: InspectorProps): ReactElement {
  return (
    <InspectorSheetFrame inspector={props} pageTitle={props.title}>
      <SheetContent {...props} />
    </InspectorSheetFrame>
  );
}

function SheetContent(props: InspectorProps): ReactElement {
  return (
    <View testID={props.testID} className="flex-1 bg-content">
      <SheetActions {...props} />
      <InspectorBody {...props} surface="bg-content" />
    </View>
  );
}

function SheetActions(props: InspectorProps): ReactElement | null {
  if (!props.actions) return null;

  return (
    <View className="flex-row justify-end px-4">
      <InspectorActions>{props.actions}</InspectorActions>
    </View>
  );
}
