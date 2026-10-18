import type { WireProps } from '@repo/contracts/plugins/kit';
import { Button } from '#primitives/actions/button';
import { IconButton } from '#primitives/actions/icon-button';
import { SplitButton } from '#primitives/actions/split-button';
import type { MenuAction } from '#primitives/overlays/menu';
import { usePluginPress, type PluginPress } from './plugin-press';
import type { RenderContext } from './plugin-rendering';
import { useValueControl } from './plugin-value-control';

type Input<Name extends keyof WireProps> = {
  props: WireProps[Name];
  context: RenderContext;
};

type SplitChoices = Extract<
  WireProps['SplitButton'],
  { options: readonly unknown[] }
>;

type ChoiceInput = { props: SplitChoices; context: RenderContext };

type SplitActions = Extract<
  WireProps['SplitButton'],
  { actions: readonly unknown[] }
>;

export function PluginButton({
  props,
  context,
}: Input<'Button'>): React.JSX.Element {
  const press = usePluginPress(context);

  return (
    <Button
      {...props}
      loading={props.loading || press.pending}
      onPress={press.handler(props.onPress)}
    />
  );
}

export function PluginIconButton({
  props,
  context,
}: Input<'IconButton'>): React.JSX.Element {
  const press = usePluginPress(context);

  return (
    <IconButton
      {...props}
      loading={props.loading || press.pending}
      onPress={press.handler(props.onPress)}
    />
  );
}

export function PluginSplitButton(
  input: Input<'SplitButton'>,
): React.JSX.Element {
  return input.props.options ? (
    <PluginSplitChoices {...input} props={input.props} />
  ) : (
    <PluginSplitActions {...input} props={input.props} />
  );
}

function PluginSplitChoices({
  props,
  context,
}: ChoiceInput): React.JSX.Element {
  const control = useValueControl<string>(props, context);

  const press = usePluginPress(context);

  const attributes = {
    ...props,
    ...control,
    ...primaryProps(props, press),
    disabled: control.disabled || press.pending,
  };

  return <SplitButton {...attributes} />;
}

function PluginSplitActions({
  props,
  context,
}: {
  props: SplitActions;
  context: RenderContext;
}): React.JSX.Element {
  const press = usePluginPress(context);

  const attributes = {
    ...props,
    ...primaryProps(props, press),
    actions: secondaryActions(props.actions, press),
  };

  return <SplitButton {...attributes} />;
}

function secondaryActions(
  actions: SplitActions['actions'],
  press: PluginPress,
): readonly MenuAction[] {
  return actions.map((action, index) => ({
    ...action,
    onPress: (): void => {
      press.handler(action.onPress, {
        event: 'onAction',
        payload: { path: ['actions', String(index), 'onPress'] },
      })?.();
    },
  }));
}

type PrimaryProps = {
  disabled: boolean | undefined;
  onPress: (() => void) | undefined;
};

function primaryProps(
  props: WireProps['SplitButton'],
  press: PluginPress,
): PrimaryProps {
  return {
    disabled: props.disabled || press.pending,
    onPress: press.handler(props.onPress),
  };
}
