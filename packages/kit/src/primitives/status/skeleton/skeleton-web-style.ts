import { hiddenAttribute, inkAttribute } from './skeleton-marks';

const rules = `
[${inkAttribute}] {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  text-decoration-color: transparent !important;
  text-shadow: none !important;
  caret-color: transparent !important;
}
[${hiddenAttribute}] {
  visibility: hidden !important;
}
`;

const styleId = 'argo-skeleton-style';

// The two rules the walk's marks need; added to the page once.
export function ensureSkeletonStyle(): void {
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');

  style.id = styleId;
  style.textContent = rules;
  document.head.append(style);
}
