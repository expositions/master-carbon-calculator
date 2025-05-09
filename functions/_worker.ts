// functions/_worker.ts
import { onRequestPost } from "./api/llm.ts";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // 1) Nur POST /api/llm an LLM-Handler
    if (url.pathname === "/api/llm" && request.method === "POST") {
      return onRequestPost({ request, env });
    }

    // 2) Sonst statische Dateien aus public/
    return env.ASSETS.fetch(request);
  },
};
