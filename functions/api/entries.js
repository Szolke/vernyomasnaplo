// Cloudflare Pages Function — /api/entries
// Bindings required in the Pages project (Production environment):
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
  if (!env.BP_KV) return json({ error: 'BP_KV binding missing on this deployment' }, 500);
  try {
    const value = await env.BP_KV.get(KEY);
    return new Response(value || '[]', {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  } catch (e) {
    return json({ error: 'kv read failed', detail: String(e && e.message || e) }, 500);
  }
}

// PUT /api/entries -> saves the JSON array
export async function onRequestPut(context) {
  const { request, env } = context;
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  if (!env.BP_KV) return json({ error: 'BP_KV binding missing on this deployment' }, 500);

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

  try {
    await env.BP_KV.put(KEY, body);
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'kv write failed', detail: String(e && e.message || e) }, 500);
  }
}
