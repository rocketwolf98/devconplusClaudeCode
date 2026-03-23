// AUTO-GENERATED — do not edit manually.
// Regenerate with: mcp__supabase__generate_typescript_types
// Last generated: 2026-03-16 (adds event_announcements table)

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
      chapters: {
        Row: {
          created_at: string | null
          id: string
          name: string
          region: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          region?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      event_announcements: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          message: string
          organizer_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          message: string
          organizer_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          message?: string
          organizer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_announcements_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          approved_at: string | null
          checked_in: boolean | null
          event_id: string | null
          id: string
          qr_code_token: string | null
          registered_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          checked_in?: boolean | null
          event_id?: string | null
          id?: string
          qr_code_token?: string | null
          registered_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          checked_in?: boolean | null
          event_id?: string | null
          id?: string
          qr_code_token?: string | null
          registered_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          category: string | null
          chapter_id: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_date: string | null
          id: string
          is_featured: boolean | null
          is_free: boolean | null
          is_promoted: boolean | null
          location: string | null
          points_value: number | null
          volunteer_points: number | null
          privacy_status: string | null
          requires_approval: boolean | null
          status: string | null
          tags: string[] | null
          ticket_price: number | null
          ticket_price_php: number | null
          title: string
          visibility: string | null
        }
        Insert: {
          capacity?: number | null
          category?: string | null
          chapter_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          is_promoted?: boolean | null
          location?: string | null
          points_value?: number | null
          volunteer_points?: number | null
          privacy_status?: string | null
          requires_approval?: boolean | null
          status?: string | null
          tags?: string[] | null
          ticket_price?: number | null
          ticket_price_php?: number | null
          title: string
          visibility?: string | null
        }
        Update: {
          capacity?: number | null
          category?: string | null
          chapter_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          is_promoted?: boolean | null
          location?: string | null
          points_value?: number | null
          volunteer_points?: number | null
          privacy_status?: string | null
          requires_approval?: boolean | null
          status?: string | null
          tags?: string[] | null
          ticket_price?: number | null
          ticket_price_php?: number | null
          title?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_url: string | null
          company: string
          description: string | null
          id: string
          is_active: boolean | null
          is_promoted: boolean | null
          location: string | null
          posted_at: string | null
          title: string
          work_type: string | null
        }
        Insert: {
          apply_url?: string | null
          company: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_promoted?: boolean | null
          location?: string | null
          posted_at?: string | null
          title: string
          work_type?: string | null
        }
        Update: {
          apply_url?: string | null
          company?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_promoted?: boolean | null
          location?: string | null
          posted_at?: string | null
          title?: string
          work_type?: string | null
        }
        Relationships: []
      }
      news_posts: {
        Row: {
          author_id: string | null
          body: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          id: string
          is_featured: boolean | null
          is_promoted: boolean | null
          title: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_promoted?: boolean | null
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_promoted?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_codes: {
        Row: {
          assigned_role: string | null
          chapter_id: string | null
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          program_id: string | null
          scope_type: string | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          assigned_role?: string | null
          chapter_id?: string | null
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          program_id?: string | null
          scope_type?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          assigned_role?: string | null
          chapter_id?: string | null
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          program_id?: string | null
          scope_type?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organizer_codes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_codes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_upgrade_requests: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          id: string
          organizer_code: string
          requested_role: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          organizer_code: string
          requested_role?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          organizer_code?: string
          requested_role?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizer_upgrade_requests_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_upgrade_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_upgrade_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          source: string | null
          transaction_ref: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          id?: string
          source?: string | null
          transaction_ref?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          source?: string | null
          transaction_ref?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          chapter_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          lifetime_points: number | null
          pending_chapter_id: string | null
          pending_role: string | null
          referral_code: string | null
          role: string | null
          school_or_company: string | null
          spendable_points: number | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          chapter_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          lifetime_points?: number | null
          pending_chapter_id?: string | null
          pending_role?: string | null
          referral_code?: string | null
          role?: string | null
          school_or_company?: string | null
          spendable_points?: number | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          chapter_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          lifetime_points?: number | null
          pending_chapter_id?: string | null
          pending_role?: string | null
          referral_code?: string | null
          role?: string | null
          school_or_company?: string | null
          spendable_points?: number | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_pending_chapter_id_fkey"
            columns: ["pending_chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          theme_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          theme_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          theme_id?: string | null
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          claimed_at: string | null
          id: string
          redeemed_at: string | null
          reward_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          redeemed_at?: string | null
          reward_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          id?: string
          redeemed_at?: string | null
          reward_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          claim_method: string | null
          created_at: string | null
          description: string | null
          financial_cost_php: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_coming_soon: boolean | null
          max_per_user: number | null
          name: string
          points_cost: number
          stock_remaining: number | null
          type: string | null
        }
        Insert: {
          claim_method?: string | null
          created_at?: string | null
          description?: string | null
          financial_cost_php?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_coming_soon?: boolean | null
          max_per_user?: number | null
          name: string
          points_cost: number
          stock_remaining?: number | null
          type?: string | null
        }
        Update: {
          claim_method?: string | null
          created_at?: string | null
          description?: string | null
          financial_cost_php?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_coming_soon?: boolean | null
          max_per_user?: number | null
          name?: string
          points_cost?: number
          stock_remaining?: number | null
          type?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_applications: {
        Row: {
          applied_at: string
          event_id: string
          id: string
          phone_number: string | null
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          social_media_handle: string | null
          status: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          event_id: string
          id?: string
          phone_number?: string | null
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_media_handle?: string | null
          status?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          event_id?: string
          id?: string
          phone_number?: string | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_media_handle?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_tiers: {
        Row: {
          badge_color: string | null
          created_at: string | null
          id: string
          label: string
          max_points: number | null
          min_points: number
          name: string
        }
        Insert: {
          badge_color?: string | null
          created_at?: string | null
          id?: string
          label: string
          max_points?: number | null
          min_points: number
          name: string
        }
        Update: {
          badge_color?: string | null
          created_at?: string | null
          id?: string
          label?: string
          max_points?: number | null
          min_points?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_organizer_upgrade: {
        Args: {
          p_chapter_id: string
          p_request_id: string
          p_reviewer_id: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      delete_own_account: { Args: never; Returns: undefined }
      get_active_chapters_count: { Args: never; Returns: number }
      get_attendance_trend: {
        Args: never
        Returns: {
          attendance: number
          event: string
        }[]
      }
      get_member_growth: {
        Args: never
        Returns: {
          count: number
          month: string
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_total_xp_distributed: { Args: never; Returns: number }
      get_xp_by_chapter: {
        Args: never
        Returns: {
          chapter: string
          xp: number
        }[]
      }
      increment_member_points: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      manual_checkin: {
        Args: { p_organizer_id: string; p_registration_id: string }
        Returns: Json
      }
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
