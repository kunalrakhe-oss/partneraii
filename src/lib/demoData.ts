import { format, addDays } from "date-fns";

const today = format(new Date(), "yyyy-MM-dd");
const saturday = (() => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 6 ? 7 : 6 - day;
  return format(addDays(d, diff), "yyyy-MM-dd");
})();

export const DEMO_PARTNER1 = "Kunal";
export const DEMO_PARTNER2 = "Neelam";

export const DEMO_STATS = {
  daysTogether: 120,
  totalEvents: 8,
  totalMemories: 3,
  completedChores: 5,
};

export const DEMO_PARTNER_MOOD = {
  mood: "happy",
  note: "Feeling great today! 💕",
};

export const DEMO_MOOD_MESSAGE = `${DEMO_PARTNER2} is feeling happy today. Maybe send her a sweet message ❤️`;

export const DEMO_AI_INSIGHT = "💡 Suggestion: Plan a surprise for Neelam this weekend";

export const DEMO_TODAY_EVENTS = [
  { id: "demo-ev-1", title: "Dinner Date 🍝", event_time: "20:00", event_date: today, category: "date-night", is_completed: false },
];

export const DEMO_CALENDAR_EVENTS = [
  { id: "demo-cal-1", title: "Dinner Date 🍝", description: "Our favorite Italian place", category: "date-night", event_date: today, event_time: "20:00", assigned_to: "both", priority: "high", recurrence: "once", is_completed: false, user_id: "demo", partner_pair: "demo", countdown_type: "none" },
  { id: "demo-cal-2", title: "Weekend Movie Night 🎬", description: "Pick a new release", category: "date-night", event_date: saturday, event_time: "19:30", assigned_to: "both", priority: "medium", recurrence: "once", is_completed: false, user_id: "demo", partner_pair: "demo", countdown_type: "none" },
];

export const DEMO_GROCERY_ITEMS = [
  { id: "demo-g-1", name: "Milk", category: "dairy", is_checked: false, list_type: "grocery", sort_order: 1, priority: "none", is_flagged: false, notes: null, due_date: null, image_url: null, created_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo" },
  { id: "demo-g-2", name: "Eggs", category: "dairy", is_checked: false, list_type: "grocery", sort_order: 2, priority: "none", is_flagged: false, notes: null, due_date: null, image_url: null, created_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo" },
  { id: "demo-g-3", name: "Bread", category: "bakery", is_checked: false, list_type: "grocery", sort_order: 3, priority: "none", is_flagged: false, notes: null, due_date: null, image_url: null, created_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo" },
  { id: "demo-g-4", name: "Flowers 🌹", category: "other", is_checked: false, list_type: "gift", sort_order: 1, priority: "none", is_flagged: false, notes: null, due_date: null, image_url: null, created_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo" },
  { id: "demo-g-5", name: "Perfume", category: "other", is_checked: false, list_type: "gift", sort_order: 2, priority: "none", is_flagged: false, notes: null, due_date: null, image_url: null, created_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo" },
  { id: "demo-g-6", name: "Goa Trip ✈️", category: "other", is_checked: false, list_type: "travel", sort_order: 1, priority: "none", is_flagged: false, notes: null, due_date: null, image_url: null, created_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo" },
];

export const DEMO_CHAT_MESSAGES = [
  { id: "demo-chat-1", user_id: "partner", partner_pair: "demo", message: "Good morning ❤️", type: "text", created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: "demo-chat-2", user_id: "me", partner_pair: "demo", message: "Love you, have a great day!", type: "text", created_at: new Date(Date.now() - 3600000 * 2.5).toISOString() },
  { id: "demo-chat-3", user_id: "partner", partner_pair: "demo", message: "Don't forget dinner tonight 😘", type: "text", created_at: new Date(Date.now() - 3600000 * 1).toISOString() },
];

export const DEMO_CHORES = [
  { id: "demo-ch-1", title: "Do Laundry", assigned_to: "me", is_completed: false, recurrence: "weekly", due_date: today, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo", image_url: null },
  { id: "demo-ch-2", title: "Clean Kitchen", assigned_to: "partner", is_completed: false, recurrence: "daily", due_date: today, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo", image_url: null },
  { id: "demo-ch-3", title: "Buy Groceries", assigned_to: null, is_completed: false, recurrence: "weekly", due_date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo", image_url: null },
];

export const DEMO_MEMORIES = [
  { id: "demo-mem-1", title: "First Date 💕", description: "The day everything started", memory_date: "2024-11-18", type: "milestone", photo_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo" },
  { id: "demo-mem-2", title: "Goa Trip 🌊", description: "Our first vacation together", memory_date: "2025-01-10", type: "photo", photo_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo" },
  { id: "demo-mem-3", title: "Anniversary Dinner 🎉", description: "Celebrating our love", memory_date: "2025-03-01", type: "milestone", photo_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: "demo", partner_pair: "demo" },
];
