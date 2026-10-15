import { RNHostView } from '@expo/ui/swift-ui';
import { Sheet } from '#primitives/overlays/sheet';
import type { PickerProps } from './picker-props';
import { PickerSearchList } from './picker-search-list';

type DrillProps<Value extends string> = PickerProps<Value> & {
  open: boolean;
  onClose: () => void;
};

/*
 * A long list of options opens in its own sheet, titled with the field's label, over any sheet the
 * field sits in. The picker's row lives in a SwiftUI tree, so the sheet's React Native root is hosted.
 */
export function PickerDrillIn<Value extends string>(
  props: DrillProps<Value>,
): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <Sheet {...sheetProps(props)} detents={['large']} contentScrolls>
        <Sheet.Page name="options" title={props.label}>
          <PickerSearchList {...props} />
        </Sheet.Page>
      </Sheet>
    </RNHostView>
  );
}

function sheetProps(
  props: Pick<DrillProps<string>, 'open' | 'onClose' | 'label'>,
): Pick<React.ComponentProps<typeof Sheet>, 'open' | 'onOpenChange' | 'label'> {
  return {
    open: props.open,
    label: props.label,
    onOpenChange: (open): void => {
      if (!open) props.onClose();
    },
  };
}
