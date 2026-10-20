import type * as React from 'react';
import { View } from 'react-native';
import { DiffView, type FileDiff } from '#features/feed';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';
import { EmptyState } from '#primitives/status/empty-state';
import { Spinner } from '#primitives/status/spinner';
import { noChangesDescription } from '../../view/changes-comparison';
import type { ChangesViewProps } from '../../view/changes-view-props';

export const loadingChangesLabel = 'Loading changes';

export const loadErrorTitle = "Couldn't load changes";

/*
 * The changed files for the comparison in force, each with its diff, folded once marked Viewed. A failed load is
 * the standard error toast; a failed refresh keeps the files from the last load.
 */
export function ChangesFiles(
  props: ChangesViewProps,
): React.JSX.Element | null {
  useErrorToast(loadErrorToast(props.loadError));

  if (props.files === undefined) return <Pending {...props} />;

  if (!props.files.length) return <NoChanges {...props} />;

  return <FileList {...props} files={props.files} />;
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

function FileList(
  props: ChangesViewProps & { files: NonNullable<ChangesViewProps['files']> },
): React.JSX.Element {
  return (
    <View className="gap-2 medium:gap-0 medium:bg-content">
      {props.files.map((file) => (
        <FileDiffRow key={file.path} {...props} file={file} />
      ))}
    </View>
  );
}

function FileDiffRow(
  props: Pick<ChangesViewProps, 'viewed' | 'onViewedChange'> & {
    file: FileDiff;
  },
): React.JSX.Element {
  const { file } = props;

  return (
    <DiffView
      file={file}
      viewed={props.viewed.includes(file.path)}
      onViewedChange={(viewed) => props.onViewedChange(file.path, viewed)}
    />
  );
}
