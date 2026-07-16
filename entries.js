// Cloudflare Pages Function — /api/entries
// Bindings needed in the Pages project:
//   - KV namespace binding:  BP_KV
//   - Environment variable:  ACCESS_TOKEN  (your chosen password)

const KEY = 'bp:entries';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function authorized(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return Boolean(env.ACCESS_TOKEN) && token.length > 0 && token === env.ACCESS_TOKEN;
}

// GET /api/entries -> returns the stored JSON array (or [])
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  const value = await env.BP_KV.get(KEY);
  return new Response(value || '[]', {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// PUT /api/entries -> saves the JSON array
export async function onRequestPut(context) {
  const { request, env } = context;
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.text();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  // Only accept a JSON array, and keep it to a sane size.
  try {
    const parsed = JSON.parse(body);
    if (!Array.isArray(parsed)) throw new Error('not an array');
  } catch {
    return json({ error: 'expected JSON array' }, 400);
  }
  if (body.length > 1_000_000) return json({ error: 'too large' }, 413);

  await env.BP_KV.put(KEY, body);
  return json({ ok: true });
}
