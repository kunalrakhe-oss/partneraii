import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, messages, workoutHistory, stats, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // === GENERATE WORKOUT PLAN (structured) ===
    if (type === "generate-plan") {
      const systemPrompt = `You are FitBot, an expert AI fitness coach. Generate a complete workout plan. Consider the user's fitness level and goals. Always provide safe, effective exercises with proper form cues.`;

      const userPrompt = `Generate a ${context?.focus || "full body"} workout plan for ${context?.level || "intermediate"} level. ${context?.duration ? `Target duration: ${context.duration} minutes.` : ""} ${context?.equipment || "Standard gym equipment available."}`;

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
              name: "create_workout_plan",
              description: "Create a structured workout plan with exercises",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Workout plan title e.g. 'Full Body Strength'" },
                  focus: { type: "string", description: "Primary focus area e.g. 'Full Body', 'Upper Body', 'Lower Body', 'Core'" },
                  level: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
                  estimatedMinutes: { type: "number" },
                  estimatedCalories: { type: "number" },
                  warmup: { type: "string", description: "Brief warmup instructions" },
                  cooldown: { type: "string", description: "Brief cooldown instructions" },
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        muscleGroup: { type: "string", description: "Primary target e.g. Chest, Back, Legs, Shoulders, Arms, Core" },
                        sets: { type: "number" },
                        reps: { type: "string", description: "e.g. '10' or '8-12' or '30 sec'" },
                        restSeconds: { type: "number", description: "Rest between sets in seconds" },
                        notes: { type: "string", description: "Form cue or tip" },
                        icon: { type: "string", description: "Single emoji representing this exercise" },
                      },
                      required: ["name", "muscleGroup", "sets", "reps", "restSeconds", "icon"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "focus", "level", "estimatedMinutes", "estimatedCalories", "exercises"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_workout_plan" } },
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

    // === AI RECOMMENDATION ===
    if (type === "recommend") {
      const systemPrompt = `You are FitBot. Based on the user's recent workout history, suggest what they should focus on next. Be concise (2 sentences max). Include an emoji.`;
      const userPrompt = `Recent workouts: ${JSON.stringify(workoutHistory?.slice(0, 5) || [])}. Stats: ${JSON.stringify(stats || {})}. What should they do next?`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("recommend error:", response.status, t);
        throw new Error("AI error");
      }

      const data = await response.json();
      return new Response(JSON.stringify({ recommendation: data.choices?.[0]?.message?.content || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === STREAMING CHAT (existing) ===
    const chatSystemPrompt = `You are FitBot 🤖💪 — a friendly AI fitness coach inside LoveList. Help with workouts, form tips, nutrition, and couple fitness challenges. Be concise, energetic, and supportive. Format with markdown.

${stats ? `User stats: ${JSON.stringify(stats)}` : ""}
${workoutHistory ? `Recent: ${JSON.stringify(workoutHistory.slice(0, 5))}` : ""}`;

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
    console.error("fitbot-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
