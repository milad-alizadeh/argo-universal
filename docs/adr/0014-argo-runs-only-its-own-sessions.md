# Argo runs only its own Sessions

Argo shows and drives only Sessions it started. A Session started in a terminal or another app does not exist for Argo: Argo never lists, watches or controls it.

Taking over a running external Session is impossible: Claude Code's terminal owns its process, and Codex holds a writer lock per thread. Watching external Sessions is where old Argo grew out of control: liveness probes, status that decayed to `unknown`, polling, transcript parsing, and stray Guardian threads and threads for the Agents a Session started. That work broke each time a vendor changed its files.

Importing a stopped external Session as an Argo Session comes later, with its own spec. Paseo, T3 Code and Nimbalyst stop at the same point.

Argo owns its workflow and its Feed history. It resumes its Sessions through ACP resume without replay and never re-imports the Agent's transcript. Work continued in another app is not synchronized into the Feed: ACP Sessions never read native transcript files (the native adapters stop at their ACP cutover), and Argo does not promise to detect outside continuation, so the earlier Notice for a Session continued in a terminal is withdrawn. After an interrupted Turn, the Feed says output may be missing and Argo never resends the prompt (owner, 2026-10-09, #345).

## Considered Options

- Browse external Sessions read-only. Rejected: it makes Argo a transcript viewer and brings back transcript parsing.
- Watch running external Sessions live. Rejected: no vendor supports it for a third party, and only read-only viewers that tail files do it.
