const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "https://maxux12.github.io",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return respond({
        service: "RASED AI",
        status: "online",
        version: "0.1"
      });
    }

    if (url.pathname === "/verify" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return respond({ error: "Invalid JSON" }, 400);
      }

      const claim = typeof body?.claim === "string"
        ? body.claim.trim()
        : "";

      if (claim.length < 10 || claim.length > 5000) {
        return respond({
          error: "News text must contain 10 to 5000 characters"
        }, 400);
      }

      const links = [...new Set(
        claim.match(/https?:\/\/[^\s<>"']+/g) || []
      )].slice(0, 10);

      return respond({
        claim,
        verdict: "unverified",
        verdict_ar: "غير محسوم",
        explanation_ar: "تم استلام الخبر، لكن لم يتم البحث عن أدلة مستقلة بعد.",
        sources: [],
        submitted_links: links,
        checked_at: new Date().toISOString(),
        evidence_search_enabled: false
      });
    }

    return respond({
      service: "RASED AI API",
      message: "Use GET /health or POST /verify"
    });
  }
};
