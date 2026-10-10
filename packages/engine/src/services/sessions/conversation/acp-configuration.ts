import type {
  SessionConfigOption as AcpConfigOption,
  SessionConfigSelectOption as AcpSelectOption,
  SessionConfigSelectGroup as AcpSelectGroup,
} from '@agentclientprotocol/sdk';
import {
  ConfigOptionMeta,
  SessionConfigOptionCategory,
  type SessionConfigOption,
  type SessionConfigSelectOption,
  type SessionConfigSelectGroup,
} from '@repo/contracts';
import type { createRejectionCounter } from '@repo/machine-log';

const readChoice = (choice: AcpSelectOption): SessionConfigSelectOption => ({
  value: choice.value,
  name: choice.name,
  description: choice.description ?? undefined,
  _meta: readMetadata(choice._meta),
});
const readChoiceGroup = (group: AcpSelectGroup): SessionConfigSelectGroup => ({
  groupId: group.group,
  name: group.name,
  options: group.options.map(readChoice),
  _meta: readMetadata(group._meta),
});
const readMetadata = (
  metadata: AcpConfigOption['_meta'],
): SessionConfigOption['_meta'] =>
  metadata == null ? undefined : ConfigOptionMeta.parse(metadata);
const readCategory = (
  category: AcpConfigOption['category'],
): SessionConfigOption['category'] =>
  category == null ? undefined : SessionConfigOptionCategory.parse(category);
const readFields = (
  option: AcpConfigOption,
): Pick<
  SessionConfigOption,
  'configId' | 'name' | 'description' | 'category' | '_meta'
> => ({
  configId: option.id,
  name: option.name,
  description: option.description ?? undefined,
  category: readCategory(option.category),
  _meta: readMetadata(option._meta),
});
const rejectMixedChoices = (): never => {
  throw new Error('Invalid mixed Session configuration choices');
};
// The SDK has checked ACP fields; only Argo's untyped metadata is decoded here.
const readSelectChoices = (
  options: Extract<AcpConfigOption, { type: 'select' }>['options'],
): Extract<SessionConfigOption, { type: 'select' }>['options'] =>
  options.every((choice): choice is AcpSelectGroup => 'group' in choice)
    ? options.map(readChoiceGroup)
    : options.map((choice) =>
        readChoice('group' in choice ? rejectMixedChoices() : choice),
      );
const readOption = (option: AcpConfigOption): SessionConfigOption => {
  const fields = readFields(option);
  return option.type === 'boolean'
    ? { ...fields, type: 'boolean', currentValue: option.currentValue }
    : {
        ...fields,
        type: 'select',
        currentValue: option.currentValue,
        options: readSelectChoices(option.options),
      };
};
export const readAcpConfiguration = (
  options: AcpConfigOption[] | null | undefined,
  rejections: Pick<ReturnType<typeof createRejectionCounter>, 'report'>,
): SessionConfigOption[] => {
  try {
    return (options ?? []).map(readOption);
  } catch (error) {
    rejections.report('Rejected Session configuration metadata', error);
    throw error;
  }
};
