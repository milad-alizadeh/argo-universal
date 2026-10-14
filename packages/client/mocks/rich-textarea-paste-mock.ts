/*
 * HTML as each source puts it on the clipboard, with the markdown a RichTextarea sends after it is
 * pasted: only headings, bold, italic, strikethrough, inline code, links, lists, quotes and code blocks
 * remain.
 */
export interface PastedHtml {
  source: string;
  html: string;
  plain: string;
  sent: string;
}

const webPage: PastedHtml = {
  source: 'a web page (composite)',
  html: `<meta charset='utf-8'><h2 style="color: rgb(31, 35, 40); font-family: -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif; font-size: 1.5em; font-weight: 600; margin-top: 24px;">Install</h2><p style="color: rgb(31, 35, 40); font-family: -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif; font-size: 16px;">Run <code style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13.6px; background-color: rgba(129, 139, 152, 0.12); border-radius: 6px; padding: 0.2em 0.4em;">pnpm install</code>, then read the <a href="https://argo.dev/docs/install" style="color: rgb(9, 105, 218); text-decoration: underline;">install guide</a>. It is <strong>fast</strong> and <em>safe</em>.</p><p style="color: rgb(31, 35, 40); font-size: 16px;"><img src="https://argo.dev/images/install.png" alt="Install screen" width="640" height="360"></p><table style="border-collapse: collapse;"><thead><tr><th style="border: 1px solid rgb(209, 217, 224);">Runtime</th></tr></thead><tbody><tr><td style="border: 1px solid rgb(209, 217, 224);">Node 24</td></tr></tbody></table><p style="color: rgb(31, 35, 40); font-size: 16px;"><span style="color: rgb(207, 34, 46); font-family: Georgia, serif; font-size: 18px;">Red serif</span> notes, <u>underlined</u>, <mark>highlighted</mark>, H<sub>2</sub>O and x<sup>2</sup>.</p>`,
  plain:
    'Install\n\nRun pnpm install, then read the install guide. It is fast and safe.\n\nRuntime\nNode 24\n\nRed serif notes, underlined, highlighted, H2O and x2.',
  sent: '## Install\n\nRun `pnpm install`, then read the [install guide](https://argo.dev/docs/install). It is **fast** and _safe_.\n\nRuntime\n\nNode 24\n\nRed serif notes, underlined, highlighted, H2O and x2.',
};

const googleDocsText =
  'font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-variant:normal;vertical-align:baseline;white-space:pre;white-space:pre-wrap;';

const googleDocsLine =
  'dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"';

const googleDocs: PastedHtml = {
  source: 'Google Docs',
  html: `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-5c1f0e2a-7fff-3b1d-4a6e-0d9b2c7e81f4"><h1 dir="ltr" style="line-height:1.38;margin-top:20pt;margin-bottom:6pt;"><span style="font-size:20pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Release plan</span></h1><p ${googleDocsLine}><span style="${googleDocsText}font-weight:700;font-style:normal;text-decoration:none;">Ship</span><span style="${googleDocsText}font-weight:400;font-style:normal;text-decoration:none;"> on </span><span style="${googleDocsText}font-weight:400;font-style:italic;text-decoration:none;">Friday</span><span style="${googleDocsText}font-weight:400;font-style:normal;text-decoration:none;">, not </span><span style="${googleDocsText}font-weight:400;font-style:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;">Thursday</span><span style="${googleDocsText}font-weight:400;font-style:normal;text-decoration:none;">.</span></p><p dir="ltr" style="line-height:1.38;text-align:center;margin-left:36pt;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:'Comic Sans MS',cursive;color:#ff0000;background-color:#ffff00;font-weight:400;font-style:normal;font-variant:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Centred, coloured and underlined</span></p><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p ${googleDocsLine} role="presentation"><span style="${googleDocsText}font-weight:400;font-style:normal;text-decoration:none;">Write the </span><a href="https://argo.dev/releases/12" style="text-decoration:none;"><span style="${googleDocsText}color:#1155cc;font-weight:400;font-style:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;">release notes</span></a></p></li><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p ${googleDocsLine} role="presentation"><span style="${googleDocsText}font-weight:400;font-style:normal;text-decoration:none;">Tag the build</span></p></li></ul></b>`,
  plain:
    'Release plan\nShip on Friday, not Thursday.\nCentred, coloured and underlined\n\t•\tWrite the release notes\n\t•\tTag the build',
  sent: '# Release plan\n\n**Ship** on _Friday_, not ~~Thursday~~.\n\nCentred, coloured and underlined\n\n- Write the [release notes](https://argo.dev/releases/12)\n- Tag the build',
};

