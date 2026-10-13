import { type ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import {
  Checkbox,
  CheckboxIndicator,
} from '#primitives/inputs/checkbox/checkbox';
import { Input } from '#primitives/inputs/input/input';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';

export function ElicitationQuestionOptions({
  model,
}: {
  model: QuestionModel;
}): ReactElement {
  const wide = useContentWide();
  const selected = selectedAnswers(model);
  return (
    <View
      role={model.question.multiple ? 'group' : 'radiogroup'}
      accessibilityLabel={model.question.title}
      className={cn(
        'rounded-xl android:rounded-[16px] p-1 gap-0.5 bg-muted ios:bg-[#f2f2f7] android:bg-[#f3f3f3] dark:ios:bg-muted dark:android:bg-muted',
        wide &&
          'bg-card web:shadow-[0_0_0_1px_#0000000a,0_1px_2px_#0000000a] dark:shadow-none dark:border dark:border-border',
      )}
    >
      {model.question.options.map((option) => (
        <Checkbox
          key={option.const}
          appearance="option"
          selection={model.question.multiple ? 'multiple' : 'single'}
          label={option.title}
          value={selected.includes(option.const)}
          disabled={model.inactive}
          onChange={(checked) =>
            model.change(choiceValue(model, option.const, checked))
          }
        />
      ))}
      <CustomAnswer model={model} />
    </View>
  );
}

function selectedAnswers(model: QuestionModel): string[] {
  if (Array.isArray(model.value)) return model.value;
  return typeof model.value === 'string' ? [model.value] : [];
}

function choiceValue(
  model: QuestionModel,
  choice: string,
  checked: boolean,
): string | string[] {
  if (!model.question.multiple) return choice;
  const values = selectedAnswers(model).filter((answer) => answer !== choice);
  return checked ? [...values, choice] : values;
}

function CustomAnswer({ model }: { model: QuestionModel }): ReactElement {
  const custom =
    selectedAnswers(model).find(
      (answer) =>
        !model.question.options.some((option) => option.const === answer),
    ) ?? '';
  const wide = useContentWide();
  return (
    <View
      className={cn(
        'min-h-12 px-3 flex-row items-center gap-2.5 rounded-lg',
        wide && 'min-h-9 px-2.5',
        custom && 'bg-foreground/4',
      )}
    >
      <CustomMark selected={!!custom} multiple={model.question.multiple} />
      <Input
        accessibilityLabel="Custom answer"
        value={custom}
        placeholder="Something else…"
        placeholderTextColorClassName="accent-muted-foreground ios:accent-[#8e8e93] android:accent-[#79747e] dark:ios:accent-muted-foreground dark:android:accent-muted-foreground"
        editable={!model.inactive}
        onChangeText={(text) => {
          model.change(customValue(model, text));
        }}
        className="h-9 sm:h-9 flex-1 rounded-none border-0 bg-transparent dark:bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 ios:text-[17px] ios:leading-[22px]"
      />
      {!!custom && (
        <View aria-hidden className="hidden ios:flex">
          <CheckboxIndicator value />
        </View>
      )}
    </View>
  );
}

function customValue(model: QuestionModel, text: string): string | string[] {
  if (!model.question.multiple) return text;
  const choices = selectedAnswers(model).filter((answer) =>
    model.question.options.some((option) => option.const === answer),
  );
  return text.trim() ? [...choices, text] : choices;
}

function CustomMark(props: {
  selected: boolean;
  multiple: boolean;
}): ReactElement {
  return (
    <View
      aria-hidden
      pointerEvents="none"
      className={cn('ios:hidden', !props.multiple && 'web:hidden')}
    >
      <CheckboxIndicator
        value={props.selected}
        appearance="option"
        selection={props.multiple ? 'multiple' : 'single'}
      />
    </View>
  );
}
