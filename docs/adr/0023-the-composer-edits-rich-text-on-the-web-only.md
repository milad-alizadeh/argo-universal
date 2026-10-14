# The Composer edits rich text on the web only

On web and desktop, the Composer is a Lexical editor that renders markdown as you type, Slack-style: `**bold**`, ⌘B, `` `code` ``, `1. ` lists, quotes, code blocks and links take the Feed's markdown look, and Slash commands become tokens (owner, 2026-10-12, #443). iOS and Android keep a plain-text native text area, with no rich text: inside a native glass view on iOS where the system supports it, the Material equivalent on Android.

## Decision

- **Markdown is the only format.** The editor sends, and the Device stores as the draft, only the markdown string it shows. Tokens are rebuilt from that text when a draft loads.
- **Lexical's own presets.** `@lexical/markdown` transformers drive the shortcuts and the markdown export. Argo adds only custom nodes and transformers for tokens.
- **A Slash command is sent as plain prompt text** `/name args`, as ACP defines it and ADR-0012 records it; the ACP adapter turns it into what its Agent understands. It may stand anywhere in the prompt. No `_meta` copy.
- **The Server keeps each Agent's ACP `available_commands_update` per Agent and Project.** Skills live in the Project as well as the user's folders. Every later Session refreshes the list. Phones get no suggestions.
- **Before Send, discovery uses the Project's main Checkout without creating a worktree** (owner, 2026-10-13). The Server caches discovered Agent configuration and Slash commands per Agent and Project. The Composer uses cached results for its model, effort and mode controls and initial Slash command suggestions. The Server refreshes the discovery data in the background and closes the discovery Agent session afterward. Send remains available while discovery loads or fails.
- **After Send, the Server creates the selected Checkout** (owner, 2026-10-13). Before prompt delivery, it validates and applies the selected configuration and refreshes Slash commands in that Checkout. Rejected explicit choices fail the opening. Unavailable remembered preferences fall back to Agent defaults.
- **An Issue reference is sent as `#443`** in the text plus a `resource_link` to Argo's own Issue, named with its title (ADR-0006 passes the block through).
- **Return** sends, except in a list item (new item; on an empty item, leave the list) and in a code block (new line). ⇧Return adds a line, and in a list item a new item. A list marker typed after a ⇧Return line starts a list; ⇧Tab on a top-level item leaves the list.
- **`#` is not a heading.** It is reserved for Issue and pull request references, so `# ` stays the text typed. `#` after a space opens a menu of Issues and pull requests, filtered by number or title; choosing one writes `#443` and shows it as a token. The editor takes them through a `references` prop and holds no list of its own; a typed `#443` that names a known one becomes the same token.
- **Paste** keeps what markdown can express and drops the rest; ⌘⇧V pastes plain text.
- **The Feed renders user messages as markdown**, with the same renderer as Agent messages. The stored text stays exactly as typed, so ADR-0012 holds.
- **One primitive.** The editor is a `#primitives` control whose web file draws Lexical and whose native files draw the plain text area, so the Composer screen has one API. This sits beside ADR-0020: the Composer surface stays Argo's own drawing; only the text field differs by platform.

## Considered options

- Plain text everywhere: no way to make Slash commands and Issue references look different, which the owner asked for.
- Rich text on phones too: no native rich-text field matches iOS and Android behaviour, and a web view in the Composer breaks the native keyboard and glass.
- TipTap or ProseMirror: as capable, but Lexical ships markdown shortcuts and export as presets, so Argo writes no rules by hand.
- A hand-made `contentEditable`: selection, IME and undo bugs that Lexical already solves.
- Creating the selected worktree before Send to discover Agent configuration and Slash commands. Replaced by discovery in the Project's main Checkout (owner, 2026-10-13). This keeps the controls available without creating a worktree before the user sends a prompt.
