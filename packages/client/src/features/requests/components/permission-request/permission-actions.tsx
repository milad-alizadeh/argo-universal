import type { PermissionOption } from '@repo/contracts';
import {
  SplitButton,
  type SplitButtonOption,
  type SplitButtonProps,
} from '@repo/kit/primitives/actions/split-button';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { RequestAction } from '../request-card/request-card';
import type { PermissionChoices } from './permission-choices';

export interface PermissionActionsProps {
  choices: PermissionChoices;
  // The option each group's button sends; the chevron changes it.
  leads: Partial<Record<keyof PermissionChoices, PermissionOption>>;
  // The option Enter chooses; it gets the primary style.
  main: PermissionOption;
  disabled: boolean;
  label: (option: PermissionOption) => string;
  onChoose: (option: PermissionOption) => void;
  onPick: (option: PermissionOption) => void;
}

type GroupProps = PermissionActionsProps & { group: keyof PermissionChoices };

type LedGroupProps = Omit<PermissionActionsProps, 'choices' | 'leads'> & {
  options: PermissionOption[];
  lead: PermissionOption;
  menuLabel: string;
};

type OptionActionProps = Pick<
  PermissionActionsProps,
  'main' | 'disabled' | 'label' | 'onChoose'
> & { option: PermissionOption };

const menuLabels = { allow: 'Allow options', reject: 'Reject options' };

// Desktop reads reject then allow in a row; phone stacks allow on top.
const layouts = {
  wide: { className: 'flex-row gap-1', groups: ['reject', 'allow'] },
  phone: { className: 'w-full gap-2', groups: ['allow', 'reject'] },
} as const;

const asChoice = ({
  optionId,
  name,
}: PermissionOption): SplitButtonOption<string> => ({
  value: optionId,
  label: name,
});

// One control per group; a group with several options gets a chevron that picks which one it sends.
export function PermissionActions(props: PermissionActionsProps): ReactNode {
  const layout = useContentWide() ? layouts.wide : layouts.phone;

  return (
    <View className={layout.className}>
      {layout.groups.map((group) => (
        <OptionGroup key={group} {...props} group={group} />
      ))}
    </View>
  );
}

function OptionGroup({ group, ...props }: GroupProps): ReactNode {
  const lead = props.leads[group];

  if (!lead) return null;
  const options = props.choices[group];

  if (options.length === 1) return <OptionAction {...props} option={lead} />;
  const menuLabel = menuLabels[group];

  return <OptionSplitButton {...{ ...props, options, lead, menuLabel }} />;
}

function OptionSplitButton(group: LedGroupProps): ReactNode {
  return <SplitButton {...splitChoices(group)} fullWidth={!useContentWide()} />;
}

// The group in SplitButton's terms: the lead's name and press, option ids as values, the lead as the chosen one.
function splitChoices({
  options,
  lead,
  ...props
}: LedGroupProps): SplitButtonProps<string> {
  return {
    ...leadAction({ ...props, lead }),
    options: options.map(asChoice),
    value: lead.optionId,
    onValueChange: (optionId) => pickById(options, optionId, props.onPick),
    menuLabel: props.menuLabel,
    primary: lead === props.main,
    disabled: props.disabled,
  };
}

// The acting half: the lead's name, and choosing it.
function leadAction(
  group: Pick<LedGroupProps, 'lead' | 'label' | 'onChoose'>,
): Pick<SplitButtonProps, 'label' | 'onPress'> {
  return {
    label: group.label(group.lead),
    onPress: () => group.onChoose(group.lead),
  };
}

function pickById(
  options: PermissionOption[],
  optionId: string,
  onPick: (option: PermissionOption) => void,
): void {
  const picked = options.find((option) => option.optionId === optionId);

  if (picked) onPick(picked);
}

function OptionAction({ option, ...props }: OptionActionProps): ReactNode {
  return (
    <RequestAction
      primary={option === props.main}
      disabled={props.disabled}
      onPress={() => props.onChoose(option)}
    >
      {props.label(option)}
    </RequestAction>
  );
}
