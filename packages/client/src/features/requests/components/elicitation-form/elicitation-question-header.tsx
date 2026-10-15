import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { QuestionPager } from './elicitation-question-pager';

type ModelProps = { model: QuestionModel };

export function QuestionHeader({ model }: ModelProps): ReactElement {
  const wide = useContentWide();

  return (
    <View className={cn('flex-row items-start gap-2 px-4', wide && 'px-3.5')}>
      <View className={cn('min-w-0 flex-1 gap-0.5', wide && 'pt-1')}>
        <QuestionTitle title={model.question.title} />
        <QuestionProgress model={model} />
      </View>
      <QuestionPager model={model} />
    </View>
  );
}

function QuestionTitle({ title }: { title: string }): ReactElement {
  return (
    <View className="flex-row items-start gap-2.5">
      <QuestionIcon />
      <Text
        role="heading"
        aria-level={2}
        className="min-w-0 flex-1 ios:text-[17px] ios:leading-[22px] android:text-[18px] android:leading-6 android:font-medium text-foreground"
      >
        {title}
      </Text>
    </View>
  );
}

function QuestionIcon(): ReactElement {
  return (
    <Icon
      name="question-bubble"
      role="body"
      className="text-muted-foreground android:text-foreground"
    />
  );
}

function QuestionProgress({ model }: ModelProps): ReactElement {
  const wide = useContentWide();

  return (
    <Text
      role="secondary"
      className={cn(
        'pl-7.5 text-muted-foreground ios:text-[15px] ios:leading-5',
        wide && 'pl-6.5',
      )}
    >
      {model.question.multiple ? 'Choose one or more' : 'Choose one'} ·{' '}
      {model.index + 1} of {model.count}
    </Text>
  );
}
