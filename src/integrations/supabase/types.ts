export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      budget_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          entry_date: string
          id: string
          is_recurring: boolean
          partner_pair: string
          recurrence: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          is_recurring?: boolean
          partner_pair: string
          recurrence?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          is_recurring?: boolean
          partner_pair?: string
          recurrence?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          assigned_to: string
          category: string
          countdown_type: string | null
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          image_url: string | null
          is_completed: boolean
          partner_pair: string
          priority: string
          recurrence: string
          reminder: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string
          category?: string
          countdown_type?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean
          partner_pair: string
          priority?: string
          recurrence?: string
          reminder?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string
          category?: string
          countdown_type?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean
          partner_pair?: string
          priority?: string
          recurrence?: string
          reminder?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          partner_pair: string
          reply_to: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          partner_pair: string
          reply_to?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          partner_pair?: string
          reply_to?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chores: {
        Row: {
          assigned_to: string | null
          created_at: string
          due_date: string | null
          id: string
          image_url: string | null
          is_completed: boolean
          partner_pair: string
          recurrence: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean
          partner_pair: string
          recurrence?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean
          partner_pair?: string
          recurrence?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diet_logs: {
        Row: {
          assigned_to: string
          calories: number | null
          created_at: string
          description: string
          event_time: string | null
          id: string
          is_completed: boolean
          log_date: string
          meal_type: string
          notes: string | null
          partner_pair: string
          recurrence: string
          recurrence_day: number | null
          user_id: string
        }
        Insert: {
          assigned_to?: string
          calories?: number | null
          created_at?: string
          description: string
          event_time?: string | null
          id?: string
          is_completed?: boolean
          log_date?: string
          meal_type?: string
          notes?: string | null
          partner_pair: string
          recurrence?: string
          recurrence_day?: number | null
          user_id: string
        }
        Update: {
          assigned_to?: string
          calories?: number | null
          created_at?: string
          description?: string
          event_time?: string | null
          id?: string
          is_completed?: boolean
          log_date?: string
          meal_type?: string
          notes?: string | null
          partner_pair?: string
          recurrence?: string
          recurrence_day?: number | null
          user_id?: string
        }
        Relationships: []
      }
      grocery_items: {
        Row: {
          category: string | null
          created_at: string
          due_date: string | null
          id: string
          image_url: string | null
          is_checked: boolean
          is_flagged: boolean
          list_type: string
          name: string
          notes: string | null
          partner_pair: string
          priority: string
          sort_order: number
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          image_url?: string | null
          is_checked?: boolean
          is_flagged?: boolean
          list_type?: string
          name: string
          notes?: string | null
          partner_pair: string
          priority?: string
          sort_order?: number
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          image_url?: string | null
          is_checked?: boolean
          is_flagged?: boolean
          list_type?: string
          name?: string
          notes?: string | null
          partner_pair?: string
          priority?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      health_metrics: {
        Row: {
          calories_burned: number | null
          created_at: string
          heart_rate: number | null
          id: string
          metric_date: string
          notes: string | null
          partner_pair: string
          sleep_hours: number | null
          steps: number | null
          updated_at: string
          user_id: string
          water_glasses: number | null
          weight: number | null
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string
          heart_rate?: number | null
          id?: string
          metric_date?: string
          notes?: string | null
          partner_pair: string
          sleep_hours?: number | null
          steps?: number | null
          updated_at?: string
          user_id: string
          water_glasses?: number | null
          weight?: number | null
        }
        Update: {
          calories_burned?: number | null
          created_at?: string
          heart_rate?: number | null
          id?: string
          metric_date?: string
          notes?: string | null
          partner_pair?: string
          sleep_hours?: number | null
          steps?: number | null
          updated_at?: string
          user_id?: string
          water_glasses?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      location_shares: {
        Row: {
          accuracy: number | null
          expires_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          message: string | null
          partner_pair: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          expires_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          message?: string | null
          partner_pair: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          expires_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          message?: string | null
          partner_pair?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          memory_date: string
          partner_pair: string
          photo_url: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          memory_date?: string
          partner_pair: string
          photo_url?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          memory_date?: string
          partner_pair?: string
          photo_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memory_reactions: {
        Row: {
          comment: string | null
          created_at: string
          emoji: string | null
          id: string
          memory_id: string
          partner_pair: string
          type: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          memory_id: string
          partner_pair: string
          type?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          memory_id?: string
          partner_pair?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_reactions_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          partner_pair: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          partner_pair: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          partner_pair?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          mood: string
          note: string | null
          partner_pair: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          mood: string
          note?: string | null
          partner_pair: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          mood?: string
          note?: string | null
          partner_pair?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          partner_pair: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          partner_pair: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          partner_pair?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          expires_at: string
          id: string
          invite_code: string
          inviter_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_code: string
          inviter_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          inviter_id?: string
        }
        Relationships: []
      }
      period_logs: {
        Row: {
          created_at: string
          cycle_length: number | null
          id: string
          notes: string | null
          partner_pair: string
          period_duration: number | null
          period_end: string | null
          period_start: string
          symptoms: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_length?: number | null
          id?: string
          notes?: string | null
          partner_pair: string
          period_duration?: number | null
          period_end?: string | null
          period_start: string
          symptoms?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_length?: number | null
          id?: string
          notes?: string | null
          partner_pair?: string
          period_duration?: number | null
          period_end?: string | null
          period_start?: string
          symptoms?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          partner_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          partner_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          partner_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_plans: {
        Row: {
          assessment_answers: Json
          created_at: string
          current_phase: number
          id: string
          is_active: boolean
          partner_pair: string
          plan_data: Json
          plan_type: string
          started_at: string
          title: string
          user_id: string
        }
        Insert: {
          assessment_answers?: Json
          created_at?: string
          current_phase?: number
          id?: string
          is_active?: boolean
          partner_pair: string
          plan_data?: Json
          plan_type?: string
          started_at?: string
          title?: string
          user_id: string
        }
        Update: {
          assessment_answers?: Json
          created_at?: string
          current_phase?: number
          id?: string
          is_active?: boolean
          partner_pair?: string
          plan_data?: Json
          plan_type?: string
          started_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_progress: {
        Row: {
          completed: boolean
          created_at: string
          exercise_name: string
          id: string
          log_date: string
          notes: string | null
          pain_level: number | null
          partner_pair: string
          phase_index: number
          plan_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercise_name: string
          id?: string
          log_date?: string
          notes?: string | null
          pain_level?: number | null
          partner_pair: string
          phase_index?: number
          plan_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercise_name?: string
          id?: string
          log_date?: string
          notes?: string | null
          pain_level?: number | null
          partner_pair?: string
          phase_index?: number
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_progress_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "recovery_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_details: {
        Row: {
          anniversary_date: string | null
          created_at: string
          id: string
          love_language: string | null
          partner_love_language: string | null
          partner_pair: string
          relationship_goal: string | null
          relationship_status: string | null
          shared_interests: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anniversary_date?: string | null
          created_at?: string
          id?: string
          love_language?: string | null
          partner_love_language?: string | null
          partner_pair: string
          relationship_goal?: string | null
          relationship_status?: string | null
          shared_interests?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anniversary_date?: string | null
          created_at?: string
          id?: string
          love_language?: string | null
          partner_love_language?: string | null
          partner_pair?: string
          relationship_goal?: string | null
          relationship_status?: string | null
          shared_interests?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          partner_pair: string
          type: string
          user_id: string
          workout_date: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          partner_pair: string
          type: string
          user_id: string
          workout_date?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          partner_pair?: string
          type?: string
          user_id?: string
          workout_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_partner_invite: { Args: { code: string }; Returns: Json }
      get_my_partner_profile_id: { Args: never; Returns: string }
      get_partner_pair: { Args: { uid: string }; Returns: string }
      remove_partner: { Args: { partner_profile_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
