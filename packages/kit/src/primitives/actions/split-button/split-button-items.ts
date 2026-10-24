import { declaredActions } from '#primitives/actions/action';
import type { ButtonProps } from '#primitives/actions/button';
import type { MenuAction } from '#primitives/overlays/menu';
import type {
  LaidSplitProps,
  SplitButtonProps,
  SplitRows,
} from './split-button';

type Choose<Value extends string> = (value: Value) => void;

// Only what the split offers besides its button, not its own look.
export function menuRows<Value extends string>(
  props: SplitButtonProps<Value>,
): SplitRows<Value> {
  if (!props.options) return { actions: menuActions(props) };
  const { options, value, onValueChange } = props;

  return { options, value, onValueChange };
}

// A Plugin declares its menu entries as keyed Action children, as a Screen declares them.
function menuActions(props: SplitButtonProps): readonly MenuAction[] {
  return props.actions ?? declaredActions(props.children);
}

// The split's own button, in the primary look when the split is primary.
export function actingButton<Value extends string>(
  props: LaidSplitProps<Value>,
): ButtonProps {
  return {
    ...buttonLook(props),
    label: props.label,
    icon: props.icon,
    onPress: props.onPress,
    variant: props.primary ? 'primary' : 'secondary',
  };
}

function buttonLook<Value extends string>(
  props: LaidSplitProps<Value>,
): Omit<ButtonProps, 'label'> {
  return {
    size: props.size === 'xs' ? 'sm' : 'md',
    fullWidth: props.narrow,
    disabled: props.disabled,
  };
}

/*
 * Every button a phone stacks: each choice, which picks itself and acts, the chosen one carrying the split's look;
 * or the split's own button, then each action.
 */
export function stackedButtons<Value extends string>(
  props: LaidSplitProps<Value>,
  choose: Choose<Value>,
): ButtonProps[] {
  const rows = menuRows(props);

  if ('options' in rows) return choiceButtons(props, rows, choose);

  return [actingButton(props), ...rows.actions.map(actionButton(props))];
}

function choiceButtons<Value extends string>(
  props: LaidSplitProps<Value>,
  rows: Extract<SplitRows<Value>, { options: unknown }>,
  choose: Choose<Value>,
): ButtonProps[] {
  const acting = actingButton(props);

  return rows.options.map((option) => ({
    ...acting,
    label: option.label,
    icon: undefined,
    onPress: () => choose(option.value),
    variant: option.value === rows.value ? acting.variant : 'secondary',
  }));
}

const actionButton =
  <Value extends string>(props: LaidSplitProps<Value>) =>
  (action: MenuAction): ButtonProps => ({
    ...buttonLook(props),
    label: action.label,
    icon: action.icon,
    onPress: action.onPress,
    disabled: props.disabled === true || action.disabled === true,
    variant: action.tone === 'danger' ? 'danger' : 'secondary',
  });
