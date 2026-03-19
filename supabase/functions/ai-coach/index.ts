import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tools = [
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Navigate the user to a specific page in the app with optional context",
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", enum: ["physio", "diet", "workout", "health", "budget", "calendar", "mood", "chat"] },
          context: { type: "string", description: "Context to pass as URL params" },
        },
        required: ["page"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_plan",
      description: "Create a recovery, diet, or workout plan for the user based on their needs",
      parameters: {
        type: "object",
        properties: {
          plan_type: { type: "string", enum: ["physio", "diet", "workout"] },
          title: { type: "string" },
          goal: { type: "string" },
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                duration_days: { type: "number" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      sets: { type: "string" },
                      notes: { type: "string" },
                    },
                    required: ["name"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["name", "duration_days", "exercises"],
              additionalProperties: false,
            },
          },
        },
        required: ["plan_type", "title", "phases"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "chat_response",
      description: "Just respond conversationally to the user without taking action",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string" },
          follow_up_question: { type: "string", description: "Optional follow-up question to ask" },
        },
        required: ["message"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, history, preferences, activePlans, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langInstruction = language === "hi"
      ? "\nIMPORTANT: Respond in Hindi (Devanagari script)."
      : "";

    // Build context
    let prefContext = "";
    if (preferences) {
      const parts: string[] = [];
      if (preferences.priorities?.length) parts.push(`Priorities: ${preferences.priorities.join(", ")}`);
      if (preferences.life_goals?.length) parts.push(`Life goals: ${preferences.life_goals.join(", ")}`);
      if (preferences.morning_routine) parts.push(`Morning style: ${preferences.morning_routine}`);
      if (parts.length) prefContext = `\n\nUser profile:\n${parts.join("\n")}`;
    }

    let planContext = "";
    if (activePlans?.length) {
      planContext = `\n\nActive plans:\n${activePlans.map((p: any) => `- ${p.title} (${p.plan_type}, Day ${p.day})`).join("\n")}`;
    }

    const systemPrompt = `You are PartnerAI — a warm, knowledgeable AI life coach built into a personal wellness app. You help users with health (physio, diet, workout), finances, relationships, and daily productivity.

Your role:
- Listen to what the user tells you and take the best action
- If they mention pain, injury, or health issues → ask clarifying questions then create a recovery plan
- If they mention diet preferences or restrictions → create or modify a diet plan
- If they mention workout goals → create or modify a workout plan
- If they just want to chat or need advice → respond warmly
- If they mention a specific feature → navigate them there
- Always ask follow-up questions when you need more info before creating a plan
- Keep responses concise (2-4 sentences) and actionable
- When creating plans, make them realistic and progressive (easy → moderate → challenging)

IMPORTANT: Use exactly ONE tool call per response. If you need more info, use chat_response with a follow_up_question.${prefContext}${planContext}${langInstruction}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []),
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        tool_choice: "required",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const choice = data.choices?.[0]?.message;

    // Parse tool call
    if (choice?.tool_calls?.[0]) {
      const tc = choice.tool_calls[0];
      const fn = tc.function.name;
      let args: any;
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      // If it's a create_plan, save to DB
      if (fn === "create_plan") {
        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
          const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
          );
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Get partner pair
            const { data: ppData } = await supabase.rpc("get_partner_pair", { uid: user.id });
            const partnerPair = ppData || `solo:${user.id}`;

            if (args.plan_type === "diet") {
              await supabase.from("diet_plans").insert({
                user_id: user.id,
                partner_pair: partnerPair,
                title: args.title,
                goal: args.goal || "general",
                plan_data: { phases: args.phases },
                is_active: true,
              });
            } else {
              await supabase.from("recovery_plans").insert({
                user_id: user.id,
                partner_pair: partnerPair,
                title: args.title,
                plan_type: args.plan_type || "physio",
                plan_data: { phases: args.phases },
                assessment_answers: {},
                is_active: true,
              });
            }
          }
        }
      }

      return new Response(JSON.stringify({ action: fn, data: args }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: plain text response
    return new Response(JSON.stringify({
      action: "chat_response",
      data: { message: choice?.content || "I'm here to help! What would you like to work on today?" },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
