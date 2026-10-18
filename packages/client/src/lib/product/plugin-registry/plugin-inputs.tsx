import type { WireProps } from '@repo/contracts/plugins/kit';
import type { Handler } from '@repo/contracts/plugins/wire';
import { Checkbox } from '#primitives/inputs/checkbox';
import { Picker } from '#primitives/inputs/picker';
import { Slider } from '#primitives/inputs/slider';
import { Switch } from '#primitives/inputs/switch';
import { TextInput } from '#primitives/inputs/text-input';
import { deliverControl } from './plugin-control-state';
import type { RenderContext } from './plugin-rendering';
import { useTextSubmit } from './plugin-text-submit';
import { sendControl, useDraft, useValueControl } from './plugin-value-control';

type Input<Name extends keyof WireProps> = {
  props: WireProps[Name];
  context: RenderContext;
};

type BinaryProps = { context: RenderContext } & (
  | { type: 'Switch'; props: WireProps['Switch'] }
  | { type: 'Checkbox'; props: WireProps['Checkbox'] }
);

export function PluginBinaryControl({
  type,
  props,
  context,
}: BinaryProps): React.JSX.Element {
  const control = useValueControl(props, context);

  return type === 'Checkbox' ? (
    <Checkbox {...props} {...control} />
  ) : (
    <Switch {...props} {...control} />
  );
}

export function PluginPicker({
  props,
  context,
}: Input<'Picker'>): React.JSX.Element {
  const control = useValueControl<string | undefined>(
    { ...props, value: props.value },
    context,
  );

  return <Picker {...props} {...control} />;
}

export function PluginSlider({
  props,
  context,
}: Input<'Slider'>): React.JSX.Element {
  const draft = useDraft(
    props.value,
    sendControl(props.onValueChange, context),
  );

  return <Slider {...props} value={draft.value} onValueChange={draft.change} />;
}

export function PluginTextInput({
  props,
  context,
}: Input<'TextInput'>): React.JSX.Element {
  const draft = useDraft(props.value, textChanged(props.onChangeText, context));
  const submit = useTextSubmit(props.onSubmit, context);

  const control = {
    value: draft.value,
    onChangeText: draft.change,
    onSubmit: submit.onSubmit,
    disabled: props.disabled || submit.pending,
  };

  return <TextInput {...props} {...control} />;
}

function textChanged(
  handler: Handler | undefined,
  context: RenderContext,
): (payload: string) => void {
  return (payload) => {
    void Promise.resolve(
      deliverControl(handler, { event: 'onChangeText', payload }, context),
    ).catch(() => {});
  };
}
