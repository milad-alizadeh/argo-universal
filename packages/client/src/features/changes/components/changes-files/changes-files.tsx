import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type * as React from 'react';
import { View } from 'react-native';
import { comparisonKey } from '../../state/changes-state';
import { noChangesDescription } from '../../view/changes-comparison';
import type { ChangesViewProps } from '../../view/changes-view-props';
import { FileList } from './changes-file-list';

const loadingChangesLabel = 'Loading changes';

const loadErrorTitle = "Couldn't load changes";

/*
 * The changed files for the comparison in force, each showing its diff in place and folded once marked Viewed. A
 * failed load is the standard error toast; a failed refresh keeps the files from the last load.
 */
export function ChangesFiles(
  props: ChangesViewProps,
): React.JSX.Element | null {
  useErrorToast(loadErrorToast(props.loadError));

  if (props.files === undefined) return <Pending {...props} />;

  if (!props.files.length) return <NoChanges {...props} />;

  // Each comparison gets its own list, so its files start open again.
  return (
    <FileList
      key={comparisonKey(props.comparison)}
      {...props}
      files={props.files}
    />
  );
}

const loadErrorToast = (message: string | undefined): ErrorToast | undefined =>
  message === undefined ? undefined : { title: loadErrorTitle, message };

// Before the first load settles: a spinner, or nothing once the toast says it failed.
function Pending(
  props: Pick<ChangesViewProps, 'loadError'>,
): React.JSX.Element | null {
  return props.loadError ? null : <LoadingChanges />;
}

function LoadingChanges(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center">
      <Spinner accessibilityLabel={loadingChangesLabel} />
    </View>
  );
}

function NoChanges(
  props: Pick<ChangesViewProps, 'comparison' | 'mainBranch'>,
): React.JSX.Element {
  return (
    <View className="flex-1 justify-center">
      <EmptyState
        icon="diff"
        title="No changes"
        description={noChangesDescription(props.comparison, props.mainBranch)}
      />
    </View>
  );
}
