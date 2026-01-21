type AuditAction =
    | "SmartValidateSingleDownload"
    | "SmartValidateZipDownload"
    | string; // For future actions

type AuditEntityType = "PDF" | "PDFBatch" | string;

interface AuditLogParams {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId?: string | null;
    metadata?: Record<string, any>;
    cost?: number | null;
}


export async function logFrontendAudit({
    action,
    entityType,
    entityId = null,
    metadata = {},
    cost = null
}: AuditLogParams): Promise<any> {
    const API_URL = import.meta.env.VITE_API_BASE_URL;
    let token: string | null = null;
    try {
        const stored = localStorage.getItem('submittalFactory_auth');
        if (stored) {
            const parsed = JSON.parse(stored);
            token = parsed.token || null;
        }
    } catch {
        token = null;
    }

    if (!token) {
      console.warn("Skipping audit log - no auth token available");
      return null;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const body = {
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      cost,
    };

    try {
      const res = await fetch(`${API_URL}/api/audit-log`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (err) {
      console.warn("Audit log failed:", err);
      return null;
    }
}
