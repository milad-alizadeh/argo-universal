// Generated from codex-acp 68d7d2d5ddfc0ed5746f9f6130892dda685e65dd/src/AuthStatusMeta.ts; SHA256 b316a29a6db8608ff3cd7740f165297649c3c75a16b9da86a7599817e3e4f0c4.
// Run node packages/contracts/tools/generate-auth-status.ts.

export type AuthStatusKind = "account" | "api_key" | "gateway" | "external" | "none";

export interface AuthStatusAccount {
    email?: string;
    organization?: string;
    
    plan?: string;
}

export interface AuthStatus {
    kind: AuthStatusKind;
    
    label: string;
    
    detail?: string;
    account?: AuthStatusAccount;
    
    vendor?: Record<string, unknown>;
}


export type AuthStatusUpdateNotification = {
    authStatus: AuthStatus;
}
