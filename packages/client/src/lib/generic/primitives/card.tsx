import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text, TextClassContext } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';

const cardClassName =
  'bg-card border-border flex flex-col gap-6 rounded-xl web:rounded-surface web:shadow-card border py-6 shadow-sm shadow-black/5';

function Card({
  className,
  ...props
}: React.ComponentProps<typeof View> &
  React.RefAttributes<View>): ReactElement {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View className={cn(cardClassName, className)} {...props} />
    </TextClassContext.Provider>
  );
}

function CardHeader({
  className,
  ...props
}: React.ComponentProps<typeof View> &
  React.RefAttributes<View>): ReactElement {
  return (
    <View className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />
  );
}

type CardTitleProps = React.ComponentProps<typeof Text> &
  React.RefAttributes<typeof Text>;

function CardTitle(options: CardTitleProps): ReactElement {
  const { className, ref, ...props } = options;
  return (
    <Text
      ref={ref}
      semanticRole="heading"
      aria-level={3}
      className={cn('font-semibold leading-none', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> &
  React.RefAttributes<typeof Text>): ReactElement {
  return (
    <Text
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.ComponentProps<typeof View> &
  React.RefAttributes<View>): ReactElement {
  return <View className={cn('px-6', className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.ComponentProps<typeof View> &
  React.RefAttributes<View>): ReactElement {
  return (
    <View
      className={cn('flex flex-row items-center px-6', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
