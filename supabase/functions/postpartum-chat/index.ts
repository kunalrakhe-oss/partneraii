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

    // === GENERATE POSTPARTUM PLAN ===
    if (type === "generate-plan") {
      const systemPrompt = `You are a warm, knowledgeable AI postpartum recovery advisor. Based on the mother's assessment answers, generate a COMPREHENSIVE postpartum recovery plan.

IMPORTANT: You are NOT a doctor or midwife. Always recommend consulting a healthcare provider. Be especially sensitive — postpartum is an emotional and physically demanding time.

The plan should be compassionate, realistic, and phased. Cover:
1. 🌸 Recovery Summary — personalized overview based on their answers
2. 📅 Week-by-Week Recovery Timeline (Weeks 1-2, 3-4, 5-8, 8-12+)
3. 🧘 Gentle Exercises by Phase:
   - Early: breathing exercises, gentle walks, pelvic floor activation
   - Mid: core restoration (NO crunches), posture correction, light stretching
   - Later: progressive strengthening, diastasis recti safe exercises
4. 🍽️ Postpartum Nutrition — breastfeeding-friendly, iron-rich foods, hydration, energy-boosting meals
5. 😴 Sleep & Rest Strategies — realistic tips for sleep-deprived new moms
6. 💜 Mental Health & Emotional Wellness — baby blues vs postpartum depression signs, self-care practices, partner support tips
7. 🤱 Breastfeeding Support — posture, nutrition for milk supply, common challenges
8. ⚠️ Red Flags — when to call your doctor immediately (fever, heavy bleeding, severe mood changes, etc.)

For exercises: include name, description, reps/hold time, and modifications. Be encouraging and normalize the recovery journey. Use emojis and clear markdown.${langSuffix(language)}`;

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
