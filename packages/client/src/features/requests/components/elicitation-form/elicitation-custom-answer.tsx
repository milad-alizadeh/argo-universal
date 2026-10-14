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
  appearance: 'bare',
  placeholderTextColorClassName:
    'accent-muted-foreground ios:accent-[#8e8e93] android:accent-[#79747e] dark:ios:accent-muted-foreground dark:android:accent-muted-foreground',
  className:
    'h-9 sm:h-9 flex-1 rounded-none border-0 bg-transparent dark:bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 ios:text-[17px] ios:leading-[22px]',
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

function CustomMark({ selected, multiple }: MarkProps): ReactElement {
  return (
    <View
      aria-hidden
      pointerEvents="none"
      className={cn('ios:hidden', !multiple && 'web:hidden')}
    >
      <CheckboxIndicator
        value={selected}
        appearance="option"
        selection={multiple ? 'multiple' : 'single'}
      />
    </View>
  );
}
