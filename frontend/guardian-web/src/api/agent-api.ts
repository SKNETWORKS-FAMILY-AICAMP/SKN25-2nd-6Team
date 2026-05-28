import { apiClient } from "./api-client";

export interface AgentSseEvent {
  status: "connecting" | "queued" | "running" | "done" | "error" | "timeout";
  step?: string;
  result?: Record<string, unknown>;
  detail?: string;
  task_id?: string;
}

export const runAgentTask = async (
  agentType: string,
  payload: Record<string, unknown>,
): Promise<{ task_id: string; agent_type: string }> => {
  const response = await apiClient.post<{
    task_id: string;
    agent_type: string;
  }>("/api/agent/run", { agent_type: agentType, payload });
  return response.data;
};

const readStreamText = (event?: ProgressEvent): string => {
  const target = event?.target as XMLHttpRequest | null;
  return typeof target?.responseText === "string" ? target.responseText : "";
};

const parseSseLine = (line: string): AgentSseEvent | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const raw = trimmed.slice("data:".length).trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AgentSseEvent;
  } catch {
    return null;
  }
};

export const streamAgentResult = (
  taskId: string,
): Promise<Record<string, unknown> | null> =>
  new Promise((resolve) => {
    let receivedLength = 0;
    let pendingLine = "";
    let settled = false;

    const settle = (val: Record<string, unknown> | null) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };

    apiClient
      .get<string>(`/api/agent/sse/${taskId}`, {
        responseType: "text",
        headers: { Accept: "text/event-stream" },
        timeout: 130_000,
        onDownloadProgress: (progressEvent) => {
          const text = readStreamText(progressEvent.event);
          const chunk = text.slice(receivedLength);
          receivedLength = text.length;
          pendingLine += chunk;

          const lines = pendingLine.split(/\r?\n/);
          pendingLine = lines.pop() ?? "";

          for (const line of lines) {
            const ev = parseSseLine(line);
            if (!ev) continue;
            if (ev.status === "done") settle(ev.result ?? {});
            else if (ev.status === "error" || ev.status === "timeout")
              settle(null);
          }
        },
      })
      .catch(() => settle(null))
      .finally(() => {
        if (pendingLine) {
          const ev = parseSseLine(pendingLine);
          if (ev?.status === "done") settle(ev.result ?? {});
        }
        settle(null);
      });
  });
