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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, messages, answers, budgetData, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // === GENERATE FINANCIAL PLAN ===
    if (type === "generate-plan") {
      const systemPrompt = `You are a friendly, expert AI financial advisor for couples inside LoveList app. Based on the couple's financial assessment, generate a COMPREHENSIVE budget and financial plan.

IMPORTANT: You are NOT a licensed financial advisor. Always recommend consulting a certified financial planner for major decisions. Your advice is educational and general.

The plan should be practical, actionable, and couple-focused. Cover:
1. 💰 Financial Health Summary — assessment of their current situation
2. 📊 Recommended Monthly Budget — category-by-category breakdown with suggested amounts/percentages (50/30/20 rule or customized)
3. 🎯 Financial Goals — short-term (3-6 months), mid-term (1-2 years), long-term (5+ years)
4. 💳 Debt Strategy — if applicable, payoff plan (avalanche vs snowball method)
5. 🏦 Emergency Fund Plan — how much to save and timeline
6. 💕 Couple Money Tips — how to manage finances together, joint vs separate accounts, money date nights
7. 📈 Investment Ideas — beginner-friendly options based on their goals
8. 🛒 Smart Saving Tips — practical daily/weekly savings hacks
9. ⚠️ Financial Red Flags — spending patterns to watch

Use clear markdown, tables for budget breakdowns, and emojis. Be encouraging and realistic.${langSuffix(language)}`;

      const budgetContext = budgetData ? `\n\nExisting budget data: ${JSON.stringify(budgetData)}` : "";

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
            { role: "user", content: `Here are the couple's financial assessment answers:\n${JSON.stringify(answers, null, 2)}${budgetContext}\n\nPlease generate a comprehensive, personalized financial plan.` },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("AI gateway error");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // === STREAMING CHAT ===
    const chatSystemPrompt = `You are a friendly AI financial advisor for couples inside LoveList app. Help with budgeting, saving strategies, debt payoff, investing basics, financial goal setting, and managing money as a couple.

CRITICAL RULES:
- You are NOT a licensed financial advisor. Recommend professional consultation for major financial decisions.
- Be practical and actionable — give specific numbers and strategies when possible.
- Consider both partners' perspectives in financial discussions.
- Know common budgeting methods: 50/30/20, envelope system, zero-based budgeting.
- Help with expense tracking, bill splitting, and saving goals.
- Never recommend specific stocks or guarantee returns.
- Format responses with markdown.${langSuffix(language)}`;

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
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("finance-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
