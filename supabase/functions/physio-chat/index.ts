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

    // === GENERATE STRUCTURED RECOVERY PLAN ===
    if (type === "generate-plan") {
      const systemPrompt = `You are a compassionate, expert AI physical therapy assistant. Based on the user's injury/recovery assessment answers, generate a COMPREHENSIVE physical therapy and recovery plan.

IMPORTANT: You are NOT a licensed physical therapist or doctor. Always recommend consulting a healthcare professional before starting any exercise program, especially post-injury or post-surgery.

Generate a structured plan with phases, exercises, pain management tips, nutrition advice, and red flags.${langSuffix(language)}`;

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
            { role: "user", content: `Here are the user's recovery assessment answers:\n${JSON.stringify(answers, null, 2)}\n\nPlease generate a comprehensive, personalized physical therapy and recovery plan.` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_recovery_plan",
              description: "Create a structured physical therapy recovery plan",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Brief recovery assessment summary (2-3 sentences)" },
                  phases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Phase name e.g. 'Phase 1: Acute Recovery'" },
                        description: { type: "string", description: "What this phase focuses on" },
                        durationWeeks: { type: "string", description: "e.g. 'Weeks 1-2'" },
                        icon: { type: "string", description: "Single emoji for this phase" },
                        exercises: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              description: { type: "string", description: "How to perform this exercise" },
                              sets: { type: "number" },
                              reps: { type: "string", description: "e.g. '10' or '30 seconds hold'" },
                              holdTime: { type: "string", description: "e.g. '15 seconds' if applicable" },
                              difficulty: { type: "string", enum: ["Easy", "Moderate", "Challenging"] },
                              formTips: { type: "string", description: "Key form tip" },
                              icon: { type: "string", description: "Single emoji" },
                              imagePrompt: { type: "string", description: "Brief description for generating an illustration of this exercise" },
                            },
                            required: ["name", "description", "sets", "reps", "difficulty", "icon", "imagePrompt"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["title", "description", "durationWeeks", "icon", "exercises"],
                      additionalProperties: false,
                    },
                  },
                  painManagement: {
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
                  nutrition: {
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
                  redFlags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Warning signs that require immediate medical attention",
                  },
                },
                required: ["summary", "phases", "painManagement", "nutrition", "redFlags"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_recovery_plan" } },
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
    const chatSystemPrompt = `You are a friendly AI physical therapy assistant inside LoveList app. You help users with injury recovery, rehabilitation exercises, mobility work, pain management, and return-to-activity planning.

CRITICAL RULES:
- You are NOT a licensed physical therapist or doctor. Always recommend professional consultation for serious injuries.
- Be empathetic and encouraging — recovery is hard.
- Focus on evidence-based rehabilitation: ROM exercises, progressive strengthening, mobility, stretching.
- When describing exercises, be very specific about form, sets, reps, hold times, and modifications.
- Never suggest ignoring pain or pushing through sharp/acute pain.
- Always mention red flags (numbness, increased swelling, sharp pain) that warrant medical attention.
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
    console.error("physio-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
