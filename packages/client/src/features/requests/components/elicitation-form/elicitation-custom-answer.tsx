import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { CheckboxIndicator } from '#primitives/inputs/checkbox';
import { TextInput } from '#primitives/inputs/text-input';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { customAnswer, customValue } from './elicitation-answers';

type ModelProps = { model: QuestionModel };

type MarkProps = { selected: boolean; multiple: boolean };

export function CustomAnswer({ model }: ModelProps): ReactElement {
  const custom = customAnswer(model);
  const wide = useContentWide();

  return (
    <View className={customRowClassName(wide, custom)}>
      <CustomMark selected={!!custom} multiple={model.question.multiple} />
      <CustomInput model={model} />
      {!!custom && (
        <View aria-hidden className="hidden ios:flex">
          <CheckboxIndicator value />
        </View>
      )}
    </View>
  );
}

function customRowClassName(wide: boolean, custom: string): string {
  return cn(
    'min-h-12 px-3 flex-row items-center gap-2.5 rounded-lg',
    wide && 'min-h-9 px-2.5',
    custom && 'bg-foreground/4',
  );
}

const customInputLook = {
  variant: 'bare',
  placeholderTextColorClassName: 'accent-muted-foreground',
  className:
    'h-9 sm:h-9 flex-1 rounded-none border-0 bg-transparent dark:bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 web:rounded-none web:focus-visible:ring-0 web:focus-visible:border-transparent ios:text-row ios:leading-row',
} as const;

function CustomInput({ model }: ModelProps): ReactElement {
  return (
    <TextInput
      {...customInputLook}
      accessibilityLabel="Custom answer"
      value={customAnswer(model)}
      placeholder="Something else…"
      editable={!model.inactive}
      onChangeText={(text: string) => {
        model.change(customValue(model, text));
      }}
    />
  );
}

const markClassName = (multiple: boolean): string =>
  cn('pointer-events-none ios:hidden', !multiple && 'web:hidden');

function CustomMark({ selected, multiple }: MarkProps): ReactElement {
  return (
    <View aria-hidden className={markClassName(multiple)}>
      <CheckboxIndicator
        value={selected}
        variant="option"
        selection={multiple ? 'multiple' : 'single'}
      />
    </View>
  );
}
