

## Make AI Coach Plans Interactive + Add Images & Recipes

### Problem
1. Users can't **negotiate/modify** plans created by the AI Coach — once created, they're fixed
2. No **images** for exercises or diet items for visual learning
3. No **recipes** in diet plans — just food names

### What We'll Build

**1. "Modify Plan" conversation flow in AI Coach**
- Add a new `modify_plan` tool to the `ai-coach` edge function that updates an existing plan in the database
- After a plan is created, the AI Coach card stays conversational — user can say "remove squats", "I don't eat dairy", "make it easier" and the AI modifies the saved plan
- The edge function fetches the current plan from DB, applies changes, and saves back

**2. AI-generated images for exercises**
- Enhance the `create_plan` tool schema to include `image_prompt` per exercise
- After plan creation, auto-generate exercise illustration prompts (already supported by `generate-exercise-image` edge function + `RecoveryPlanCard` has image support)
- Make images generate automatically when expanding an exercise card (instead of requiring a button tap)

**3. Recipes in diet plans**
- Expand the `create_plan` tool schema for diet plans to include `recipe` per meal item (ingredients list + brief instructions)
- Update the diet plan display to show expandable recipe cards with ingredients and steps
- AI Coach prompt updated to always include simple recipes when creating diet plans

### File Changes

| File | Change |
|------|--------|
| `supabase/functions/ai-coach/index.ts` | Add `modify_plan` tool; expand `create_plan` schema with `image_prompt` per exercise and `recipe` per diet item; update system prompt to include recipes and modification instructions |
| `src/components/AICoachCard.tsx` | Pass `activePlans` with IDs so modify_plan can reference them; show "Plan updated!" feedback when modify action returns |
| `src/components/RecoveryPlanCard.tsx` | Auto-trigger image generation on expand (instead of manual button); add recipe display section |
| `src/components/DietPlanCard.tsx` | New component — displays a diet meal item with expandable recipe (ingredients + steps) |
| `src/pages/HomePage.tsx` | Pass plan IDs to AICoachCard so it can send them for modification |
| `src/pages/DietPage.tsx` | Use new `DietPlanCard` component to render meals with recipes |

### AI Coach Edge Function Changes

New `modify_plan` tool:
```
modify_plan({
  plan_id: string,        // UUID of recovery_plans or diet_plans row
  plan_type: "physio" | "diet" | "workout",
  modifications: string,  // Natural language description of changes
  updated_phases: [...]   // Full updated phases array
})
```

Updated `create_plan` exercise schema adds:
- `image_prompt`: string — description for AI image generation
- `recipe`: { ingredients: string[], instructions: string } — for diet items

System prompt additions:
- "When creating diet plans, ALWAYS include a recipe object with ingredients and brief instructions for each meal"
- "When user asks to change a plan, use modify_plan tool with the updated phases"
- "Include image_prompt for each exercise describing the movement for illustration"

### Example Interaction
1. User: "I have knee pain" → AI asks questions → creates physio plan with image prompts
2. User: "I can't do lunges" → AI uses `modify_plan` to replace lunges with alternatives
3. User: "Create a diet plan" → AI creates plan with recipes for each meal
4. User: "I don't eat eggs" → AI modifies diet plan, swaps egg dishes with alternatives

