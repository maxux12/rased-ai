
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

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

function getLinks(text) {
  return [...new Set(
    text.match(/https?:\/\/[^\s<>"']+/g) || []
  )].slice(0, 10);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
      });
    }

    if (url.pathname === "/health" &&
        request.method === "GET") {
      return respond({
        service: "RASED AI",
        status: "online",
        version: "0.2",
        ai_binding: Boolean(env.AI)
      });
    }

    if (url.pathname === "/verify" &&
        request.method === "POST") {

      let body;

      try {
        body = await request.json();
      } catch {
        return respond({
          error: "Invalid JSON"
        }, 400);
      }

      const claim = typeof body?.claim === "string"
        ? body.claim.trim()
        : "";

      if (claim.length < 10 || claim.length > 5000) {
        return respond({
          error: "News text must contain 10 to 5000 characters"
        }, 400);
      }

      if (!env.AI) {
        return respond({
          claim,
          verdict: "unverified",
          verdict_ar: "غير محسوم",
          explanation_ar: "خدمة الذكاء الاصطناعي غير مفعلة على الخادم.",
          evidence_search_enabled: false,
          limitations: ["لم يتم تفعيل نموذج الذكاء الاصطناعي."],
          research_leads: []
        });
      }

      try {
        const result = await env.AI.run(MODEL, {
          messages: [
            {
              role: "system",
              content:
                "أنت مساعد متخصص في تحليل الادعاءات الإخبارية باللغة العربية. " +
                "مهمتك تحليل نص الخبر فقط، وليس إثبات صحته. " +
                "لا تملك بحثاً مباشراً على الإنترنت في هذه المهمة. " +
                "لا تدّعِ أنك زرت مواقع أو تحققت من تصريحات أو وثائق. " +
                "لا تختلق مصادر أو روابط أو تواريخ. " +
                "حدد الادعاء الرئيسي، والجهة المختصة، " +
                "وما الأدلة اللازمة للتحقق، وهل توجد تفاصيل ناقصة. " +
                "اكتب بالعربية الفصحى بوضوح وباختصار. " +
                "ابدأ بعبارة: تحليل أولي غير موثق."
            },
            {
              role: "user",
              content:
                "حلل الادعاء التالي وحدد خطوات التحقق المطلوبة:\n\n" +
                claim
            }
          ],
          max_tokens: 700,
          temperature: 0.2
        });

        const analysis =
          typeof result?.response === "string"
            ? result.response.trim()
            : "";

        if (!analysis) {
          throw new Error("Empty AI response");
        }

        return respond({
          claim,
          verdict: "unverified",
          verdict_ar: "غير محسوم",
          explanation_ar: analysis,
          research_leads: [],
          submitted_links: getLinks(claim),
          sources: [],
          evidence_search_enabled: false,
          ai_analysis_enabled: true,
          limitations: [
            "الذكاء الاصطناعي حلل النص فقط.",
            "لم يتم البحث في المواقع الحكومية أو الأخبار المنشورة.",
            "لم يتم فحص محتوى روابط فيسبوك.",
            "لا يمكن اعتبار هذا التحليل إثباتاً لصحة الخبر أو نفيه."
          ],
          checked_at: new Date().toISOString()
        });

      } catch (error) {
        console.error("AI verification error", error);

        return respond({
          claim,
          verdict: "unverified",
          verdict_ar: "غير محسوم",
          explanation_ar:
            "تعذر تشغيل التحليل الذكي حالياً. حاول مجدداً.",
          research_leads: [],
          sources: [],
          evidence_search_enabled: false,
          ai_analysis_enabled: false,
          limitations: [
            "لم يتم تحليل الخبر أو البحث عن أدلة مستقلة."
          ],
          checked_at: new Date().toISOString()
        });
      }
    }

    return respond({
      service: "RASED AI API",
      message: "Use GET /health or POST /verify"
    });
  }
};
