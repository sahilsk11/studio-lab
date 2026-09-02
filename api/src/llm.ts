import { STORYBOARD_MODEL } from './config.js';

export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');
  return key;
}

export function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.APP_URL ?? 'http://localhost:8081',
    'X-Title': 'Studio Lab',
  };
}

export async function chatJson<T>(opts: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<{ data: T; cost: number }> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: STORYBOARD_MODEL,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: opts.schemaName,
          strict: true,
          schema: opts.schema,
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${opts.schemaName} LLM failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Empty ${opts.schemaName} response`);

  const parsed = (typeof content === 'string' ? JSON.parse(content) : content) as T;
  return { data: parsed, cost: data.usage?.cost ?? 0 };
}
