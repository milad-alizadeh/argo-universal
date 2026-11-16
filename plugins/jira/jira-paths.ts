const unsafe = /[^A-Za-z0-9-]/gu;

const hex = 16;

// A page path holds only letters, digits, `-` and `_`; every other character is its hex code between two `_`.
const pathSegment = (text: string): string =>
  text.replaceAll(
    unsafe,
    (character) => `_${(character.codePointAt(0) ?? 0).toString(hex)}_`,
  );

export const pathText = (segment: string): string =>
  segment.replaceAll(/_([0-9a-f]+)_/gu, (_match, code: string) =>
    String.fromCodePoint(Number.parseInt(code, hex)),
  );

// One Argo Project's Jira issues (ADR-0050): its path names the Project, so one pattern serves every one.
export const projectPattern = '/projects/:project';

export const projectPath = (projectId: string): string =>
  `/projects/${pathSegment(projectId)}`;

// The Argo Project a page's path names.
export const projectIdOf = ({
  params,
}: {
  params: Readonly<Record<string, string>>;
}): string => pathText(params.project ?? '');
