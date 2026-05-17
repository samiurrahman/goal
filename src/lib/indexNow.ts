/**
 * IndexNow — instant indexing protocol used by Bing, Yandex, Seznam, Naver, Yep.
 * Single submission notifies all participating engines.
 *
 * To rotate the key: regenerate, replace both this constant and the file in
 * /public/<key>.txt, redeploy. The plaintext file must be reachable at
 * https://<host>/<key>.txt and contain exactly the key.
 *
 * Key location (Bing endpoint accepts both indexnow.org and api.indexnow.org;
 * we use the canonical aggregator so all engines pick up the ping).
 */

const INDEXNOW_KEY =
  process.env.NEXT_PUBLIC_INDEXNOW_KEY || 'e05b572b2a12b07f250abb7b9456364e';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';

const getHost = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://searchumrah.com';
  return raw.replace(/\/+$/, '');
};

const getHostname = () => {
  try {
    return new URL(getHost()).hostname;
  } catch {
    return 'searchumrah.com';
  }
};

export const indexNowKeyLocation = () => `${getHost()}/${INDEXNOW_KEY}.txt`;

export type IndexNowResult = {
  ok: boolean;
  status: number;
  submitted: string[];
  error?: string;
};

/**
 * Submit one or more absolute URLs to IndexNow. Returns the HTTP status; the
 * spec treats 200 and 202 as success. We don't throw — pings are best-effort
 * and must never break the calling request (publish, revalidate, etc.).
 */
export async function pingIndexNow(urls: string[]): Promise<IndexNowResult> {
  const host = getHost();
  const hostname = getHostname();

  const absolute = urls
    .map((u) => (u.startsWith('http') ? u : `${host}${u.startsWith('/') ? u : `/${u}`}`))
    .filter((u, i, arr) => arr.indexOf(u) === i);

  if (absolute.length === 0) {
    return { ok: true, status: 204, submitted: [] };
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: hostname,
        key: INDEXNOW_KEY,
        keyLocation: indexNowKeyLocation(),
        urlList: absolute,
      }),
    });

    return {
      ok: res.status === 200 || res.status === 202,
      status: res.status,
      submitted: absolute,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      submitted: absolute,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
