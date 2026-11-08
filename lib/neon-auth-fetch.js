import https from "node:https";

export function installNeonAuthPinnedFetch() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL || process.env.BETTER_AUTH_URL;
  const authEndpointIp = process.env.NEON_AUTH_ENDPOINT_IP;
  if (process.env.NODE_ENV !== "development" || !baseUrl || !authEndpointIp || globalThis.fetch?.__skillSwapAuthDns) return false;

  const authHost = new URL(baseUrl).hostname;
  const defaultFetch = globalThis.fetch.bind(globalThis);
  const pinnedAuthFetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.hostname !== authHost) return defaultFetch(input, init);
    return new Promise(async (resolve, reject) => {
      try {
        const body = ["GET", "HEAD"].includes(request.method) ? null : Buffer.from(await request.arrayBuffer());
        const upstream = https.request(url, {
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          signal: request.signal,
          servername: authHost,
          lookup: (_hostname, options, callback) => options?.all
            ? callback(null, [{ address: authEndpointIp, family: 4 }])
            : callback(null, authEndpointIp, 4),
        }, (response) => {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => {
            const headers = new Headers();
            for (let i = 0; i < response.rawHeaders.length; i += 2) headers.append(response.rawHeaders[i], response.rawHeaders[i + 1]);
            const responseBody = [204, 205, 304].includes(response.statusCode) ? null : Buffer.concat(chunks);
            resolve(new Response(responseBody, { status: response.statusCode, statusText: response.statusMessage, headers }));
          });
          response.on("error", reject);
        });
        upstream.on("error", reject);
        if (body) upstream.end(body); else upstream.end();
      } catch (error) { reject(error); }
    });
  };
  Object.defineProperty(pinnedAuthFetch, "__skillSwapAuthDns", { value: true });
  globalThis.fetch = pinnedAuthFetch;
  return true;
}
