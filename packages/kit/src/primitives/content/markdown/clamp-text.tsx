import type { ReactElement } from 'react';
import { useContext } from 'react';
import { Text, type TextProps, type TextRole } from '#primitives/content/text';
import { ClampLeaves, useClampText } from './clamp-leaves';
import { MarkdownSelectable } from './markdown-tone';

type ClampTextProps = TextProps & { role: TextRole };

function ClampedText(props: ClampTextProps): ReactElement {
  return <Text {...useClampText(props.role)} {...props} />;
}

// Text a clamp may cut between the lines of. Only a clamp reads its line height: resolving a class draws its component twice and reads the page's styles each time, too much for every paragraph of a Feed.
export function ClampText(props: ClampTextProps): ReactElement {
  const selectable = useContext(MarkdownSelectable);

  return useContext(ClampLeaves) ? (
    <ClampedText selectable={selectable} {...props} />
  ) : (
    <Text selectable={selectable} {...props} />
  );
}
