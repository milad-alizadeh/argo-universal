import type { ReactElement } from 'react';
import { Icon, IconSizeContext } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { Chevron } from '#primitives/status/chevron';
import type { PillProps } from './pill-props';

export function PillControlContent(props: PillProps): ReactElement {
  return (
    <IconSizeContext value={{ size: 'sm', fixed: true }}>
      <PillLeading {...props} />
      {!props.iconOnly && <PillWords {...props} />}
    </IconSizeContext>
  );
}

function PillLeading(props: PillProps): ReactElement | null {
  if (props.leading) return props.leading;

  return props.icon ? <Icon name={props.icon} tone={props.tone} /> : null;
}

function PillWords(props: PillProps): ReactElement {
  return (
    <>
      <PillCount {...props} />
      <PillLabel {...props} />
      <PillDetail {...props} />
      {props.trailing}
      {props.disclosure && <Chevron direction={props.disclosure} />}
    </>
  );
}

function PillCount({ count, countTone }: PillProps): ReactElement | null {
  return count === undefined ? null : (
    <Text role="control" tone={countTone} selectable={false}>
      {count}
    </Text>
  );
}

function PillDetail({ detail }: PillProps): ReactElement | null {
  return detail ? (
    <Text
      role="control"
      tone="muted"
      numberOfLines={1}
      selectable={false}
      className="min-w-0 shrink select-none"
    >
      {detail}
    </Text>
  ) : null;
}

function PillLabel({ text, tone }: PillProps): ReactElement {
  return (
    <Text
      role="control"
      tone={tone}
      numberOfLines={1}
      selectable={false}
      className="min-w-0 shrink select-none"
    >
      {text}
    </Text>
  );
}
