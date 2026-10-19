import type * as React from 'react';
import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import {
  Combobox,
  type ComboboxContentProps,
} from '#primitives/inputs/combobox';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTitle,
} from '#primitives/overlays/popover';
import { useSheet, type SheetDestination } from '#primitives/overlays/sheet';
import { compareAgainstLabel } from '../../view/changes-comparison';
import type { ComparisonPickerProps } from './comparison-picker';

type ChoicesProps = ComparisonPickerProps & { onClose: () => void };

// The branches to compare with, searchable; choosing one compares from its fork point.
function BranchChoices(props: ChoicesProps): React.JSX.Element {
  return <Combobox.Content {...choicesProps(props)} />;
}

function choicesProps(props: ChoicesProps): ComboboxContentProps<string> {
  const { comparison, branches } = props;

  return {
    label: 'Branches',
    value: comparison.kind === 'branch' ? comparison.branch : undefined,
    options: branches.names.map((name) => ({ value: name, label: name })),
    searchPlaceholder: 'Search branches',
    emptyLabel: 'No branch matches.',
    loading: branches.loading,
    loadError: branches.loadError,
    onValueChange: (branch) =>
      props.onComparisonChange({ kind: 'branch', branch }),
    onClose: props.onClose,
  };
}

const branchPage = 'compare-against';

// Inside a sheet, Compare Against pushes the branches as a page that follows the latest branches.
export function useBranchPage(props: ComparisonPickerProps): () => void {
  const sheet = useSheet();
  const destination = useBranchDestination(props, sheet.back);

  useLayoutEffect(() => sheet.update(destination), [sheet, destination]);

  return () => sheet.push(destination);
}

// The page changes only with the picker's props, so updating it cannot loop through the sheet's own render.
function useBranchDestination(
  props: ComparisonPickerProps,
  back: () => void,
): SheetDestination {
  const { comparison, mainBranch, branches, onComparisonChange } = props;

  return useMemo(
    () =>
      branchDestination(
        { comparison, mainBranch, branches, onComparisonChange },
        back,
      ),
    [comparison, mainBranch, branches, onComparisonChange, back],
  );
}

function branchDestination(
  props: ComparisonPickerProps,
  back: () => void,
): SheetDestination {
  return {
    name: branchPage,
    title: compareAgainstLabel,
    contentScrolls: true,
    children: <BranchChoices {...props} onClose={back} />,
  };
}

type PopoverProps = ComparisonPickerProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

// Elsewhere the branches open on the comparison's trigger, under Compare Against's title.
export function BranchPopover(props: PopoverProps): React.JSX.Element {
  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <PopoverAnchor>{props.children}</PopoverAnchor>
      <BranchPopoverContent {...props} />
    </Popover>
  );
}

function BranchPopoverContent(props: PopoverProps): React.JSX.Element {
  return (
    <PopoverContent align="start" accessibilityLabel={compareAgainstLabel} list>
      <PopoverTitle>{compareAgainstLabel}</PopoverTitle>
      <BranchChoices {...props} onClose={() => props.onOpenChange(false)} />
    </PopoverContent>
  );
}
