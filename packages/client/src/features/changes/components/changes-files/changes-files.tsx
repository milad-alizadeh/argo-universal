import * as React from 'react';
import { View } from 'react-native';
import { DiffFileHeader, DiffView, type FileDiff } from '#features/feed';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';
import { EmptyState } from '#primitives/status/empty-state';
import { Spinner } from '#primitives/status/spinner';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { noChangesDescription } from '../../view/changes-comparison';
import { uniqueChangedFiles } from '../../view/changes-files';
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

  const files = uniqueChangedFiles(props.files);

  return <FileList {...props} files={files} />;
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
  const phone = <InlineFiles {...props} />;
  const desktop = props.onFileSelect ? <StageFiles {...props} /> : phone;

  return <SizeClass compact={phone} medium={desktop} wide={desktop} />;
}

function InlineFiles(
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

type FileDiffRowProps = Pick<ChangesViewProps, 'viewed' | 'onViewedChange'> & {
  file: FileDiff;
  initialOpen?: boolean;
};

function FileDiffRow(props: FileDiffRowProps): React.JSX.Element {
  const { file } = props;

  return (
    <DiffView
      file={file}
      initialOpen={props.initialOpen}
      viewed={props.viewed.includes(file.path)}
      onViewedChange={(viewed) => props.onViewedChange(file.path, viewed)}
    />
  );
}

// The branch list opens one file directly; the comparison is still the branch's comparison.
type BranchFilesProps = ChangesViewProps & { files: readonly FileDiff[] };

function StageFiles(
  props: ChangesViewProps & { files: readonly FileDiff[] },
): React.JSX.Element {
  const selected = props.files.find((file) => file.path === props.selectedFile);

  if (selected) return <FileDiffRow {...props} file={selected} initialOpen />;

  return <BranchFiles {...props} />;
}

function BranchFiles(props: BranchFilesProps): React.JSX.Element {
  return (
    <View className="bg-content">
      {props.files.map((file, index) => (
        <StageFileBoundary
          key={file.path}
          {...props}
          file={file}
          separated={index > 0}
        />
      ))}
    </View>
  );
}

function StageFile(
  props: ChangesViewProps & { file: FileDiff },
): React.JSX.Element {
  const { file } = props;

  return (
    <DiffFileHeader
      file={file}
      open={false}
      onOpenChange={() => props.onFileSelect?.(file.path)}
      viewed={props.viewed.includes(file.path)}
      onViewedChange={(viewed) => props.onViewedChange(file.path, viewed)}
    />
  );
}

// Separators belong to file boundaries, so neither edge of the list draws an extra line.
function StageFileBoundary(
  props: ChangesViewProps & { file: FileDiff; separated: boolean },
): React.JSX.Element {
  return (
    <>
      {props.separated && <View className="h-px bg-border" />}
      <StageFile {...props} />
    </>
  );
}
