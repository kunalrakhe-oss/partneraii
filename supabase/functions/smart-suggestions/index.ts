import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get auth token to fetch user context
    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    
    // Gather context: recent items, time of day, day of week
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const hour = today.getUTCHours();
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];
    
    let contextParts: string[] = [
      `Current date: ${todayStr}, ${dayName}`,
      `Time of day: ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}`,
    ];

    if (user) {
      // Fetch recent chores, events, and grocery items for context
      const [choresRes, eventsRes, groceryRes, moodRes, profileRes] = await Promise.all([
        supabase.from("chores").select("title").eq("is_completed", false).order("created_at", { ascending: false }).limit(5),
        supabase.from("calendar_events").select("title, event_date, category").gte("event_date", todayStr).order("event_date").limit(5),
        supabase.from("grocery_items").select("name, list_type").eq("is_checked", false).order("created_at", { ascending: false }).limit(5),
        supabase.from("mood_logs").select("mood, note").order("created_at", { ascending: false }).limit(1),
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
      ]);

      if (profileRes.data?.display_name) {
        contextParts.push(`User's name: ${profileRes.data.display_name}`);
      }
      if (choresRes.data?.length) {
        contextParts.push(`Active chores: ${choresRes.data.map(c => c.title).join(", ")}`);
      }
      if (eventsRes.data?.length) {
        contextParts.push(`Upcoming events: ${eventsRes.data.map(e => `${e.title} (${e.event_date})`).join(", ")}`);
      }
      if (groceryRes.data?.length) {
        contextParts.push(`Pending list items: ${groceryRes.data.map(g => `${g.name} [${g.list_type}]`).join(", ")}`);
      }
      if (moodRes.data?.length) {
        contextParts.push(`Recent mood: ${moodRes.data[0].mood}${moodRes.data[0].note ? ` (${moodRes.data[0].note})` : ""}`);
      }
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "provide_suggestions",
          description: "Return 4-6 personalized quick-add suggestions for the user.",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    emoji: { type: "string", description: "A single emoji representing this suggestion" },
                    label: { type: "string", description: "Short label (3-6 words max)" },
                    prompt: { type: "string", description: "The full natural language prompt to pass to smart-create if selected" },
                  },
                  required: ["emoji", "label", "prompt"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a smart life assistant. Based on the user's context (time of day, existing tasks, recent mood, upcoming events), generate 4-6 personalized, actionable quick-add suggestions. Mix different types: chores, reminders, grocery items, mood logs, memories. Make them feel personal and timely. Keep labels very short (3-6 words). The prompt field should be a natural language command that can be parsed by an AI to create the item.`,
          },
          {
            role: "user",
            content: `Here is my current context:\n${contextParts.join("\n")}\n\nGenerate personalized quick-add suggestions for me.`,
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "provide_suggestions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI processing failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) throw new Error("AI could not generate suggestions");

    const { suggestions } = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("smart-suggestions error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
