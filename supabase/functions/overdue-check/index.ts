import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];
    const nowTime = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    // 1. Overdue chores (due_date < today, not completed)
    const { data: overdueChores } = await supabase
      .from("chores")
      .select("id, title, user_id, assigned_to, partner_pair, due_date")
      .eq("is_completed", false)
      .lt("due_date", today)
      .not("due_date", "is", null);

    // 2. Overdue calendar events (event_date < today, not completed)
    const { data: overdueEvents } = await supabase
      .from("calendar_events")
      .select("id, title, user_id, assigned_to, partner_pair, event_date, event_time")
      .eq("is_completed", false)
      .lt("event_date", today);

    // 3. Today's calendar events where time has passed
    const { data: todayPastEvents } = await supabase
      .from("calendar_events")
      .select("id, title, user_id, assigned_to, partner_pair, event_date, event_time")
      .eq("is_completed", false)
      .eq("event_date", today)
      .not("event_time", "is", null)
      .lt("event_time", nowTime);

    const allOverdueEvents = [
      ...(overdueEvents || []),
      ...(todayPastEvents || []),
    ];

    // Dedup by user_id + title (not per-item-ID) to avoid spamming 
    // multiple notifications for recurring items with the same name.
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("title, user_id")
      .eq("type", "overdue");

    const existingSet = new Set(
      (existingNotifs || []).map((n) => `${n.user_id}:${n.title}`)
    );

    const notifications: Array<{
      user_id: string;
      partner_pair: string;
      type: string;
      title: string;
      message: string;
      link: string;
    }> = [];

    // Track titles we've already queued in this run to avoid duplicates
    const queuedSet = new Set<string>();

    const addNotif = (
      userId: string,
      partnerPair: string,
      title: string,
      message: string,
      link: string
    ) => {
      const key = `${userId}:${title}`;
      if (!existingSet.has(key) && !queuedSet.has(key)) {
        queuedSet.add(key);
        notifications.push({
          user_id: userId,
          partner_pair: partnerPair,
          type: "overdue",
          title,
          message,
          link,
        });
      }
    };

    // Process chores — one notification per title per user
    for (const chore of overdueChores || []) {
      const title = `⏰ Overdue: ${chore.title}`;
      const msg = `Due ${chore.due_date}`;
      const link = `/chores`;
      addNotif(chore.user_id, chore.partner_pair, title, msg, link);
      if (chore.assigned_to && chore.assigned_to !== chore.user_id) {
        addNotif(chore.assigned_to, chore.partner_pair, title, msg, link);
      }
    }

    // Process events — one notification per title per user
    for (const evt of allOverdueEvents) {
      const title = `⏰ Overdue: ${evt.title}`;
      const msg = `Scheduled ${evt.event_date}${evt.event_time ? " at " + evt.event_time : ""}`;
      const link = `/calendar`;
      addNotif(evt.user_id, evt.partner_pair, title, msg, link);
    }

    // Insert all notifications
    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({ sent: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});