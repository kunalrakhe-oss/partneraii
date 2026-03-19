import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Onboarding-specific tool ──
const onboardingTools = [
  {
    type: "function",
    function: {
      name: "build_profile",
      description: "Build a structured life profile for the user after gathering enough context from the conversation. Call this when you have a good understanding of the user's goals, priorities, and lifestyle.",
      parameters: {
        type: "object",
        properties: {
          priorities: {
            type: "array",
            items: { type: "string" },
            description: "Top life priorities e.g. Health & Fitness, Financial Freedom, Relationships, Career Growth, Mental Wellness",
          },
          life_goals: {
            type: "array",
            items: { type: "string" },
            description: "Specific aspirational goals e.g. Become debt free, Run a marathon, Earn first million, Lose 10kg",
          },
          daily_goals: {
            type: "array",
            items: { type: "string" },
            description: "Daily habits to build e.g. Morning workout, Track expenses, Meditate 10 min",
          },
          morning_routine: {
            type: "string",
            description: "Recommended morning routine style: rushed, relaxed, workout, or planning",
          },
          profile_summary: {
            type: "string",
            description: "A warm, motivational one-liner about the user, e.g. 'Ambitious professional on a mission to build wealth and peak fitness'",
          },
        },
        required: ["priorities", "life_goals", "daily_goals", "morning_routine", "profile_summary"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "chat_response",
      description: "Respond conversationally to gather more info before building the profile",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string" },
          follow_up_question: { type: "string", description: "The next question to ask" },
        },
        required: ["message"],
        additionalProperties: false,
      },
    },
  },
];

// ── Regular coach tools ──
const coachTools = [
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
                      image_prompt: { type: "string" },
                      recipe: {
                        type: "object",
                        properties: {
                          ingredients: { type: "array", items: { type: "string" } },
                          instructions: { type: "string" },
                          prep_time: { type: "string" },
                          calories: { type: "number" },
                        },
                        required: ["ingredients", "instructions"],
                        additionalProperties: false,
                      },
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
      name: "modify_plan",
      description: "Modify an existing recovery, diet, or workout plan based on user feedback.",
      parameters: {
        type: "object",
        properties: {
          plan_id: { type: "string" },
          plan_type: { type: "string", enum: ["physio", "diet", "workout"] },
          modifications: { type: "string" },
          updated_phases: {
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
                      image_prompt: { type: "string" },
                      recipe: {
                        type: "object",
                        properties: {
                          ingredients: { type: "array", items: { type: "string" } },
                          instructions: { type: "string" },
                          prep_time: { type: "string" },
                          calories: { type: "number" },
                        },
                        required: ["ingredients", "instructions"],
                        additionalProperties: false,
                      },
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
        required: ["plan_id", "plan_type", "modifications", "updated_phases"],
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
          follow_up_question: { type: "string" },
        },
        required: ["message"],
        additionalProperties: false,
      },
    },
  },
];

// ── System prompts ──
function getOnboardingPrompt(userName: string, appMode: string, language: string) {
  const langInstruction = language === "hi" ? "\nIMPORTANT: Respond in Hindi (Devanagari script)." : "";
  return `You are PAI — a warm, motivational AI Life Coach. You're onboarding a new user named "${userName}" who chose "${appMode}" mode.

Your job: Ask 3-5 conversational questions to understand their life situation, then build their profile using the build_profile tool.

CONVERSATION FLOW:
1. First message: Greet them warmly by name. Ask about the ONE area they most want to improve (health, money, relationships, career, wellness).
2. Based on their answer, ask 1-2 follow-up questions to understand specifics (injuries? debt? goals? timeline?)
3. After 3-5 exchanges total, you should have enough to build their profile. Call build_profile.

STYLE:
- Be enthusiastic and motivational. Use emojis sparingly (1-2 per message).
- Keep responses SHORT (2-3 sentences max + a question)
- Use aspirational language: "financial freedom", "peak fitness", "build wealth", "earn your first million", "become debt-free", "master your time"
- Make them feel like they have a powerful coach in their corner

RULES:
- Use chat_response for questions (include follow_up_question field)
- Use build_profile ONLY when you have enough info (after 3+ exchanges)
- priorities should be broad categories: "Health & Fitness", "Financial Freedom", "Relationships", "Career Growth", "Mental Wellness", "Productivity"
- life_goals should be specific and aspirational
- daily_goals should be small actionable habits
- morning_routine should be one of: rushed, relaxed, workout, planning
- profile_summary should be a warm one-liner about who they are and what drives them${langInstruction}`;
}

