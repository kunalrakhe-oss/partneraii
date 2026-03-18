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

    // === GENERATE WELLNESS REPORT ===
    if (type === "generate-report") {
      const systemPrompt = `You are a compassionate, professional men's health AI wellness advisor. Based on the user's answers to health assessment questions, generate a COMPREHENSIVE wellness report addressing erectile dysfunction holistically.

IMPORTANT: You are NOT a doctor. Always recommend consulting a healthcare professional. Focus on lifestyle modifications, exercise, diet, sleep, and stress management.

The report should be empathetic, non-judgmental, and actionable. Cover:
1. Overall Assessment Summary
2. Exercise Plan (include pelvic floor/kegel exercises, cardio recommendations, strength training)
3. Diet Recommendations (foods that support vascular health, nitric oxide production)
4. Sleep & Stress Management
5. Lifestyle Modifications
6. When to See a Doctor

Format with clear markdown headings, bullet points, and emojis for readability.${langSuffix(language)}`;

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
            { role: "user", content: `Here are the user's health assessment answers:\n${JSON.stringify(answers, null, 2)}\n\nPlease generate a comprehensive, personalized wellness report.` },
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

    // === STREAMING CHAT (follow-up questions) ===
    const chatSystemPrompt = `You are a compassionate men's health AI wellness advisor inside LoveList app. You help men with erectile dysfunction and related health concerns through lifestyle modifications, exercise plans, diet advice, and stress management.

CRITICAL RULES:
- You are NOT a doctor. Always recommend professional medical consultation for serious concerns.
- Be empathetic, non-judgmental, and professional.
- Focus on evidence-based lifestyle interventions: exercise (especially pelvic floor/kegels, cardio), nutrition, sleep, stress reduction.
- When discussing exercises, be specific about sets, reps, and form.
- Never prescribe medication or suggest stopping prescribed medication.
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
    console.error("mens-health-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
