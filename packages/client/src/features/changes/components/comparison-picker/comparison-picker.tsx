import type * as React from 'react';
import { useState } from 'react';
import { Menu, MenuTrigger } from '#primitives/overlays/menu';
import type { MenuChoiceGroup } from '#primitives/overlays/menu';
import { useOptionalSheet } from '#primitives/overlays/sheet';
import {
  type ChangesComparison,
  allChangesLabel,
  compareAgainstLabel,
  comparisonLabel,
  uncommittedLabel,
} from '../../view/changes-comparison';
import type { ChangesViewProps } from '../../view/changes-view-props';
import { BranchPopover, useBranchPage } from './branch-choices';

export type ComparisonPickerProps = Pick<
  ChangesViewProps,
  'comparison' | 'mainBranch' | 'branches' | 'onComparisonChange'
>;

/*
 * Paper (Flow / Changes comparison): a muted trigger names the comparison; its menu offers All Changes and
 * Uncommitted Changes, then Compare Against, which opens the branches. Inside the phone's Inspector sheet the
 * branches are a pushed page; elsewhere a popover on the trigger, which a phone shows as a sheet.
 */
export function ComparisonPicker(
  props: ComparisonPickerProps,
): React.JSX.Element {
  const sheet = useOptionalSheet();

  return sheet ? <SheetPicker {...props} /> : <PopoverPicker {...props} />;
}

function SheetPicker(props: ComparisonPickerProps): React.JSX.Element {
  const showBranches = useBranchPage(props);

  return <ComparisonMenu {...props} onCompareAgainst={showBranches} />;
}

function PopoverPicker(props: ComparisonPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <BranchPopover {...props} open={open} onOpenChange={setOpen}>
      <ComparisonMenu
        {...props}
        // The menu hands focus back to its trigger as it closes, which would close a popover opened in the same frame.
        onCompareAgainst={() => requestAnimationFrame(() => setOpen(true))}
      />
    </BranchPopover>
  );
}

type MenuProps = ComparisonPickerProps & { onCompareAgainst: () => void };

function ComparisonMenu(props: MenuProps): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel="Comparison"
      align="start"
      trigger={
        <MenuTrigger
          tone="muted"
          label={comparisonLabel(props.comparison, props.mainBranch)}
        />
      }
      groups={comparisonGroups(props)}
    />
  );
}

const wholeValue = (comparison: ChangesComparison): string =>
  comparison.kind === 'branch' ? '' : comparison.kind;

function comparisonGroups(props: MenuProps): MenuChoiceGroup[] {
  return [wholeGroup(props), compareGroup(props)];
}

function wholeGroup(props: MenuProps): MenuChoiceGroup {
  return {
    value: wholeValue(props.comparison),
    options: [
      { value: 'main', label: allChangesLabel(props.mainBranch) },
      { value: 'uncommitted', label: uncommittedLabel },
    ],
    onValueChange: (kind) => {
      if (kind === 'main' || kind === 'uncommitted')
        props.onComparisonChange({ kind });
    },
  };
}

// Compare Against never shows as chosen, so choosing it again still opens the branches.
function compareGroup(props: MenuProps): MenuChoiceGroup {
  return {
    value: '',
    options: [{ value: 'branch', label: compareAgainstLabel }],
    onValueChange: props.onCompareAgainst,
  };
}
