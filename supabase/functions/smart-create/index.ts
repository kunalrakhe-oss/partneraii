import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tools = [
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a calendar event, reminder, or appointment. Use for anything time-based the user wants to remember or attend.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          event_date: { type: "string", description: "Date in YYYY-MM-DD format" },
          event_time: { type: "string", description: "Time in HH:MM format (24h), or null" },
          category: { type: "string", enum: ["date-night", "appointment", "anniversary", "birthday", "travel", "other"] },
          description: { type: "string", description: "Optional description" },
          reminder: { type: "string", enum: ["none", "15min", "1hour", "1day"], description: "Reminder timing" },
        },
        required: ["title", "event_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_chore",
      description: "Create a chore or task to be done around the house or in daily life.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Chore title" },
          due_date: { type: "string", description: "Due date in YYYY-MM-DD format, or null" },
          recurrence: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Recurrence pattern if repeating" },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_grocery_item",
      description: "Add an item to a list (grocery, todo, gift, travel packing, or date ideas).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Item name" },
          list_type: { type: "string", enum: ["grocery", "todo", "gift", "travel", "date"] },
          category: { type: "string", description: "Optional category like 'produce', 'dairy', etc." },
          notes: { type: "string", description: "Optional notes" },
          priority: { type: "string", enum: ["none", "low", "medium", "high"] },
        },
        required: ["name", "list_type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_memory",
      description: "Log a memory, milestone, or special moment to remember.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Memory title" },
          description: { type: "string", description: "Description of the memory" },
          type: { type: "string", enum: ["milestone", "date", "trip", "gift", "funny", "romantic", "other"] },
          memory_date: { type: "string", description: "Date in YYYY-MM-DD format" },
        },
        required: ["title", "type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_mood_log",
      description: "Log a mood or emotional state.",
      parameters: {
        type: "object",
        properties: {
          mood: { type: "string", enum: ["happy", "sad", "tired", "angry", "neutral"] },
          note: { type: "string", description: "Optional note about why they feel this way" },
        },
        required: ["mood"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { prompt } = await req.json();
    if (!prompt) throw new Error("prompt is required");

    const today = new Date().toISOString().split("T")[0];

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
            content: `You are a smart assistant that helps users create items in their life management app. Today's date is ${today}. Parse the user's natural language request and call the appropriate tool. If the user says "tomorrow", calculate the correct date. If unclear, make reasonable assumptions. Always call exactly one tool.`,
          },
          { role: "user", content: prompt },
        ],
        tools,
        tool_choice: "required",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI processing failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("AI could not understand the request");
    }

    const action = toolCall.function.name;
    const data = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ action, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("smart-create error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
