/** @jsxImportSource @argo/plugin-kit */

import * as Kit from '@argo/plugin-kit';

const choices = [{ value: 'dev', label: 'Development' }];

<Kit.TextInput label="Draft" value="" />;

<Kit.Picker
  label="Environment"
  value="dev"
  options={choices}
  onValueChange={(value): void => {
    value.toUpperCase();
  }}
/>;

<Kit.Switch
  value={false}
  onValueChange={(value): void => {
    value.valueOf();
  }}
/>;

<Kit.Checkbox
  label="Archived"
  value={false}
  onValueChange={(value): void => {
    value.valueOf();
  }}
/>;

<Kit.Slider
  value={2}
  minimumValue={0}
  maximumValue={10}
  step={1}
  accessibilityLabel="Concurrency"
  valueLabel="2 jobs"
  onValueChange={(value): void => {
    value.toFixed();
  }}
/>;

<Kit.IconButton icon="add" accessibilityLabel="Add" onPress={(): void => {}} />;

<Kit.SplitButton
  label="Deploy"
  menuLabel="Environment"
  value="dev"
  options={choices}
  onValueChange={(value): void => {
    value.toUpperCase();
  }}
/>;

<Kit.SplitButton
  label="Run"
  menuLabel="More"
  actions={[{ label: 'Retry', onPress: (): void => {} }]}
/>;

<Kit.Button
  label="Edit"
  onPress={{
    action: 'dialog',
    title: 'Edit',
    content: {
      type: 'TextInput',
      key: 'name',
      props: {
        label: 'Name',
        value: '',
        onChangeText: (value): void => {
          value.toUpperCase();
        },
      },
      children: [],
      slots: {},
    },
    onConfirm: (): void => {},
  }}
/>;

<Kit.Switch value={false} />;

<Kit.Checkbox label="Local" value={false} />;

<Kit.Picker label="Local choice" options={choices} />;

const expectsNumber = (_value: number): void => {};

// @ts-expect-error Switch callbacks report booleans.
<Kit.Switch value={false} onValueChange={expectsNumber} />;

// @ts-expect-error TextInput callbacks report strings.
<Kit.TextInput label="Name" value="" onChangeText={expectsNumber} />;
