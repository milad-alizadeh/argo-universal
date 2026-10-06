import type {
  ElicitationPropertySchema,
  PendingElicitation,
  SessionAnswerElicitationInput,
} from '@repo/contracts';
import { PlugIcon, WarningCircleIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Checkbox } from '#primitives/checkbox';
import { Input } from '#primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#primitives/select';
import { Text } from '#primitives/text';
import { useWide } from '../navigation/use-wide';
import { Icon } from './Icon';
import { AlreadyAnswered, RequestAction, RequestCard } from './RequestCard';
import { useRequestShortcuts } from './use-request-shortcuts';

export type ElicitationValues = Record<string, string | boolean | string[]>;
export type ElicitationAnswer = Pick<
  SessionAnswerElicitationInput,
  'action' | 'content'
>;

export interface ElicitationFormProps {
  request: PendingElicitation;
  values: ElicitationValues;
  onValuesChange: (values: ElicitationValues) => void;
  onAnswer: (answer: ElicitationAnswer) => void;
  source?: string;
  submitting?: boolean;
  alreadyAnswered?: string;
  error?: string;
}

function fieldValue(
  property: ElicitationPropertySchema,
  value: ElicitationValues[string] | undefined,
) {
  if (value !== undefined) return value;
  if (property.default !== undefined)
    return typeof property.default === 'number'
      ? String(property.default)
      : property.default;
  if (property.type === 'boolean') return false;
  return property.type === 'array' ? [] : '';
}

function choices(property: ElicitationPropertySchema) {
  if (property.type === 'string')
    return (
      property.oneOf ??
      property.enum?.map((value) => ({ const: value, title: value }))
    );
  if (property.type === 'array')
    return 'anyOf' in property.items
      ? property.items.anyOf
      : property.items.enum.map((value) => ({ const: value, title: value }));
  return undefined;
}

