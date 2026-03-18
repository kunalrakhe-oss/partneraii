import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { metrics, type, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (type === "chat") {
      const systemPrompt = `You are a personal health & wellness AI coach for a couples lifestyle app.
You analyze health metrics (steps, heart rate, sleep, calories, weight, water intake) and provide:
- Trend analysis and pattern recognition
- Actionable health recommendations
- Future predictions based on historical data
- Encouragement and motivation
Keep responses concise, warm, and actionable. Use emojis sparingly.
DISCLAIMER: You are not a licensed medical professional. Always recommend consulting a doctor for medical concerns.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${status}`);
      }

      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // type === "analyze" — structured analysis
    const prompt = `Analyze this health data and provide structured insights.
Here is the data (last 30 days):
${JSON.stringify(metrics, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a health analytics AI. Provide data-driven insights. Not a licensed medical professional." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_health_analysis",
            description: "Create a structured health analysis report",
            parameters: {
              type: "object",
              properties: {
                healthScore: { type: "number", description: "Overall health score 1-10" },
                summary: { type: "string", description: "2-3 sentence health summary" },
                trends: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      metric: { type: "string" },
                      direction: { type: "string", enum: ["up", "down", "stable"] },
                      insight: { type: "string" },
                      icon: { type: "string" },
                    },
                    required: ["metric", "direction", "insight", "icon"],
                    additionalProperties: false,
                  },
                },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      icon: { type: "string" },
                      priority: { type: "string", enum: ["High", "Medium", "Low"] },
                    },
                    required: ["title", "description", "icon", "priority"],
                    additionalProperties: false,
                  },
                },
                predictions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      prediction: { type: "string" },
                      icon: { type: "string" },
                    },
                    required: ["prediction", "icon"],
                    additionalProperties: false,
                  },
                },
                partnerTips: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tip: { type: "string" },
                      icon: { type: "string" },
                    },
                    required: ["tip", "icon"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["healthScore", "summary", "trends", "recommendations", "predictions", "partnerTips"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_health_analysis" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const analysis = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("health-analytics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
