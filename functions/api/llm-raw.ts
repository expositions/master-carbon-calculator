interface Env {
  OPENAI_API_KEY: string;
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const { userInput } = await request.json() as unknown as { userInput: string };
    if (typeof userInput !== 'string' || !userInput.trim())
      return new Response('Missing or empty "userInput" field', { status: 400 });

    const prompt = userInput.trim();

    const openAiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        input: prompt
      })
    });

    const raw = await openAiRes.text();
    return new Response(raw, {
      status: openAiRes.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(`Server error: ${err?.message || err}`, { status: 500 });
  }
}
