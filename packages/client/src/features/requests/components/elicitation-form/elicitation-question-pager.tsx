import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import {
  IconButton,
  type IconButtonProps,
} from '#primitives/buttons/icon-button';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';

type ModelProps = { model: QuestionModel };

type PagerProps = ModelProps & { direction: keyof typeof pages };

const pages = {
  previous: {
    icon: 'chevron-left',
    label: 'Previous question',
    step: -1,
    atEnd: (model: QuestionModel): boolean => model.index === 0,
  },
  next: {
    icon: 'chevron-right',
    label: 'Next question',
    step: 1,
    atEnd: (model: QuestionModel): boolean => model.last,
  },
} as const;

const pagerIconRole = Platform.OS === 'android' ? 'body' : 'secondary';

export function QuestionPager({ model }: ModelProps): ReactElement {
  const wide = useContentWide();

  return (
    <View className="flex-row items-center shrink-0">
      <PagerButton model={model} direction="previous" />
      <PagerButton model={model} direction="next" />
      {wide && <DismissButton model={model} />}
    </View>
  );
}

function PagerButton({ model, direction }: PagerProps): ReactElement {
  const wide = useContentWide();

  return (
    <IconButton
      {...pageProps({ model, direction })}
      iconRole={pagerIconRole}
      variant="ghost"
      className={cn(
        'min-w-0 android:min-w-0 w-7 android:w-8 h-11 sm:w-7 sm:h-11 justify-start pt-0.75',
        wide && 'w-6 h-7 sm:w-6 sm:h-7 justify-center pt-0',
      )}
      iconClassName="text-muted-foreground"
    />
  );
}

function pageProps({
  model,
  direction,
}: PagerProps): Pick<
  IconButtonProps,
  'icon' | 'accessibilityLabel' | 'disabled' | 'onPress'
> {
  const page = pages[direction];

  return {
    icon: page.icon,
    accessibilityLabel: page.label,
    disabled: model.inactive || page.atEnd(model),
    onPress: (): void => model.navigate(model.index + page.step),
  };
}

function DismissButton({ model }: ModelProps): ReactElement {
  return (
    <IconButton
      icon="close"
      variant="ghost"
      accessibilityLabel="Dismiss"
      disabled={model.inactive}
      className="w-6 h-7 sm:w-6 sm:h-7"
      iconClassName="text-muted-foreground"
      onPress={() => model.props.onAnswer({ action: 'cancel' })}
    />
  );
}
