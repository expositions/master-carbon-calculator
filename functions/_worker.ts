// functions/_worker.ts
import { onRequestPost as onRequestLLM } from "./api/llm.ts";
import { onRequestPost as onRequestLLMRaw } from "./api/llm-raw.ts";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Redirect / to /scrolly/
    if (url.pathname === "/") {
      const destinationURL = `${url.origin}/scrolly/`;
      return Response.redirect(destinationURL, 301);
    }

    // 1) POST /api/llm → templated LLM handler
    if (url.pathname === "/api/llm" && request.method === "POST") {
      return onRequestLLM({ request, env });
    }

    // 2) POST /api/llm-raw → raw passthrough LLM handler
    if (url.pathname === "/api/llm-raw" && request.method === "POST") {
      return onRequestLLMRaw({ request, env });
    }

    // 3) All else → static assets
    return env.ASSETS.fetch(request);
  },
};
