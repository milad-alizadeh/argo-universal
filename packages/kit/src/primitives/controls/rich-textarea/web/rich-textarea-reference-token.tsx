import type * as React from 'react';
import { createContext, useContext } from 'react';
import { Icon } from '#primitives/content/icon';
import { type ReferenceOption, shortTitle } from '../rich-textarea-references';
import { ReferenceTokenContext } from './rich-textarea-reference-node';

// The Issues and pull requests a token can name; a token with no match still shows its number.
export const ReferencesContext = createContext<readonly ReferenceOption[]>([]);

export function ReferenceGlyph({
  state,
}: Pick<ReferenceOption, 'state'>): React.JSX.Element {
  return state === 'open' ? (
    <Icon name="issue" className="text-success" />
  ) : (
    <Icon name="passed" className="text-done" />
  );
}

interface LabelProps {
  number: number;
  option: ReferenceOption | undefined;
}

function TokenLabel({ number, option }: LabelProps): React.JSX.Element {
  if (!option) return <span>#{number}</span>;

  return (
    <>
      <ReferenceGlyph state={option.state} />
      <span>#{number}</span>
      <span className="text-muted-foreground">{shortTitle(option.title)}</span>
    </>
  );
}

export function ReferenceToken({
  number,
}: {
  number: number;
}): React.JSX.Element {
  const references = useContext(ReferencesContext);
  const option = references.find((candidate) => candidate.number === number);

  return (
    <span className="mx-px inline-flex items-center gap-1.5 rounded-sm bg-foreground/5 px-1 align-bottom">
      <TokenLabel number={number} option={option} />
    </span>
  );
}

const drawToken = (number: number): React.JSX.Element => (
  <ReferenceToken number={number} />
);

export function ReferenceProviders({
  references,
  children,
}: {
  references: readonly ReferenceOption[];
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ReferencesContext value={references}>
      <ReferenceTokenContext value={drawToken}>
        {children}
      </ReferenceTokenContext>
    </ReferencesContext>
  );
}
