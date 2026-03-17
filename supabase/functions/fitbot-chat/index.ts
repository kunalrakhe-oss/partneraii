import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, workoutHistory, stats } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are FitBot 🤖💪 — a friendly, motivating AI fitness coach inside a couple's app called LoveList. You help both partners stay fit together.

Your personality:
- Energetic, supportive, and knowledgeable
- Use emojis naturally but not excessively
- Give concise, actionable fitness advice
- Encourage couples to work out together
- Be warm and celebrate progress

You can help with:
- Generating personalized workout plans (with exercises, sets, reps, rest times)
- Suggesting exercises for specific muscle groups or goals
- Giving form tips and injury prevention advice
- Creating couple workout challenges
- Providing nutrition tips related to fitness
- Motivating users based on their workout history
- Answering fitness questions

When generating workouts, format them clearly with markdown:
- Use **bold** for exercise names
- Use bullet points for sets/reps
- Include rest times between sets
- Add difficulty levels (Beginner/Intermediate/Advanced)

Context about the user's fitness data:
${stats ? `- Total workouts: ${stats.totalWorkouts}\n- Total minutes: ${stats.totalMinutes}\n- Today's workouts: ${stats.todayCount}\n- Partner workouts: ${stats.partnerWorkouts}` : "No workout data yet — they're just getting started!"}
${workoutHistory ? `\nRecent workouts: ${JSON.stringify(workoutHistory.slice(0, 5))}` : ""}

Keep responses focused and under 300 words unless generating a full workout plan.`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("fitbot-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
