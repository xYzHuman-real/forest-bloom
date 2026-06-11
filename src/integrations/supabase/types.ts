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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          key: string
          unlocked_on: string
          user_id: string
        }
        Insert: {
          key: string
          unlocked_on?: string
          user_id: string
        }
        Update: {
          key?: string
          unlocked_on?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_chests: {
        Row: {
          created_at: string
          day: string
          id: string
          opened: boolean
          opened_at: string | null
          reward_kind: string | null
          reward_payload: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          opened?: boolean
          opened_at?: string | null
          reward_kind?: string | null
          reward_payload?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          opened?: boolean
          opened_at?: string | null
          reward_kind?: string | null
          reward_payload?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          coins_earned: number
          created_at: string
          day: string
          id: string
          species: string | null
          state: string
          tree_id: string | null
          updated_at: string
          usage_json: Json
          user_id: string
        }
        Insert: {
          coins_earned?: number
          created_at?: string
          day: string
          id?: string
          species?: string | null
          state?: string
          tree_id?: string | null
          updated_at?: string
          usage_json?: Json
          user_id: string
        }
        Update: {
          coins_earned?: number
          created_at?: string
          day?: string
          id?: string
          species?: string | null
          state?: string
          tree_id?: string | null
          updated_at?: string
          usage_json?: Json
          user_id?: string
        }
        Relationships: []
      }
      islands: {
        Row: {
          created_at: string
          id: string
          index: number
          level: number
          name: string
          unlocked_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          index: number
          level?: number
          name?: string
          unlocked_on?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          index?: number
          level?: number
          name?: string
          unlocked_on?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_seed: string
          coins: number
          created_at: string
          current_streak: number
          display_name: string | null
          forest_level: number
          forest_started_on: string
          id: string
          longest_streak: number
          onboarded: boolean
          total_dead: number
          total_healthy: number
          updated_at: string
        }
        Insert: {
          avatar_seed?: string
          coins?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          forest_level?: number
          forest_started_on?: string
          id: string
          longest_streak?: number
          onboarded?: boolean
          total_dead?: number
          total_healthy?: number
          updated_at?: string
        }
        Update: {
          avatar_seed?: string
          coins?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          forest_level?: number
          forest_started_on?: string
          id?: string
          longest_streak?: number
          onboarded?: boolean
          total_dead?: number
          total_healthy?: number
          updated_at?: string
        }
        Relationships: []
      }
      revival_missions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          last_progress_day: string | null
          started_on: string
          successful_days: number
          tree_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_progress_day?: string | null
          started_on?: string
          successful_days?: number
          tree_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_progress_day?: string | null
          started_on?: string
          successful_days?: number
          tree_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tracked_apps: {
        Row: {
          app_key: string
          daily_limit_min: number
          enabled: boolean
          user_id: string
        }
        Insert: {
          app_key: string
          daily_limit_min?: number
          enabled?: boolean
          user_id: string
        }
        Update: {
          app_key?: string
          daily_limit_min?: number
          enabled?: boolean
          user_id?: string
        }
        Relationships: []
      }
      trees: {
        Row: {
          created_at: string
          died_on: string | null
          growth_pct: number
          id: string
          island_index: number
          planted_on: string
          position_x: number
          position_z: number
          revived_at: string | null
          species: string
          state: Database["public"]["Enums"]["tree_state"]
          user_id: string
        }
        Insert: {
          created_at?: string
          died_on?: string | null
          growth_pct?: number
          id?: string
          island_index?: number
          planted_on?: string
          position_x?: number
          position_z?: number
          revived_at?: string | null
          species?: string
          state?: Database["public"]["Enums"]["tree_state"]
          user_id: string
        }
        Update: {
          created_at?: string
          died_on?: string | null
          growth_pct?: number
          id?: string
          island_index?: number
          planted_on?: string
          position_x?: number
          position_z?: number
          revived_at?: string | null
          species?: string
          state?: Database["public"]["Enums"]["tree_state"]
          user_id?: string
        }
        Relationships: []
      }
      unlocked_species: {
        Row: {
          species: string
          unlocked_on: string
          user_id: string
        }
        Insert: {
          species: string
          unlocked_on?: string
          user_id: string
        }
        Update: {
          species?: string
          unlocked_on?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          app_key: string
          day: string
          minutes_used: number
          user_id: string
        }
        Insert: {
          app_key: string
          day: string
          minutes_used?: number
          user_id: string
        }
        Update: {
          app_key?: string
          day?: string
          minutes_used?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tree_state: "healthy" | "weak" | "dying" | "dead" | "reviving"
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
    Enums: {
      tree_state: ["healthy", "weak", "dying", "dead", "reviving"],
    },
  },
} as const
