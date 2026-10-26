import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { ScreenHeaderItems, screenTitleOptions } from './screen-header-items';
import type { ScreenHeaderPlanned } from './screen-props';
import { selectionOptions } from './screen-selection-options';

// The navigator's entry for the Screen; its header shows only where the plan draws it there.
export function ScreenNavigation(props: ScreenHeaderPlanned): ReactNode {
  if (!props.plan.stackEntry) return null;

  return <StackHeader {...props} />;
}

function StackHeader(props: ScreenHeaderPlanned): ReactElement {
  const shown = props.plan.site === 'stack';

  const options = {
    ...titleOptions(props.title ?? '', shown),
    ...selectionOptions(props.declaration.selection),
  };

  return (
    <>
      <Stack.Screen options={options} />
      {shown ? <ScreenHeaderItems {...props} /> : null}
    </>
  );
}

// Where the Screen draws its own heading, the stack's header hides.
function titleOptions(
  title: string,
  shown: boolean,
): NativeStackNavigationOptions {
  return { ...screenTitleOptions, title, headerShown: shown };
}
