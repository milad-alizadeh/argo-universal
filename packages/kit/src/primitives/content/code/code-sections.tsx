import type { ReactElement } from 'react';
import { View } from 'react-native';
import { trayClassName } from '#kit/tray-surface';
import { cn } from '#kit/utils';
import { Text } from '#primitives/content/text';
import { CodeBlockBody } from './code-block-body';
import { codeBlockBarClassName } from './code-block-header';
import { CopyButton, codeBlockGroup } from './copy-button';

export interface CodeSection {
  // A caption of Argo's own, such as "Input" or "Output"; not a file name or a language.
  title: string;
  code: string;
  language?: string;
}

export interface CodeSectionsProps {
  sections: CodeSection[];
}

// A caption, not a heading: muted sans text, with the section's own Copy shown on hover.
function SectionBar({ title, code }: CodeSection): ReactElement {
  return (
    <View className={cn(codeBlockBarClassName, 'justify-between')}>
      <Text role="secondary" tone="muted" testID="code-section-title">
        {title}
      </Text>
      <CopyButton value={code} label={`Copy ${title}`} revealOnHover />
    </View>
  );
}

function Section(section: CodeSection): ReactElement {
  return (
    <View className={codeBlockGroup}>
      <SectionBar {...section} />
      <CodeBlockBody code={section.code} language={section.language} />
    </View>
  );
}

// Related blocks, such as a call's input and its output, as one tray: each card under its own caption.
export function CodeSections({ sections }: CodeSectionsProps): ReactElement {
  return (
    <View className={cn(trayClassName, 'cursor-auto')}>
      {sections.map((section) => (
        <Section key={section.title} {...section} />
      ))}
    </View>
  );
}
