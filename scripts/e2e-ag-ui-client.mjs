import { HttpAgent, EventType } from "@ag-ui/client";

const baseUrl = process.env.AG_UI_E2E_BASE_URL;
const agentUuid = process.env.AG_UI_AGENT_UUID;
const authToken = process.env.AG_UI_TOKEN;
const timeoutMs = Number(process.env.AG_UI_TIMEOUT_MS ?? 20000);

if (!baseUrl || !agentUuid) {
  console.error("Missing AG_UI_E2E_BASE_URL or AG_UI_AGENT_UUID");
  process.exit(2);
}

const endpoint = `${baseUrl.replace(/\/$/, "")}/api/v1/agent/${agentUuid}/sse`;
const threadId = `e2e-thread-${Date.now()}`;
const runId = `e2e-run-${Date.now()}`;

const agent = new HttpAgent({
  url: endpoint,
  ...(authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {}),
});

const seen = [];

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    reject(new Error(`Timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  const subscription = agent
    .runAgent({
      threadId,
      runId,
      state: {},
      messages: [{ id: "u1", role: "user", content: "e2e ping" }],
      tools: [],
      context: [],
      forwardedProps: {},
    })
    .subscribe({
      next: (event) => {
        seen.push(event.type);
        if (event.type === EventType.RUN_FINISHED) {
          clearTimeout(timer);
          subscription.unsubscribe();
          resolve();
        }
        if (event.type === EventType.RUN_ERROR) {
          clearTimeout(timer);
          subscription.unsubscribe();
          reject(new Error(`RUN_ERROR: ${event.message ?? "unknown"}`));
        }
      },
      error: (error) => {
        clearTimeout(timer);
        reject(error);
      },
      complete: () => {
        clearTimeout(timer);
        resolve();
      },
    });
});

if (!seen.includes(EventType.RUN_STARTED)) {
  console.error("Missing RUN_STARTED event");
  process.exit(1);
}
if (!seen.includes(EventType.RUN_FINISHED)) {
  console.error("Missing RUN_FINISHED event");
  process.exit(1);
}

console.log("AG-UI e2e passed.", seen);

