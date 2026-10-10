import type { ElicitationPropertySchema } from '@repo/contracts';
import type * as React from 'react';
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
import {
  type ElicitationValue,
  elicitationChoices,
} from './elicitation-schema';

export function ElicitationField({
  name,
  property,
  required,
  value,
  error,
  showError,
  onChange,
  onBlur,
  inactive,
}: {
  name: string;
  property: ElicitationPropertySchema;
  required: boolean;
  value: ElicitationValue | undefined;
  error?: string;
  showError: boolean;
  onChange: (value: ElicitationValue) => void;
  onBlur: () => void;
  inactive: boolean;
}): React.JSX.Element {
  const label = property.title ?? name;
  let displayedValue = value;
  if (displayedValue === undefined) {
    displayedValue = '';
    if (property.type === 'array') displayedValue = [];
    if (property.type === 'boolean') displayedValue = false;
  }
  return (
    <View className="gap-1.5">
      {property.type !== 'boolean' && (
        <View className="flex-row items-center gap-1">
          <Text className="type-body">{label}</Text>
          {required && <Text className="type-secondary">Required</Text>}
        </View>
      )}
      <FieldControl
        property={property}
        value={displayedValue}
        present={value !== undefined}
        label={label}
        required={required}
        inactive={inactive}
        invalid={showError && !!error}
        change={onChange}
        onBlur={onBlur}
      />
      {property.description && (
        <Text
          className={cn(
            'type-secondary',
            property.type === 'boolean' && 'pl-7',
          )}
        >
          {property.description}
        </Text>
      )}
      {showError && error && (
        <Text role="alert" className="type-secondary text-destructive">
          {error}
        </Text>
      )}
    </View>
  );
}
function FieldControl({
  property,
  value,
  label,
  inactive,
  required,
  present,
  invalid,
  change,
  onBlur,
}: {
  property: ElicitationPropertySchema;
  value: ElicitationValue;
  label: string;
  inactive: boolean;
  required: boolean;
  present: boolean;
  invalid: boolean;
  change: (value: ElicitationValue) => void;
  onBlur: () => void;
}): React.JSX.Element {
  const options = elicitationChoices(property);
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
        <Text className="min-w-0 flex-1 type-body">
          {label}
          {required ? ' · Required' : ''}
        </Text>
      </View>
    );
  if (options && property.type === 'string')
    return (
      <Select
        value={
          typeof value === 'string' && present
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
          <SelectValue className="type-control" placeholder="Choose…" />
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
            <Text className="type-body">{option.title}</Text>
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
      onBlur={onBlur}
      keyboardType={
        property.type === 'number' || property.type === 'integer'
          ? 'numbers-and-punctuation'
          : 'default'
      }
      className={cn(
        'h-9 sm:h-9 bg-background dark:bg-background type-control',
        invalid && 'border-destructive',
      )}
    />
  );
}
