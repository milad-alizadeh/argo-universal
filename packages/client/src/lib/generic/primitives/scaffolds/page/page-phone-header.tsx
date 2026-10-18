import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { PageHeaderItems, pageTitleOptions } from './page-header-items';
import type { PageProps } from './page-props';

export function PagePhoneHeader(
  props: PageProps & { wide: boolean },
): ReactElement {
  const options = {
    ...pageTitleOptions,
    title: props.title,
    headerShown: !props.wide,
  };

  return (
    <>
      <Stack.Screen options={options} />
      {props.wide ? null : <PageHeaderItems {...props} />}
    </>
  );
}
