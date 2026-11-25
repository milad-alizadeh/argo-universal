import type {
  DraftComment,
  DraftPick,
} from '@repo/contracts/operations/plugin-drafts';
import type { ChosenDraft } from './plugin-drafts';

const pickLine = ({ region, variant }: DraftPick): string =>
  `- ${region}: ${variant}`;

const commentLine = ({
  nodeKey,
  region,
  variant,
  note,
}: DraftComment): string => {
  const inVariant = variant ? ` (Variant ${variant})` : '';
  const where = region ? ` in ${region}${inVariant}` : '';

  return `- node ${nodeKey}${where}: ${note}`;
};

// What the Agent of the Session that draws the Draft reads: the pick per region, then each comment with the node, region and Variant it names.
export function draftPrompt(
  { pluginId, title }: { pluginId: string; title: string },
  { picks, comments }: ChosenDraft,
): string {
  const lines = [
    `${title} (${pluginId}): the author chose from the Draft.`,
    '',
    'Chosen Variant per region:',
    ...(picks.length ? picks.map(pickLine) : ['- none']),
  ];

  if (comments.length)
    lines.push('', 'Comments:', ...comments.map(commentLine));

  lines.push(
    '',
    `Write the chosen-variant file into the Plugin folder, then build the real page from it. \`argo run plugin.draft.pick --params '{"pluginId":"${pluginId}"}'\` reads this choice again.`,
  );

  return lines.join('\n');
}