function getCoachPrompt(preferences: any, activePlans: any[], language: string) {
  const langInstruction = language === "hi" ? "\nIMPORTANT: Respond in Hindi (Devanagari script)." : "";
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
    planContext = `\n\nActive plans:\n${activePlans.map((p: any) => `- [ID: ${p.id}] ${p.title} (${p.plan_type}, Day ${p.day})`).join("\n")}`;
  }
  return `You are PAI — a warm, knowledgeable AI life coach built into a personal wellness app. You help users with health (physio, diet, workout), finances, relationships, and daily productivity.

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

PLAN CREATION RULES:
- For EXERCISE plans (physio/workout): include "image_prompt" for each exercise
- For DIET plans: ALWAYS include a "recipe" object for each meal item with ingredients list, brief instructions, prep_time, and estimated calories

PLAN MODIFICATION RULES:
- When user asks to change something about an existing plan, use the modify_plan tool
- You MUST include the plan_id from the active plans list
- Provide the COMPLETE updated_phases array
- Describe what you changed in the modifications field

IMPORTANT: Use exactly ONE tool call per response.${prefContext}${planContext}${langInstruction}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { message, history, preferences, activePlans, language, onboarding, onboardingMode, userName, appMode, priorities, life_goals, daily_goals } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isOnboarding = !!onboarding;

    // ── Structured onboarding: skip conversation, generate profile summary directly ──
    if (isOnboarding && onboardingMode === "structured") {
      const langInstruction = language === "hi" ? " Respond in Hindi." : "";
      const structuredPrompt = `You are PAI, a motivational AI life coach. A user named "${userName || "there"}" just completed onboarding. Generate a warm, personalized profile for them.

Their selections:
- Priorities: ${(priorities || []).join(", ")}
- Life Goals: ${(life_goals || []).join(", ")}
- Daily Habits: ${(daily_goals || []).join(", ")}

Call the build_profile tool with:
- priorities: exactly what they selected
- life_goals: exactly what they selected  
- daily_goals: exactly what they selected
- morning_routine: infer from their daily habits (one of: rushed, relaxed, workout, planning)
- profile_summary: a warm, motivational one-liner about who they are based on their selections. Make it personal and inspiring.${langInstruction}`;

      const structuredResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: structuredPrompt }, { role: "user", content: "Build my profile now." }],
          tools: [onboardingTools[0]],
          tool_choice: "required",
        }),
      });

      if (!structuredResponse.ok) {
        const t = await structuredResponse.text();
        console.error("AI structured error:", structuredResponse.status, t);
        throw new Error("AI gateway error");
      }

      const structuredData = await structuredResponse.json();
      const sChoice = structuredData.choices?.[0]?.message;
      if (sChoice?.tool_calls?.[0]) {
        const tc = sChoice.tool_calls[0];
        let args: any;
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

        // Save to DB
        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
          const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
          );
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            await supabaseClient.from("user_preferences").upsert({
              user_id: user.id,
              priorities: args.priorities || priorities || [],
              life_goals: args.life_goals || life_goals || [],
              daily_goals: args.daily_goals || daily_goals || [],
              morning_routine: args.morning_routine || null,
              profile_summary: args.profile_summary || null,
            }, { onConflict: "user_id" });
          }
        }

        return new Response(JSON.stringify({ action: "build_profile", data: args }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback
      return new Response(JSON.stringify({ action: "chat_response", data: { message: "Profile built!" } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Regular conversational flow ──
    const systemPrompt = isOnboarding
      ? getOnboardingPrompt(userName || "there", appMode || "single", language || "en")
      : getCoachPrompt(preferences, activePlans, language || "en");
    const tools = isOnboarding ? onboardingTools : coachTools;

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

    if (choice?.tool_calls?.[0]) {
      const tc = choice.tool_calls[0];
      const fn = tc.function.name;
      let args: any;
      try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

      const authHeader = req.headers.get("Authorization");
      const getSupabase = () => {
        if (!authHeader) return null;
        return createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
      };

      // ── Onboarding: build_profile ──
      if (fn === "build_profile") {
        const supabase = getSupabase();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("user_preferences").upsert({
              user_id: user.id,
              priorities: args.priorities || [],
              life_goals: args.life_goals || [],
              daily_goals: args.daily_goals || [],
              morning_routine: args.morning_routine || null,
              profile_summary: args.profile_summary || null,
            }, { onConflict: "user_id" });
          }
        }
      }

      // ── Create plan ──
      if (fn === "create_plan") {
        const supabase = getSupabase();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: ppData } = await supabase.rpc("get_partner_pair", { uid: user.id });
            const partnerPair = ppData || `solo:${user.id}`;
            if (args.plan_type === "diet") {
              const { data: inserted } = await supabase.from("diet_plans").insert({
                user_id: user.id, partner_pair: partnerPair, title: args.title,
                goal: args.goal || "general", plan_data: { phases: args.phases }, is_active: true,
              }).select("id").single();
              if (inserted) args.plan_id = inserted.id;
            } else {
              const { data: inserted } = await supabase.from("recovery_plans").insert({
                user_id: user.id, partner_pair: partnerPair, title: args.title,
                plan_type: args.plan_type || "physio", plan_data: { phases: args.phases },
                assessment_answers: {}, is_active: true,
              }).select("id").single();
              if (inserted) args.plan_id = inserted.id;
            }
          }
        }
      }

      // ── Modify plan ──
      if (fn === "modify_plan") {
        const supabase = getSupabase();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const table = args.plan_type === "diet" ? "diet_plans" : "recovery_plans";
            await supabase.from(table)
              .update({ plan_data: { phases: args.updated_phases } })
              .eq("id", args.plan_id).eq("user_id", user.id);
          }
        }
      }

      return new Response(JSON.stringify({ action: fn, data: args }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