const notion: PastedHtml = {
  source: 'Notion',
  html: `<meta charset="utf-8"><h3 id="1f2e3d4c-5b6a-4978-8695-a4b3c2d1e0f9" class="">Review notes</h3><p id="2a3b4c5d-6e7f-4809-9a1b-2c3d4e5f6a7b" class="">Use <strong>strong</strong>, <em>soft</em>, <s>struck</s> and <code>inline code</code>, never <mark class="highlight-yellow">highlights</mark>.</p><ol type="1" id="3b4c5d6e-7f80-4912-a3b4-c5d6e7f8091a" class="numbered-list" start="1"><li>Read the diff</li><li>Run the tests</li></ol><blockquote id="4c5d6e7f-8091-4a23-b4c5-d6e7f8091a2b" class="">Small changes merge faster.</blockquote><pre id="5d6e7f80-91a2-4b34-c5d6-e7f8091a2b3c" class="code"><code class="language-TypeScript">const answer = 42;
console.log(answer);</code></pre><figure id="6e7f8091-a2b3-4c45-d6e7-f8091a2b3c4d" class="image"><a href="https://notion.so/images/diagram.png"><img style="width:480px" src="https://notion.so/images/diagram.png"/></a></figure><table id="7f8091a2-b3c4-4d56-e7f8-091a2b3c4d5e" class="simple-table"><tbody><tr id="8091a2b3-c4d5-4e67-f809-1a2b3c4d5e6f"><td id="Owner" class="">Owner</td></tr></tbody></table>`,
  plain:
    'Review notes\nUse strong, soft, struck and inline code, never highlights.\n1. Read the diff\n2. Run the tests\nSmall changes merge faster.\nconst answer = 42;\nconsole.log(answer);\nOwner',
  sent: '### Review notes\n\nUse **strong**, _soft_, ~~struck~~ and `inline code`, never highlights.\n\n1. Read the diff\n2. Run the tests\n\n> Small changes merge faster.\n\n```\nconst answer = 42;\nconsole.log(answer);\n```\n\nOwner',
};

const vsCodeLine = (spans: string): string => `<div>${spans}</div>`;

const vsCodeSpan = (color: string, text: string): string =>
  `<span style="color: ${color};">${text}</span>`;

const vsCode: PastedHtml = {
  source: 'VS Code',
  html: `<meta charset='utf-8'><div style="color: #cccccc;background-color: #1f1f1f;font-family: Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;">${vsCodeLine(
    vsCodeSpan('#569cd6', 'const') +
      vsCodeSpan('#cccccc', ' ') +
      vsCodeSpan('#4fc1ff', 'snake_case') +
      vsCodeSpan('#cccccc', ' = ') +
      vsCodeSpan('#b5cea8', '2') +
      vsCodeSpan('#cccccc', ' * ') +
      vsCodeSpan('#b5cea8', '3') +
      vsCodeSpan('#cccccc', ';'),
  )}${vsCodeLine(
    vsCodeSpan('#9cdcfe', 'console') +
      vsCodeSpan('#cccccc', '.') +
      vsCodeSpan('#dcdcaa', 'log') +
      vsCodeSpan('#cccccc', '(snake_case);'),
  )}</div>`,
  plain: 'const snake_case = 2 * 3;\nconsole.log(snake_case);',
  sent: '```\nconst snake_case = 2 * 3;\nconsole.log(snake_case);\n```',
};

// A link Argo does not follow (only http, https and mailto) keeps its text without the link.
const scriptLink: PastedHtml = {
  source: 'a link to a script',
  html: '<a href="javascript:alert(1)">x</a>',
  plain: 'x',
  sent: 'x',
};

// Wikipedia's links carry a title, and external ones rel and target; markdown keeps only text and URL.
const wikipedia: PastedHtml = {
  source: 'Wikipedia',
  html: `<meta charset="utf-8"><p><b>Markdown</b> is a lightweight <a href="https://en.wikipedia.org/wiki/Markup_language" title="Markup language">markup language</a> created by <a href="https://en.wikipedia.org/wiki/John_Gruber" class="mw-redirect" title="John Gruber">John Gruber</a> in 2004. See the <a rel="nofollow" class="external text" target="_blank" href="https://daringfireball.net/projects/markdown/" title="Daring Fireball">original syntax</a>.</p>`,
  plain:
    'Markdown is a lightweight markup language created by John Gruber in 2004. See the original syntax.',
  sent: '**Markdown** is a lightweight [markup language](https://en.wikipedia.org/wiki/Markup_language) created by [John Gruber](https://en.wikipedia.org/wiki/John_Gruber) in 2004. See the [original syntax](https://daringfireball.net/projects/markdown/).',
};

export const pastedHtml = {
  webPage,
  googleDocs,
  notion,
  vsCode,
  scriptLink,
  wikipedia,
};
