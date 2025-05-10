// functions/_worker.ts
import { onRequestPost } from "./api/llm.ts";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Redirect / to /scrolly/
    if (url.pathname === "/") {
      const destinationURL = `${url.origin}/scrolly/`;
      const statusCode = 301;
      return Response.redirect(destinationURL, statusCode);
    }

    // 1) Nur POST /api/llm an LLM-Handler
    if (url.pathname === "/api/llm" && request.method === "POST") {
      return onRequestPost({ request, env });
    }

    // 2) Sonst statische Dateien aus public/
    return env.ASSETS.fetch(request);
  },
};
