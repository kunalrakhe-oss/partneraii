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
    const { type, messages, answers, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // === GENERATE STRUCTURED POSTPARTUM PLAN ===
    if (type === "generate-plan") {
      const systemPrompt = `You are a warm, knowledgeable AI postpartum recovery advisor. Based on the mother's assessment answers, generate a COMPREHENSIVE postpartum recovery plan.

IMPORTANT: You are NOT a doctor or midwife. Always recommend consulting a healthcare provider. Be especially sensitive — postpartum is an emotional and physically demanding time.

Generate a structured plan with weekly timeline phases, exercises, nutrition, mental health tips, and red flags.${langSuffix(language)}`;

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
            { role: "user", content: `Here are the mother's postpartum assessment answers:\n${JSON.stringify(answers, null, 2)}\n\nPlease generate a comprehensive, personalized postpartum recovery plan.` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_postpartum_plan",
              description: "Create a structured postpartum recovery plan",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Personalized recovery overview (2-3 sentences)" },
                  timeline: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        week: { type: "string", description: "e.g. 'Weeks 1-2'" },
                        title: { type: "string", description: "Phase title e.g. 'Gentle Beginnings'" },
                        icon: { type: "string" },
                        exercises: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              description: { type: "string" },
                              sets: { type: "number" },
                              reps: { type: "string" },
                              holdTime: { type: "string" },
                              difficulty: { type: "string", enum: ["Gentle", "Easy", "Moderate"] },
                              formTips: { type: "string" },
                              icon: { type: "string" },
                              imagePrompt: { type: "string" },
                              modification: { type: "string", description: "C-section or vaginal delivery modification" },
                            },
                            required: ["name", "description", "sets", "reps", "difficulty", "icon", "imagePrompt"],
                            additionalProperties: false,
                          },
                        },
                        nutritionTips: {
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
                        mentalHealth: {
                          type: "object",
                          properties: {
                            tip: { type: "string" },
                            icon: { type: "string" },
                          },
                          required: ["tip", "icon"],
                          additionalProperties: false,
                        },
                      },
                      required: ["week", "title", "icon", "exercises", "nutritionTips", "mentalHealth"],
                      additionalProperties: false,
                    },
                  },
                  redFlags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Warning signs requiring immediate medical attention",
                  },
                },
                required: ["summary", "timeline", "redFlags"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_postpartum_plan" } },
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

    // === STREAMING CHAT ===
    const chatSystemPrompt = `You are a compassionate AI postpartum recovery advisor inside LoveList app. You help new mothers with physical recovery, exercises, nutrition, mental health, breastfeeding, and newborn care tips.

CRITICAL RULES:
- You are NOT a doctor or midwife. Always recommend professional consultation for medical concerns.
- Be warm, supportive, and non-judgmental. New mothers need encouragement.
- Focus on evidence-based postpartum recovery: pelvic floor rehab, core restoration, nutrition, mental wellness.
- When describing exercises, specify modifications for C-section vs vaginal delivery.
- Take mental health seriously — know the difference between baby blues and postpartum depression.
- Never minimize a mother's concerns or suggest "just pushing through."
- Format responses with markdown for readability.${langSuffix(language)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: chatSystemPrompt }, ...messages],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("postpartum-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
