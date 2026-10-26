import type { SizeClass } from '@repo/kit/use-size-class/size-class';

// ADR-0026, amended 2026-10-18: only a wide window frames the page; compact and medium take the phone shell.
export const isFramed = (sizeClass: SizeClass): boolean => sizeClass === 'wide';
