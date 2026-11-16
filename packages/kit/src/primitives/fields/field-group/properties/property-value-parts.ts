import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '#kit/flattened-children';
import { Avatar, type AvatarProps } from '#primitives/content/avatar';
import { Icon, type IconProps } from '#primitives/content/icon';
import { Label, type LabelProps } from '#primitives/content/label';
import { Link, type LinkProps } from '#primitives/content/link';
import { Pill, type PillProps } from '#primitives/status/pill';
import { StatusDot, type StatusDotProps } from '#primitives/status/status-dot';
import { isElementOf } from './kit-element';

// A glyph that leads the value after it: an Icon, or a StatusDot before the words it colours.
export interface Lead {
  icon?: IconProps['name'];
  tone?: StatusDotProps['tone'];
}

/*
 * One value a read-only row shows, as one field: words (a status when a StatusDot leads them), a Link, a person, or
 * the row's Pills, which Pill children that follow each other make together.
 */
export type ValuePart =
  | { kind: 'text'; key: string; text: string; lead: Lead; spoken?: string }
  | { kind: 'link'; key: string; link: LinkProps; lead: Lead }
  | { kind: 'avatar'; key: string; avatar: AvatarProps }
  | { kind: 'pills'; key: string; pills: PillProps[]; lead: Lead };

interface Folding {
  parts: ValuePart[];
  lead: Lead;
}

interface Child {
  key: string;
  node: ReactElement;
}

// A step reads the children of its kind and leaves the rest to the next.
type Step = (folding: Folding, child: Child) => Folding | undefined;

const next = (folding: Folding, part: ValuePart): Folding => ({
  parts: [...folding.parts, part],
  lead: {},
});

// A Label's own icon leads its words, else the Icon before it.
function words(folding: Folding, key: string, props: LabelProps): Folding {
  const { text, icon, accessibilityLabel: spoken } = props;
  const lead = { ...folding.lead, icon: icon ?? folding.lead.icon };

  return next(folding, { kind: 'text', key, text, lead, spoken });
}

const label: Step = (folding, { key, node }) =>
  isElementOf<LabelProps>(node, Label)
    ? words(folding, key, node.props)
    : undefined;

const link: Step = (folding, { key, node }) =>
  isElementOf<LinkProps>(node, Link)
    ? next(folding, { kind: 'link', key, link: node.props, lead: folding.lead })
    : undefined;

const avatar: Step = (folding, { key, node }) =>
  isElementOf<AvatarProps>(node, Avatar)
    ? next(folding, { kind: 'avatar', key, avatar: node.props })
    : undefined;

// A Pill joins the Pills before it, or starts the row's Pills after its glyph.
function withPill(folding: Folding, key: string, pill: PillProps): Folding {
  const last = folding.parts.at(-1);

  if (last?.kind !== 'pills')
    return next(folding, {
      kind: 'pills',
      key,
      pills: [pill],
      lead: folding.lead,
    });

  const joined = { ...last, pills: [...last.pills, pill] };

  return { ...folding, parts: [...folding.parts.slice(0, -1), joined] };
}

const pill: Step = (folding, { key, node }) =>
  isElementOf<PillProps>(node, Pill)
    ? withPill(folding, key, node.props)
    : undefined;

const leading = (folding: Folding, lead: Lead): Folding => ({
  ...folding,
  lead: { ...folding.lead, ...lead },
});

const icon: Step = (folding, { node }) =>
  isElementOf<IconProps>(node, Icon)
    ? leading(folding, { icon: node.props.name })
    : undefined;

const dot: Step = (folding, { node }) =>
  isElementOf<StatusDotProps>(node, StatusDot)
    ? leading(folding, { tone: node.props.tone })
    : undefined;

const steps: Step[] = [label, link, avatar, pill, icon, dot];

// A child of no value kind adds nothing.
const stepOf = (folding: Folding, child: Child): Folding =>
  steps.map((take) => take(folding, child)).find(Boolean) ?? folding;

function step(folding: Folding, node: ReactNode, index: number): Folding {
  if (!isValidElement(node)) return folding;

  return stepOf(folding, { key: String(node.key ?? index), node });
}

const hasLead = (lead: Lead): boolean =>
  Object.values(lead).some((glyph) => glyph !== undefined);

// The row's own words are its value when no child is one, and a glyph left over leads them.
const wordsLeft = (folding: Folding): boolean =>
  folding.parts.length === 0 || hasLead(folding.lead);

function closed(folding: Folding, text: string | undefined): ValuePart[] {
  const words: ValuePart = {
    kind: 'text',
    key: 'value',
    text: text ?? '',
    lead: folding.lead,
  };

  return wordsLeft(folding) ? [...folding.parts, words] : folding.parts;
}

// What a read-only row's value is made of, from its children in order and its own `value`.
export function valueParts(
  children: ReactNode,
  text: string | undefined,
): ValuePart[] {
  const start: Folding = { parts: [], lead: {} };

  return closed(flattenedChildren(children).reduce<Folding>(step, start), text);
}
