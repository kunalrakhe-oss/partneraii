// Local storage helpers for MVP state management
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

// Types
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  category: "date-night" | "groceries" | "cleaning" | "bills" | "travel" | "family";
  date: string;
  time: string;
  assignedTo: "partner1" | "partner2" | "both";
  priority: "low" | "medium" | "high";
  repeat: "once" | "daily" | "weekly" | "monthly";
  completed: boolean;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
}

export interface MoodLog {
  id: string;
  mood: "happy" | "neutral" | "sad" | "angry" | "tired";
  note: string;
  date: string;
  user: "me" | "partner";
}

export interface Chore {
  id: string;
  name: string;
  instructions: string[];
  frequency: "daily" | "weekly" | "monthly" | "once";
  assignedTo: "partner1" | "partner2" | "rotating";
  completed: boolean;
  lastCompleted?: string;
}

export interface ChatMessage {
  id: string;
  sender: "me" | "partner";
  message: string;
  timestamp: string;
  type: "text" | "task_share";
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  date: string;
  photo?: string; // base64 data URL for MVP
  type: "photo" | "milestone" | "note";
  milestone?: string;
}

export const MOOD_EMOJIS = {
  happy: "😊",
  neutral: "😐",
  sad: "😔",
  angry: "😡",
  tired: "😴",
} as const;

export const GROCERY_CATEGORIES: Record<string, string> = {
  dairy: "🥛 Dairy",
  fruits: "🍎 Fruits",
  vegetables: "🌽 Vegetables",
  meat: "🍗 Meat",
  household: "🧼 Household",
  snacks: "🍭 Snacks",
  beverages: "🥤 Beverages",
  bakery: "🍞 Bakery",
  other: "📦 Other",
};

export const CATEGORY_COLORS: Record<string, string> = {
  "date-night": "hsl(346, 77%, 60%)",
  groceries: "hsl(152, 60%, 45%)",
  cleaning: "hsl(210, 60%, 55%)",
  bills: "hsl(38, 92%, 55%)",
  travel: "hsl(270, 60%, 55%)",
  family: "hsl(24, 80%, 58%)",
};

// AI categorization helper (simple keyword-based for MVP)
export function categorizeGroceryItem(name: string): string {
  const lower = name.toLowerCase();
  const map: Record<string, string[]> = {
    dairy: ["milk", "egg", "butter", "yogurt", "cheese", "cream"],
    fruits: ["apple", "banana", "orange", "grape", "berry", "mango", "lemon", "lime", "avocado", "strawberry"],
    vegetables: ["tomato", "spinach", "carrot", "onion", "potato", "lettuce", "broccoli", "pepper", "garlic", "cucumber"],
    meat: ["chicken", "beef", "fish", "pork", "salmon", "turkey", "shrimp", "steak", "bacon", "sausage"],
    household: ["soap", "detergent", "towel", "tissue", "sponge", "trash bag", "bleach", "cleaner"],
    snacks: ["chip", "granola", "cracker", "cookie", "candy", "chocolate", "popcorn", "nut"],
    beverages: ["water", "juice", "soda", "coffee", "tea", "wine", "beer"],
    bakery: ["bread", "bagel", "muffin", "cake", "pastry", "croissant", "tortilla"],
  };
  for (const [cat, keywords] of Object.entries(map)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return "other";
}

export function categorizeListItem(name: string, listType: string): string {
  const lower = name.toLowerCase();

  if (listType === "todo") {
    const map: Record<string, string[]> = {
      work: ["meeting", "report", "email", "call", "project", "deadline", "present", "office", "client", "invoice", "task"],
      home: ["clean", "laundry", "dishes", "vacuum", "mop", "organize", "declutter", "fix", "repair", "paint", "furniture"],
      errands: ["pick up", "drop off", "return", "mail", "post", "bank", "pharmacy", "doctor", "appointment", "renew", "pay"],
      health: ["gym", "workout", "exercise", "yoga", "run", "walk", "meditate", "vitamins", "checkup", "dentist"],
      personal: ["read", "learn", "study", "practice", "hobby", "journal", "plan", "goal", "budget"],
    };
    for (const [cat, keywords] of Object.entries(map)) {
      if (keywords.some(k => lower.includes(k))) return cat;
    }
    return "general";
  }

  if (listType === "gift") {
    const map: Record<string, string[]> = {
      tech: ["phone", "laptop", "tablet", "headphone", "speaker", "watch", "gadget", "airpod", "charger", "kindle"],
      fashion: ["shirt", "dress", "shoe", "bag", "wallet", "jewelry", "necklace", "ring", "perfume", "scarf", "hat", "sunglasses"],
      experience: ["ticket", "concert", "spa", "dinner", "trip", "class", "lesson", "membership", "subscription", "course"],
      home_decor: ["candle", "frame", "plant", "blanket", "pillow", "mug", "vase", "lamp", "art", "print"],
      books_media: ["book", "novel", "album", "game", "puzzle", "vinyl", "movie", "journal", "planner"],
    };
    for (const [cat, keywords] of Object.entries(map)) {
      if (keywords.some(k => lower.includes(k))) return cat;
    }
    return "other_gifts";
  }

  if (listType === "travel") {
    const map: Record<string, string[]> = {
      clothing: ["shirt", "pants", "dress", "jacket", "shoe", "sock", "underwear", "swimsuit", "hat", "scarf", "pajama"],
      toiletries: ["toothbrush", "toothpaste", "shampoo", "soap", "deodorant", "sunscreen", "moisturizer", "razor", "makeup"],
      electronics: ["charger", "phone", "camera", "headphone", "adapter", "laptop", "tablet", "power bank", "earbuds"],
      documents: ["passport", "ticket", "visa", "insurance", "id", "itinerary", "reservation", "boarding pass", "license"],
      essentials: ["medicine", "snack", "water bottle", "pillow", "blanket", "umbrella", "bag", "backpack", "luggage", "wallet"],
    };
    for (const [cat, keywords] of Object.entries(map)) {
      if (keywords.some(k => lower.includes(k))) return cat;
    }
    return "misc";
  }

  if (listType === "date") {
    const map: Record<string, string[]> = {
      outdoor: ["hike", "picnic", "beach", "park", "walk", "bike", "kayak", "camp", "garden", "sunset", "stargazing"],
      food_drink: ["dinner", "restaurant", "brunch", "coffee", "cook", "bake", "wine", "cocktail", "ice cream", "food truck", "sushi"],
      entertainment: ["movie", "concert", "theater", "museum", "gallery", "comedy", "show", "game", "arcade", "bowling", "karaoke"],
      adventure: ["travel", "road trip", "escape room", "skydive", "climb", "dance", "class", "lesson", "spa", "massage"],
      cozy: ["netflix", "puzzle", "board game", "read", "cook together", "paint", "craft", "journal", "cuddle", "blanket fort"],
    };
    for (const [cat, keywords] of Object.entries(map)) {
      if (keywords.some(k => lower.includes(k))) return cat;
    }
    return "other_ideas";
  }

  return "other";
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}
