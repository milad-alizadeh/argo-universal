# Argo runs only its own Sessions

Argo shows and drives only Sessions that it started. A Session started in a terminal or in another app does not exist for Argo. Argo never lists, watches or controls it.

Taking over a running external Session is not possible: Claude Code's terminal owns its process, and Codex holds a writer lock per thread. Watching external Sessions is where old Argo grew out of control: liveness probes, status that decayed to `unknown`, polling, transcript parsing, and stray Guardian and Subagent threads. That work broke each time a vendor changed its files.

Importing a stopped external Session, so that it becomes an Argo Session from then on, comes later with its own spec. Paseo, T3 Code and Nimbalyst stop at the same point. If an Argo Session continued in a terminal, Argo shows a Notice and imports nothing.

## Considered Options

- Browse external Sessions read-only. Rejected: it makes Argo a transcript viewer and brings back transcript parsing.
- Watch running external Sessions live. Rejected: no vendor supports it for a third party, and only read-only viewers that tail files do it.
