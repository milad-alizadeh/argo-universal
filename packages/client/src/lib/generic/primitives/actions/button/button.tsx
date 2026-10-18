import type { ComponentType } from 'react';
import { ContentButton } from './button-content';
import { withNarrowLayout } from './button-layout';
import type { ButtonProps } from './button-props';

// Kit only: the drawn button with a class, for the acting half of a web SplitButton.
export const DrawnButton = withNarrowLayout(ContentButton);

export const Button: ComponentType<ButtonProps> = DrawnButton;

export type { ButtonProps } from './button-props';
