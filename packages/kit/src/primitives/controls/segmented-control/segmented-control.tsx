import type { ReactElement } from 'react';
import { cn } from '#kit/utils';
import { Text } from '#primitives/content/text';
import { moveSegment } from './segmented-control-keys';
import type {
  SegmentedControlProps,
  SegmentOption,
} from './segmented-control-props';

// The web track groups one tab stop; native files keep stock segmented controls.
export function SegmentedControl(props: SegmentedControlProps): ReactElement {
  return (
    <div
      role="group"
      aria-label={props.label}
      className={trackClass(props.disabled)}
    >
      {props.options.map((option) => (
        <Segment key={option.value} {...props} option={option} />
      ))}
    </div>
  );
}

type SegmentProps = SegmentedControlProps & { option: SegmentOption };

function Segment(props: SegmentProps): ReactElement {
  return (
    <button {...segmentProps(props)}>
      <Text role="control" selectable={false}>
        {props.option.label}
      </Text>
    </button>
  );
}

const segmentProps = (
  props: SegmentProps,
): React.ButtonHTMLAttributes<HTMLButtonElement> => ({
  type: 'button',
  role: 'button',
  'aria-pressed': props.option.value === props.value,
  disabled: props.disabled || props.option.disabled,
  tabIndex: tabStop(props) ? 0 : -1,
  onClick: () => props.onValueChange(props.option.value),
  onKeyDown: moveSegment,
  className: segmentClass(props.option.value === props.value),
});

function tabStop(props: SegmentProps): boolean {
  const enabled = props.options.filter((option) => !option.disabled);

  const chosen =
    enabled.find((option) => option.value === props.value) ?? enabled[0];

  return chosen?.value === props.option.value;
}

const trackClass = (disabled?: boolean): string =>
  cn(
    'flex min-h-8 gap-0.5 rounded-control bg-tint p-0.5 segmented-control-track',
    disabled && 'opacity-50',
  );

const segmentClass = (selected: boolean): string =>
  cn(
    'min-w-0 flex-1 cursor-pointer rounded-md border-0 px-3 py-1 outline-none disabled:cursor-default',
    selected
      ? 'bg-card segment-selected'
      : 'bg-transparent enabled:hover:bg-hover enabled:active:bg-pressed',
  );
