const TARGET_ORIGIN = "https://bfs-web.ccw.site";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

exports.handler = async (event) => {
  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  // Build target URL: everything after /api/ is the path
  const path = event.path.replace(/^\/api\//, "/").replace(/^\/\.netlify\/functions\/proxy\/?/, "/");
  const qs = event.rawQuery ? `?${event.rawQuery}` : "";
  const targetUrl = `${TARGET_ORIGIN}${path}${qs}`;

  try {
    const resp = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: { "User-Agent": "ccwbfs-proxy/1.0" },
      body: ["GET", "HEAD"].includes(event.httpMethod) ? undefined : event.body,
    });

    const body = await resp.text();

    // Forward response headers, add CORS
    const headers = { ...CORS_HEADERS };
    ["content-type", "cache-control", "etag", "last-modified"].forEach((h) => {
      const v = resp.headers.get(h);
      if (v) headers[h] = v;
    });

    return { statusCode: resp.status, headers, body };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ error: "Upstream request failed", detail: err.message }),
    };
  }
};
