import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { ScrollView } from '#primitives/layout/scroll-view';
import { PinnedFooter } from '#primitives/scaffolds/pinned-footer';

export interface EntryFormProps {
  choice: ReactNode;
  children: ReactNode;
  error?: ReactNode;
  actions: ReactNode;
}

// A short desktop task keeps its actions beside its fields; native Form owns the phone's scroll view.
export function EntryForm(props: EntryFormProps): ReactElement {
  return Platform.OS === 'web' ? (
    <DesktopForm {...props} />
  ) : (
    <NativeForm {...props} />
  );
}

function DesktopForm(props: EntryFormProps): ReactElement {
  return (
    <ScrollView>
      <View className="w-full max-w-content-wide self-center gap-6 pb-6">
        {props.choice}
        {props.children}
        {props.error}
        {props.actions}
      </View>
    </ScrollView>
  );
}

function NativeForm(props: EntryFormProps): ReactElement {
  return (
    <PinnedFooter footer={props.actions}>
      {props.choice}
      {props.children}
      {props.error}
    </PinnedFooter>
  );
}

export function EntryFormActions({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <View className="flex-row flex-wrap justify-end gap-2">{children}</View>
  );
}
