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

async function callAI(body: any, LOVABLE_API_KEY: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) return { error: "Rate limited", status: 429 };
    if (status === 402) return { error: "AI credits exhausted", status: 402 };
    const t = await response.text();
    console.error("AI error:", status, t);
    return { error: "AI gateway error", status: 500 };
  }

  const data = await response.json();
  return { data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type, language } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // === PERSONALIZED DIET SUGGESTION (single day) ===
    if (type === "suggest") {
      const { currentItems, preferences } = body;
      const systemPrompt = `You are DietBot, a friendly AI nutritionist inside LoveList — a couples app. Suggest a full day's personalized diet plan across 6 meal slots: Morning (after wake up), Breakfast, Lunch, Evening Snack, Dinner, Night. Consider the user's existing food preferences and items. Keep suggestions healthy, practical, and culturally appropriate. Be concise.${langSuffix(language)}`;

      const userPrompt = `Here are the user's current diet items for context: ${JSON.stringify(currentItems || [])}.
User food preferences/restrictions: ${preferences || "None specified"}.
Please suggest a complete personalized diet plan for today. For each meal slot, suggest 1-2 items with approximate calories.`;

      const result = await callAI({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_diet_plan",
            description: "Create a structured personalized diet plan with meal suggestions",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      meal_type: { type: "string", enum: ["morning", "breakfast", "lunch", "evening_snack", "dinner", "night"] },
                      description: { type: "string", description: "Food item name" },
                      calories: { type: "number", description: "Approximate calories" },
                      notes: { type: "string", description: "Brief health benefit or tip" },
                      emoji: { type: "string", description: "Single emoji for this food" },
                    },
                    required: ["meal_type", "description", "calories", "emoji"],
                    additionalProperties: false,
                  },
                },
                tip: { type: "string", description: "One overall nutrition tip for the day" },
              },
              required: ["suggestions", "tip"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_diet_plan" } },
      }, LOVABLE_API_KEY);

      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolCall = result.data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");
      const plan = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ plan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === WEEKLY TRANSFORMATION DIET PLAN ===
    if (type === "plan") {
      const { goal, preferences, weight, targetWeight, activityLevel, restrictions } = body;
      const systemPrompt = `You are DietBot, an expert AI nutritionist. Create a comprehensive 7-day transformation diet plan. The plan should be practical, culturally appropriate, and tailored to the user's goal. Include variety across days. Each day must have meals for all 6 categories: morning (after wake up), breakfast, lunch, evening_snack, dinner, night.${langSuffix(language)}`;

      const userPrompt = `Goal: ${goal || "maintain"}
Dietary preferences: ${preferences || "No preference"}
Restrictions/Allergies: ${restrictions || "None"}
Activity level: ${activityLevel || "moderate"}
Current weight: ${weight || "Not specified"}
Target weight: ${targetWeight || "Not specified"}

Create a detailed 7-day diet plan with daily calorie targets and practical meals.`;

      const result = await callAI({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_weekly_plan",
            description: "Create a structured 7-day transformation diet plan",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Plan title e.g. '7-Day Weight Loss Plan'" },
                goal: { type: "string" },
                daily_calories: { type: "number", description: "Target daily calories" },
                days: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      day: { type: "string", description: "Day label e.g. 'Day 1 - Monday'" },
                      meals: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            meal_type: { type: "string", enum: ["morning", "breakfast", "lunch", "evening_snack", "dinner", "night"] },
                            description: { type: "string" },
                            calories: { type: "number" },
                            notes: { type: "string" },
                            emoji: { type: "string" },
                          },
                          required: ["meal_type", "description", "calories", "emoji"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["day", "meals"],
                    additionalProperties: false,
                  },
                },
                tips: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-5 transformation tips",
                },
              },
              required: ["title", "goal", "daily_calories", "days", "tips"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_weekly_plan" } },
      }, LOVABLE_API_KEY);

      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolCall = result.data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");
      const plan = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ plan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PARSE UPLOADED IMAGE/PDF ===
    if (type === "parse_upload") {
      const { imageBase64, textContent } = body;
      const systemPrompt = `You are DietBot. The user has uploaded their own diet plan (image or text). Extract and map all food items to these 6 meal categories: morning (after wake up), breakfast, lunch, evening_snack, dinner, night. Estimate calories if not provided. Return structured data.${langSuffix(language)}`;

      const messages: any[] = [{ role: "system", content: systemPrompt }];

      if (imageBase64) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: "Extract the diet plan from this image and map it to the 6 meal categories with calorie estimates." },
            { type: "image_url", image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } },
          ],
        });
      } else {
        messages.push({
          role: "user",
          content: `Extract and structure this diet plan text into the 6 meal categories:\n\n${textContent}`,
        });
      }

      const result = await callAI({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [{
          type: "function",
          function: {
            name: "parse_diet_plan",
            description: "Parse an uploaded diet plan into structured meal data",
            parameters: {
              type: "object",
              properties: {
                meals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      meal_type: { type: "string", enum: ["morning", "breakfast", "lunch", "evening_snack", "dinner", "night"] },
                      description: { type: "string" },
                      calories: { type: "number" },
                      notes: { type: "string" },
                      emoji: { type: "string" },
                    },
                    required: ["meal_type", "description", "calories", "emoji"],
                    additionalProperties: false,
                  },
                },
                detected_goal: { type: "string", description: "Detected goal from the plan" },
                summary: { type: "string", description: "Brief summary of the uploaded plan" },
              },
              required: ["meals", "summary"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "parse_diet_plan" } },
      }, LOVABLE_API_KEY);

      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolCall = result.data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dietbot-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
