import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function langSuffix(language?: string) {
  return language === "hi"
    ? "\n\nIMPORTANT: The user's language is Hindi. You MUST respond entirely in Hindi (Devanagari script). Use natural Hindi, not transliteration."
    : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, currentItems, preferences, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // === PERSONALIZED DIET SUGGESTION ===
    if (type === "suggest") {
      const systemPrompt = `You are DietBot, a friendly AI nutritionist inside LoveList — a couples app. Suggest a full day's personalized diet plan across 6 meal slots: Morning (after wake up), Breakfast, Lunch, Evening Snack, Dinner, Night. Consider the user's existing food preferences and items. Keep suggestions healthy, practical, and culturally appropriate. Be concise.${langSuffix(language)}`;

      const userPrompt = `Here are the user's current diet items for context: ${JSON.stringify(currentItems || [])}.
User food preferences/restrictions: ${preferences || "None specified"}.
Please suggest a complete personalized diet plan for today. For each meal slot, suggest 1-2 items with approximate calories.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_diet_plan",
              description: "Create a structured personalized diet plan with meal suggestions",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        meal_type: { type: "string", enum: ["morning", "breakfast", "lunch", "evening_snack", "dinner", "night"] },
                        description: { type: "string", description: "Food item name" },
                        calories: { type: "number", description: "Approximate calories" },
                        notes: { type: "string", description: "Brief health benefit or tip" },
                        emoji: { type: "string", description: "Single emoji for this food" },
                      },
                      required: ["meal_type", "description", "calories", "emoji"],
                      additionalProperties: false,
                    },
                  },
                  tip: { type: "string", description: "One overall nutrition tip for the day" },
                },
                required: ["suggestions", "tip"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_diet_plan" } },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("AI error:", status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");

      const plan = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ plan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dietbot-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