function validateField(
  property: ElicitationPropertySchema,
  value: ElicitationValues[string],
  required: boolean,
): string | undefined {
  const empty = value === '' || (Array.isArray(value) && value.length === 0);
  if (empty) return required ? 'This field is required.' : undefined;
  if (property.type === 'boolean') return undefined;
  if (property.type === 'array') {
    const selected = Array.isArray(value) ? value : [];
    if (property.minItems !== undefined && selected.length < property.minItems)
      return `Choose at least ${property.minItems}.`;
    if (property.maxItems !== undefined && selected.length > property.maxItems)
      return `Choose at most ${property.maxItems}.`;
    if (
      selected.some(
        (item) => !choices(property)?.some((option) => option.const === item),
      )
    )
      return 'Choose an available option.';
    return undefined;
  }
  const text = String(value);
  if (property.type === 'number' || property.type === 'integer') {
    const number = Number(text);
    if (
      !text.trim() ||
      !Number.isFinite(number) ||
      (property.type === 'integer' && !Number.isInteger(number))
    )
      return property.type === 'integer'
        ? 'Enter a whole number.'
        : 'Enter a number.';
    if (
      (property.minimum !== undefined && number < property.minimum) ||
      (property.maximum !== undefined && number > property.maximum)
    ) {
      if (property.minimum !== undefined && property.maximum !== undefined)
        return `Enter ${property.type === 'integer' ? 'a whole number' : 'a number'} from ${property.minimum} to ${property.maximum}.`;
      if (property.minimum !== undefined)
        return `Enter ${property.minimum} or more.`;
      return `Enter ${property.maximum} or less.`;
    }
    return undefined;
  }
  if (property.minLength !== undefined && text.length < property.minLength)
    return `Enter at least ${property.minLength} characters.`;
  if (property.maxLength !== undefined && text.length > property.maxLength)
    return `Enter at most ${property.maxLength} characters.`;
  const options = choices(property);
  if (options && !options.some((option) => option.const === text))
    return 'Choose an available option.';
  if (property.pattern) {
    try {
      if (!new RegExp(property.pattern).test(text))
        return 'Use the requested format.';
    } catch {
      return 'The requested format is invalid.';
    }
  }
  if (property.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
    return 'Enter an email address.';
  if (property.format === 'uri') {
    try {
      new URL(text);
    } catch {
      return 'Enter a complete URL.';
    }
  }
  if (
    (property.format === 'date' || property.format === 'date-time') &&
    (!/^\d{4}-\d{2}-\d{2}/.test(text) || !Number.isFinite(Date.parse(text)))
  )
    return `Enter a valid ${property.format === 'date' ? 'date' : 'date and time'}.`;
  return undefined;
}

export function ElicitationForm({
  request,
  values,
  onValuesChange,
  onAnswer,
  source,
  submitting = false,
  alreadyAnswered,
  error,
}: ElicitationFormProps) {
  const wide = useWide();
  const inactive = submitting || !!alreadyAnswered;
  const fields = Object.entries(request.requestedSchema.properties).map(
    ([name, property]) => {
      const value = fieldValue(property, values[name]);
      const required =
        request.requestedSchema.required?.includes(name) ?? false;
      return {
        name,
        property,
        value,
        required,
        error: validateField(property, value, required),
      };
    },
  );
  const invalid = fields.filter((field) => field.error);
  const answer = (action: ElicitationAnswer['action']) => {
    if (inactive || (action === 'accept' && invalid.length)) return;
    const content: Record<string, unknown> = {};
    for (const { name, property, value } of fields) {
      if (value === '' || (Array.isArray(value) && !value.length)) continue;
      content[name] =
        property.type === 'number' || property.type === 'integer'
          ? Number(value)
          : value;
    }
    onAnswer(action === 'accept' ? { action, content } : { action });
  };
  const nativeId = useRequestShortcuts({
    inactive,
    onEnter: () => answer('accept'),
  });
  return (
    <RequestCard nativeID={nativeId}>
      <View
        className={cn(alreadyAnswered && 'opacity-50')}
        pointerEvents={inactive ? 'none' : 'auto'}
      >
        <View className="gap-1 px-4 pt-4 pb-1">
          {source && (
            <View className="flex-row items-center gap-1.5">
              <Icon as={PlugIcon} className="size-4 text-muted-foreground" />
              <Text className="text-sm leading-5 text-muted-foreground">
                {source} asks
              </Text>
            </View>
          )}
          <Text className="text-sm font-semibold leading-5.5">
            {request.message}
          </Text>
        </View>
        <View className="gap-4 px-4 pt-3 pb-1">
          {fields.map(
            ({ name, property, value, required, error: fieldError }) => {
              const label = property.title ?? name;
              const change = (next: ElicitationValues[string]) =>
                onValuesChange({ ...values, [name]: next });
              const showError =
                fieldError &&
                (values[name] !== undefined || property.default !== undefined);
              return (
                <View key={name} className="gap-1.5">
                  {property.type !== 'boolean' && (
                    <View className="flex-row items-center gap-1">
                      <Text className="text-sm font-medium leading-5">
                        {label}
                      </Text>
                      {required && (
                        <Text className="text-sm leading-5 text-muted-foreground">
                          Required
                        </Text>
                      )}
                    </View>
                  )}
                  <ElicitationFieldControl
                    property={property}
                    value={value}
                    label={label}
                    inactive={inactive}
                    required={required}
                    invalid={!!showError}
                    change={change}
                  />
                  {property.description && (
                    <Text
                      className={cn(
                        'text-sm leading-5 text-muted-foreground',
                        property.type === 'boolean' && 'pl-7',
                      )}
                    >
                      {property.description}
                    </Text>
                  )}
                  {showError && (
                    <Text
                      role="alert"
                      className="text-sm leading-5 text-destructive"
                    >
                      {fieldError}
                    </Text>
                  )}
                </View>
              );
            },
          )}
        </View>
      </View>
      {!alreadyAnswered && invalid.length > 0 && (
        <View role="alert" className="flex-row items-center gap-1.5 px-4 pt-3">
          <Icon
            as={WarningCircleIcon}
            className="size-4 shrink-0 text-destructive"
          />
          <Text className="min-w-0 flex-1 text-sm leading-5 text-destructive">
            Fix{' '}
            {invalid
              .map(({ name, property }) => property.title ?? name)
              .join(', ')}{' '}
            to submit
          </Text>
        </View>
      )}
      {error && (
        <Text
          role="alert"
          className="px-4 pt-3 text-sm leading-5 text-destructive"
        >
          {error}
        </Text>
      )}
      <View className="min-h-13 flex-row items-center justify-between gap-1 px-2 pt-3 pb-2">
        {alreadyAnswered && <AlreadyAnswered reason={alreadyAnswered} />}
        {(!alreadyAnswered || wide) && (
          <>
            <RequestAction disabled={inactive} onPress={() => answer('cancel')}>
              Dismiss
            </RequestAction>
            <View className="flex-row gap-1">
              <RequestAction
                disabled={inactive}
                onPress={() => answer('decline')}
              >
                Decline
              </RequestAction>
              <RequestAction
                primary
                disabled={inactive || invalid.length > 0}
                onPress={() => answer('accept')}
              >
                {submitting ? 'Sending…' : 'Submit'}
              </RequestAction>
            </View>
          </>
        )}
      </View>
    </RequestCard>
  );
}

function ElicitationFieldControl({
  property,
  value,
  label,
  inactive,
  required,
  invalid,
  change,
}: {
  property: ElicitationPropertySchema;
  value: ElicitationValues[string];
  label: string;
  inactive: boolean;
  required: boolean;
  invalid: boolean;
  change: (value: ElicitationValues[string]) => void;
}) {
  const options = choices(property);
  if (property.type === 'boolean')
    return (
      <View className="flex-row items-start gap-3">
        <View className="h-5 justify-center">
          <Checkbox
            accessibilityLabel={label}
            checked={value === true}
            disabled={inactive}
            onCheckedChange={change}
          />
        </View>
        <Text className="min-w-0 flex-1 text-sm font-medium leading-5">
          {label}
          {required ? ' · Required' : ''}
        </Text>
      </View>
    );
  if (options && property.type === 'string')
    return (
      <Select
        value={
          typeof value === 'string' && value
            ? {
                value,
                label:
                  options.find((option) => option.const === value)?.title ??
                  value,
              }
            : undefined
        }
        onValueChange={(option) => change(option?.value ?? '')}
        disabled={inactive}
      >
        <SelectTrigger
          accessibilityLabel={label}
          disabled={inactive}
          className={cn(
            'h-9 sm:h-9 w-full! bg-background dark:bg-background',
            invalid && 'border-destructive',
          )}
        >
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.const}
              value={option.const}
              label={option.title}
            />
          ))}
        </SelectContent>
      </Select>
    );
  if (options && property.type === 'array')
    return (
      <View className="gap-3">
        {options.map((option) => (
          <View key={option.const} className="flex-row items-center gap-3">
            <Checkbox
              accessibilityLabel={option.title}
              disabled={inactive}
              checked={Array.isArray(value) && value.includes(option.const)}
              onCheckedChange={(checked) =>
                change(
                  checked
                    ? [...(Array.isArray(value) ? value : []), option.const]
                    : (Array.isArray(value) ? value : []).filter(
                        (item) => item !== option.const,
                      ),
                )
              }
            />
            <Text className="text-sm leading-5">{option.title}</Text>
          </View>
        ))}
      </View>
    );
  return (
    <Input
      accessibilityLabel={label}
      value={String(value)}
      editable={!inactive}
      onChangeText={change}
      keyboardType={
        property.type === 'number' || property.type === 'integer'
          ? 'numbers-and-punctuation'
          : 'default'
      }
      className={cn(
        'h-9 sm:h-9 bg-background dark:bg-background text-sm leading-5',
        invalid && 'border-destructive',
      )}
    />
  );
}
