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

    // === GENERATE RECOVERY PLAN ===
    if (type === "generate-plan") {
      const systemPrompt = `You are a compassionate, expert AI physical therapy assistant. Based on the user's injury/recovery assessment answers, generate a COMPREHENSIVE physical therapy and recovery plan.

IMPORTANT: You are NOT a licensed physical therapist or doctor. Always recommend consulting a healthcare professional before starting any exercise program, especially post-injury or post-surgery.

The plan should be safe, progressive, and actionable. Cover:
1. 📋 Recovery Assessment Summary — summarize their situation
2. 🎯 Recovery Goals — short-term and long-term milestones
3. 🏥 Phase 1: Acute/Initial Recovery — gentle mobility, pain management, what to avoid
4. 💪 Phase 2: Strengthening — progressive exercises with sets, reps, hold times
5. 🏃 Phase 3: Return to Activity — functional movements, sport-specific if applicable
6. 🧊 Pain Management Tips — ice/heat, compression, elevation, when to rest
7. 🥗 Nutrition for Recovery — anti-inflammatory foods, protein, hydration
8. ⚠️ Red Flags — when to stop and see a doctor immediately

For each exercise include: name, description, sets/reps/hold time, difficulty level, and form tips. Use emojis and clear markdown formatting.${langSuffix(language)}`;

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
