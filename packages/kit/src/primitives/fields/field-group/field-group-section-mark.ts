import type { ReactElement, ReactNode } from 'react';
import { isMarkedElement, markedComponent } from '#kit/component-mark';
import type { FieldGroupSectionProps } from './field-group-section';

const mark = 'FieldGroupSection';

// Each platform's Section carries the mark, so a FieldGroup still finds its sections after a hot reload.
export const markedSection = <Section extends object>(
  section: Section,
): Section => markedComponent(mark, section);

export const isFieldGroupSection = (
  node: ReactNode,
): node is ReactElement<FieldGroupSectionProps> => isMarkedElement(mark, node);
