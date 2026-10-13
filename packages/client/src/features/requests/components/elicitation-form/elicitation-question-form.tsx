import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Button } from '#primitives/buttons/button/button';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';
import { Icon } from '#primitives/display/icon/icon';
import { Text } from '#primitives/display/text/text';
import {
  useElicitationQuestions,
  type QuestionModel,
} from '../../hooks/use-elicitation-questions';
import { RequestCard } from '../request-card/request-card';
import type { ElicitationFormProps } from './elicitation-form-props';
import { ElicitationQuestionOptions } from './elicitation-question-options';
import type { ElicitationQuestion } from './elicitation-questions';

export function ElicitationQuestionForm(
  props: ElicitationFormProps & {
    questions: ElicitationQuestion[];
  },
): ReactElement {
  const model = useElicitationQuestions(props, props.questions);
  return <ElicitationQuestionBody model={model} />;
}

export function ElicitationQuestionBody({
  model,
}: {
  model: QuestionModel;
}): ReactElement {
  const props = model.props;
  const wide = useContentWide();
  return (
    <RequestCard
      state={props.state}
      error={props.error}
      onEnter={model.advance}
      onEscape={() => props.onAnswer({ action: 'cancel' })}
      className="rounded-none bg-transparent native:bg-transparent shadow-none web:backdrop-blur-none"
      footerClassName={cn(
        'min-h-0 px-4 pt-4 pb-0 gap-2 flex-col items-stretch',
        wide && 'px-3 pt-3 pb-3.5 flex-row justify-end gap-1',
      )}
      actions={<QuestionActions model={model} />}
    >
      <View
        className={cn('px-4 pt-1 ios:pt-9 gap-4', wide && 'px-3 pt-3 gap-3')}
      >
        <QuestionHeader model={model} />
        <ElicitationQuestionOptions key={model.question.name} model={model} />
      </View>
    </RequestCard>
  );
}

function QuestionHeader({ model }: { model: QuestionModel }): ReactElement {
  const wide = useContentWide();
  return (
    <View className={cn('flex-row items-start gap-2 px-4', wide && 'px-3.5')}>
      <View className={cn('min-w-0 flex-1 gap-0.5', wide && 'pt-1')}>
        <View className="flex-row items-start gap-2.5">
          <Icon
            name="question-bubble"
            role="body"
            className="text-muted-foreground ios:text-[#8e8e93] android:text-[#1c1b1f] dark:ios:text-muted-foreground dark:android:text-foreground"
          />
          <Text
            role="heading"
            aria-level={2}
            className="min-w-0 flex-1 ios:text-[17px] ios:leading-[22px] android:text-[18px] android:leading-6 android:font-medium ios:text-black android:text-[#1c1b1f] dark:ios:text-foreground dark:android:text-foreground"
          >
            {model.question.title}
          </Text>
        </View>
        <Text
          role="secondary"
          className={cn(
            'pl-7.5 text-muted-foreground ios:text-[15px] ios:leading-5 ios:text-[#8e8e93] android:text-[#49454f] dark:ios:text-muted-foreground dark:android:text-muted-foreground',
            wide && 'pl-6.5',
          )}
        >
          {model.question.multiple ? 'Choose one or more' : 'Choose one'} ·{' '}
          {model.index + 1} of {model.count}
        </Text>
      </View>
      <QuestionPager model={model} />
    </View>
  );
}

function QuestionPager({ model }: { model: QuestionModel }): ReactElement {
  const wide = useContentWide();
  return (
    <View className="flex-row items-center shrink-0">
      <IconButton
        icon="chevron-left"
        iconRole={Platform.OS === 'android' ? 'body' : 'secondary'}
        variant="ghost"
        accessibilityLabel="Previous question"
        disabled={model.inactive || model.index === 0}
        className={cn(
          'min-w-0 android:min-w-0 w-7 android:w-8 h-11 sm:w-7 sm:h-11 justify-start pt-0.75',
          wide && 'w-6 h-7 sm:w-6 sm:h-7 justify-center pt-0',
        )}
        iconClassName="text-muted-foreground"
        onPress={() => model.navigate(model.index - 1)}
      />
      <IconButton
        icon="chevron-right"
        iconRole={Platform.OS === 'android' ? 'body' : 'secondary'}
        variant="ghost"
        accessibilityLabel="Next question"
        disabled={model.inactive || model.last}
        className={cn(
          'min-w-0 android:min-w-0 w-7 android:w-8 h-11 sm:w-7 sm:h-11 justify-start pt-0.75',
          wide && 'w-6 h-7 sm:w-6 sm:h-7 justify-center pt-0',
        )}
        iconClassName="text-muted-foreground"
        onPress={() => model.navigate(model.index + 1)}
      />
      {wide && (
        <IconButton
          icon="close"
          variant="ghost"
          accessibilityLabel="Dismiss"
          disabled={model.inactive}
          className="w-6 h-7 sm:w-6 sm:h-7"
          iconClassName="text-muted-foreground"
          onPress={() => model.props.onAnswer({ action: 'cancel' })}
        />
      )}
    </View>
  );
}

function QuestionActions({ model }: { model: QuestionModel }): ReactElement {
  const wide = useContentWide();
  const submit = (
    <Button
      appearance="content"
      size="sm"
      fullWidth={!wide}
      label={actionLabel(model)}
      disabled={model.inactive || !model.canAdvance}
      loading={model.props.state.kind === 'submitting'}
      onPress={model.advance}
      className={cn('android:min-h-12', wide && 'px-3.5')}
    />
  );
  const skip = (
    <Button
      appearance="content"
      size="sm"
      fullWidth={!wide}
      label="Skip"
      variant={wide ? 'ghost' : 'outline'}
      disabled={model.inactive}
      className="android:min-h-12 android:border-neutral-500"
      onPress={model.skip}
    />
  );
  return (
    <>
      {wide ? skip : submit}
      {wide ? submit : skip}
    </>
  );
}

function actionLabel(model: QuestionModel): string {
  if (model.props.state.kind === 'submitting') return 'Sending…';
  return model.last ? 'Submit' : 'Next';
}
