import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, lang } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user's period data for context
    const authHeader = req.headers.get("Authorization");
    let periodContext = "";

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const token = authHeader.replace("Bearer ", "");
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
        const { data: logs } = await supabase
          .from("period_logs")
          .select("*")
          .order("period_start", { ascending: false })
          .limit(12);

        if (logs && logs.length > 0) {
          periodContext = `\n\nUser's period tracking data (most recent first):\n${logs
            .map(
              (l: any) =>
                `- Period: ${l.period_start} to ${l.period_end || "ongoing"}, Cycle length: ${l.cycle_length} days, Duration: ${l.period_duration} days${l.symptoms?.length ? ", Symptoms: " + l.symptoms.join(", ") : ""}${l.notes ? ", Notes: " + l.notes : ""}`
            )
            .join("\n")}`;
        }
      }
    }

    const isHindi = lang === "hi";

    const systemPrompt = `You are a warm, supportive fertility and baby planning assistant for a couple's app called LoveList. ${isHindi ? "Respond in Hindi (Devanagari script)." : "Respond in English."}

Your role:
- Help couples understand menstrual cycles and fertile windows
- Calculate ovulation days based on period data
- Provide evidence-based fertility tips
- Suggest lifestyle changes to improve conception chances
- Be encouraging and sensitive — trying to conceive can be emotional

Important guidelines:
- Always clarify you're an AI assistant, not a medical professional
- Recommend consulting a doctor for medical concerns
- Be warm and use a supportive, caring tone
- Use emojis sparingly to keep the conversation friendly
- When calculating fertile windows: ovulation typically occurs 14 days before the next period. The fertile window is usually days 10-16 of a 28-day cycle (adjust for different cycle lengths).
- Keep responses concise but helpful${periodContext}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("fertility-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
