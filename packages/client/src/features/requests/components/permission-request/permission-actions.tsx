import type { PermissionOption } from '@repo/contracts';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { RequestAction } from '../request-card/request-card';
import type { PermissionChoices } from './permission-choices';
import { SplitButton } from './split-button';

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

type GroupProps = Omit<PermissionActionsProps, 'choices' | 'leads'> & {
  options: PermissionOption[];
  lead: PermissionOption | undefined;
  menuLabel: string;
  className?: string;
};

const rejectMenuLabel = 'Reject options';
const allowMenuLabel = 'Allow options';

// One control per group; a group with several options gets a chevron that picks which one it sends.
export function PermissionActions(props: PermissionActionsProps): ReactNode {
  return useContentWide() ? (
    <WideActions {...props} />
  ) : (
    <PhoneActions {...props} />
  );
}

function WideActions({
  choices,
  leads,
  ...props
}: PermissionActionsProps): ReactNode {
  return (
    <View className="flex-row gap-1">
      <OptionGroup
        {...props}
        options={choices.reject}
        lead={leads.reject}
        menuLabel={rejectMenuLabel}
      />
      <OptionGroup
        {...props}
        options={choices.allow}
        lead={leads.allow}
        menuLabel={allowMenuLabel}
      />
    </View>
  );
}

function PhoneActions({
  choices,
  leads,
  ...props
}: PermissionActionsProps): ReactNode {
  return (
    <View className="w-full gap-2">
      <OptionGroup
        {...props}
        options={choices.allow}
        lead={leads.allow}
        menuLabel={allowMenuLabel}
      />
      <OptionGroup
        {...props}
        options={choices.reject}
        lead={leads.reject}
        menuLabel={rejectMenuLabel}
      />
    </View>
  );
}

function OptionGroup({ options, lead, ...props }: GroupProps): ReactNode {
  const wide = useContentWide();
  if (!lead) return null;
  if (options.length === 1) return <OptionAction {...props} option={lead} />;
  return (
    <SplitButton
      choices={options.map(({ optionId, name }) => ({
        value: optionId,
        label: name,
      }))}
      value={lead.optionId}
      onValueChange={(optionId) => {
        const picked = options.find((option) => option.optionId === optionId);
        if (picked) props.onPick(picked);
      }}
      menuLabel={props.menuLabel}
      primary={lead === props.main}
      disabled={props.disabled}
    >
      <OptionAction
        {...props}
        option={lead}
        className={wide ? undefined : 'flex-1'}
      />
    </SplitButton>
  );
}

function OptionAction({
  option,
  main,
  disabled,
  label,
  onChoose,
  className,
}: Omit<GroupProps, 'options' | 'lead' | 'menuLabel' | 'onPick'> & {
  option: PermissionOption;
}): ReactNode {
  return (
    <RequestAction
      primary={option === main}
      disabled={disabled}
      className={className}
      onPress={() => onChoose(option)}
    >
      {label(option)}
    </RequestAction>
  );
}
