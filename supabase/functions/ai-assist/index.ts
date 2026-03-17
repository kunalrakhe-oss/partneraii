import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "chore-suggest":
        systemPrompt = `You are a helpful relationship AI for a couple's app called LoveList. Analyze the couple's chore data and suggest fair task assignments. Consider workload balance and appreciate who is working hard. Be warm, encouraging, and relationship-positive. Keep responses concise (2-3 sentences max).`;
        userPrompt = `Here's the couple's chore data:\n${JSON.stringify(context)}\n\nSuggest a fair assignment or give appreciation for the workload balance.`;
        break;

      case "list-suggest":
        systemPrompt = `You are a smart shopping and planning assistant for a couple's app. Suggest related items based on what's already in their list. Be concise - return just a comma-separated list of 3-5 suggested items, no explanations.`;
        userPrompt = `Current list type: ${context.listType}\nItems already added: ${context.items}\n\nSuggest 3-5 related items they might need.`;
        break;

      case "date-ideas":
        systemPrompt = `You are a creative relationship advisor for couples. Suggest fun, unique date ideas based on the couple's interests and history. Keep each idea to one sentence. Return exactly 3 ideas.`;
        userPrompt = `The couple has these date ideas saved: ${context.existingIdeas || "none yet"}\nTheir mood today: ${context.mood || "unknown"}\nSuggest 3 fresh date ideas.`;
        break;

      case "workload-appreciation":
        systemPrompt = `You are a supportive relationship AI. Analyze who is contributing more to household tasks and give warm, specific appreciation. Don't be judgmental - be encouraging to both partners. Keep to 2-3 sentences.`;
        userPrompt = `Chore data:\n- Partner 1 completed: ${context.partner1Completed} chores\n- Partner 2 completed: ${context.partner2Completed} chores\n- Partner 1 name: ${context.partner1Name}\n- Partner 2 name: ${context.partner2Name}\n\nGive a warm workload appreciation message.`;
        break;

      case "chat-assist":
        systemPrompt = `You are a warm, helpful AI assistant embedded in a couple's shared app called LoveList. You help with relationship advice, planning, reminders, and general assistance. Be supportive, concise, and relationship-positive. If asked about the couple's data, reference what's provided. Keep responses short (2-4 sentences).`;
        userPrompt = context.message;
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

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
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
