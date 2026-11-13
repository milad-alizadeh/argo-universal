# Secrets live in each OS's secret store, and a sign-in becomes an Account

This amends [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md), [ADR-0030](0030-plugins-get-only-the-capabilities-their-manifest-declares.md) and [ADR-0036](0036-plugins-own-sign-in-and-argo-brokers-their-accounts.md) (owner, Spec 0027 #1955). ADR-0025 sends Plugin Secrets to the Keychain. The Server did that by running `security add-generic-password` with the value in argv, where any local process can read it from the process list, and nothing worked off a Mac. A Jira Plugin needs a pasted API token or an OAuth client secret kept safely on any OS the Server runs on.

## Decision

- **A Secret lives in the OS's own secret store: the Keychain on macOS, Credential Manager on Windows, the Secret Service on Linux.**
  - The Engine reaches the store in-process through `@napi-rs/keyring`, behind one `SecretStore` interface. No Secret ever passes through a process's argv, and no code path runs a secret-store CLI.
  - The per-Plugin namespaces stay: `argo.plugin.<id>` for what a Plugin keeps through `argo.secrets`, and `argo.plugin.<id>.settings` for its secret Settings. A Plugin only ever names an account inside its own namespace.
  - On Linux the store is pinned to the Secret Service. The library's other fallback, the kernel keyring, forgets every Secret on reboot.
- **With no store, Argo keeps no Secrets.** When no OS store answers, as on a headless Linux Server without a Secret Service, a write is refused with a message naming what to install. A read answers that nothing is kept, and a delete has nothing to do. There is no file fallback: a token is never stored unprotected.
- **No Plugin reaches the store around `argo`.** A manifest that declares `security`, `secret-tool`, `cmdkey`, or the PowerShell credential cmdlets (`Get-StoredCredential` and the SecretManagement `Get-Secret` family) as a process command is refused at validation, naming this rule. This is how ADR-0030 already treats variables that load code.
- **Full access reaches every Secret.** A shell or interpreter can still run any of those tools, so consent for a Full access command says "Full access to this computer, including every Secret in its secret store", amending ADR-0030's "Full access to your Mac".
- **A sign-in becomes an Account.** A pasted token is kept as an Account of the providing Plugin, as ADR-0036's OAuth Accounts are. That makes it listed in Settings › Accounts, borrowable by other Plugins, and signed out from there. App configuration a sign-in needs, such as an OAuth client ID and secret the person registered, is a secret Setting. Argo still ships no secret.
- **No migration.** Items the old `security` path wrote are dropped; a person signs in again once.

## Considered options

- **Keep the `security` CLI and pass the value on stdin.** Rejected: it fixes the argv leak on macOS only, and each OS would need its own CLI and quoting rules.
- **An encrypted file when no store answers,** as some CLIs do. Rejected: the key would sit beside the file, so the file is only as safe as the folder it is in.
- **The kernel keyring on Linux when there is no Secret Service.** Rejected: it is lost on reboot, so a person would be signed out without being told why.
- **Let Plugins declare the store's CLIs like any command.** Rejected: one Plugin could read every other Plugin's Secrets and every password on the machine.
