import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stats, language, preferences } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langInstruction = language === "hi"
      ? "\n\nIMPORTANT: The user's language is Hindi. You MUST respond entirely in Hindi (Devanagari script). Use natural Hindi, not transliteration."
      : "";

    // Build preference context if available
    let prefContext = "";
    if (preferences) {
      const parts: string[] = [];
      if (preferences.priorities?.length > 0) {
        parts.push(`Their top priorities: ${preferences.priorities.join(", ")}`);
      }
      if (preferences.morning_routine) {
        parts.push(`Morning style: ${preferences.morning_routine}`);
      }
      if (preferences.daily_intent) {
        parts.push(`Today's chosen focus: ${preferences.daily_intent}`);
      }
      if (parts.length > 0) {
        prefContext = `\n\nUser preferences:\n${parts.join("\n")}`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a warm, encouraging AI life coach for PartnerAI — an app that helps people manage their day, health, finances, and relationships. Generate a short, personalized daily insight (2-3 sentences max) based on the user's stats and preferences. Be specific, warm, and actionable. Use emojis sparingly. Never be generic — reference the actual numbers and their stated priorities.${prefContext}${langInstruction}`,
          },
          {
            role: "user",
            content: `Here are my stats for today:
- Days using app: ${stats.daysTogether}
- Pending chores: ${stats.pendingChores}
- Completed chores: ${stats.completedChores}
- Grocery items left: ${stats.groceryItems}
- Events today: ${stats.todayEvents}
- Total memories: ${stats.totalMemories}
- Messages exchanged: ${stats.messageCount}
- Partner mood today: ${stats.partnerMood || "not logged yet"}
- Time of day: ${stats.timeOfDay}

Give me a personalized daily insight.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || "Keep building your best life! 💕";

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-insight error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
