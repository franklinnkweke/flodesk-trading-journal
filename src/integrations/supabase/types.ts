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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_reports: {
        Row: {
          content: string
          created_at: string
          id: string
          period_end: string | null
          period_start: string | null
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position?: number
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          strategy_rules: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          strategy_rules?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          strategy_rules?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_plans: {
        Row: {
          biases: Json
          created_at: string
          id: string
          key_levels: string | null
          mindset: number | null
          notes: string | null
          plan_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          biases?: Json
          created_at?: string
          id?: string
          key_levels?: string | null
          mindset?: number | null
          notes?: string | null
          plan_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          biases?: Json
          created_at?: string
          id?: string
          key_levels?: string | null
          mindset?: number | null
          notes?: string | null
          plan_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotion_logs: {
        Row: {
          created_at: string
          emotion: string
          id: string
          intensity: number
          phase: string
          trade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emotion: string
          id?: string
          intensity?: number
          phase: string
          trade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emotion?: string
          id?: string
          intensity?: number
          phase?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotion_logs_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrail_rules: {
        Row: {
          allowed_hours_end: string | null
          allowed_hours_start: string | null
          allowed_sessions: string[]
          allowed_symbols: string[]
          created_at: string
          id: string
          max_consecutive_losses: number
          max_daily_loss_pct: number
          max_risk_pct: number
          max_trades_per_day: number
          max_weekly_loss_pct: number
          news_window_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_hours_end?: string | null
          allowed_hours_start?: string | null
          allowed_sessions?: string[]
          allowed_symbols?: string[]
          created_at?: string
          id?: string
          max_consecutive_losses?: number
          max_daily_loss_pct?: number
          max_risk_pct?: number
          max_trades_per_day?: number
          max_weekly_loss_pct?: number
          news_window_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_hours_end?: string | null
          allowed_hours_start?: string | null
          allowed_sessions?: string[]
          allowed_symbols?: string[]
          created_at?: string
          id?: string
          max_consecutive_losses?: number
          max_daily_loss_pct?: number
          max_risk_pct?: number
          max_trades_per_day?: number
          max_weekly_loss_pct?: number
          news_window_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      news_events: {
        Row: {
          created_at: string
          currency: string | null
          event_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          event_at: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          event_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          base_currency: string
          created_at: string
          display_name: string | null
          id: string
          session_times: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id: string
          session_times?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id?: string
          session_times?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      rule_breaks: {
        Row: {
          created_at: string
          id: string
          reason: string
          rule: string
          source: string
          trade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          rule: string
          source?: string
          trade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          rule?: string
          source?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_breaks_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      setups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      symbol_settings: {
        Row: {
          category: string
          contract_size: number
          created_at: string
          id: string
          pip_size: number
          pip_value_per_lot: number
          quote_currency: string
          symbol: string
          user_id: string
        }
        Insert: {
          category?: string
          contract_size: number
          created_at?: string
          id?: string
          pip_size: number
          pip_value_per_lot: number
          quote_currency?: string
          symbol: string
          user_id: string
        }
        Update: {
          category?: string
          contract_size?: number
          created_at?: string
          id?: string
          pip_size?: number
          pip_value_per_lot?: number
          quote_currency?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_checklist_results: {
        Row: {
          checked: boolean
          created_at: string
          id: string
          item_id: string | null
          label: string
          trade_id: string
          user_id: string
        }
        Insert: {
          checked?: boolean
          created_at?: string
          id?: string
          item_id?: string | null
          label: string
          trade_id: string
          user_id: string
        }
        Update: {
          checked?: boolean
          created_at?: string
          id?: string
          item_id?: string | null
          label?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_checklist_results_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_checklist_results_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_screenshots: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          kind: string
          storage_path: string
          trade_id: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          storage_path: string
          trade_id: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          storage_path?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_screenshots_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string
          closed_at: string | null
          commission: number
          created_at: string
          direction: string
          entry_price: number | null
          exit_price: number | null
          external_deal_id: string | null
          id: string
          is_demo: boolean
          lessons: string | null
          lots: number
          notes: string | null
          opened_at: string
          pips: number | null
          pnl: number
          r_multiple: number | null
          risk_amount: number | null
          session: string | null
          setup_id: string | null
          source: string
          status: string
          stop_loss: number | null
          swap: number
          symbol: string
          take_profit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          closed_at?: string | null
          commission?: number
          created_at?: string
          direction?: string
          entry_price?: number | null
          exit_price?: number | null
          external_deal_id?: string | null
          id?: string
          is_demo?: boolean
          lessons?: string | null
          lots?: number
          notes?: string | null
          opened_at?: string
          pips?: number | null
          pnl?: number
          r_multiple?: number | null
          risk_amount?: number | null
          session?: string | null
          setup_id?: string | null
          source?: string
          status?: string
          stop_loss?: number | null
          swap?: number
          symbol: string
          take_profit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          closed_at?: string | null
          commission?: number
          created_at?: string
          direction?: string
          entry_price?: number | null
          exit_price?: number | null
          external_deal_id?: string | null
          id?: string
          is_demo?: boolean
          lessons?: string | null
          lots?: number
          notes?: string | null
          opened_at?: string
          pips?: number | null
          pnl?: number
          r_multiple?: number | null
          risk_amount?: number | null
          session?: string | null
          setup_id?: string | null
          source?: string
          status?: string
          stop_loss?: number | null
          swap?: number
          symbol?: string
          take_profit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          balance: number
          broker: string | null
          created_at: string
          currency: string
          equity: number
          id: string
          is_demo: boolean
          last_synced_at: string | null
          metaapi_account_id: string | null
          metaapi_region: string | null
          mode: string
          mt_login: string | null
          mt_server: string | null
          name: string
          platform: string
          starting_balance: number
          sync_error: string | null
          sync_status: string
          user_id: string
        }
        Insert: {
          balance?: number
          broker?: string | null
          created_at?: string
          currency?: string
          equity?: number
          id?: string
          is_demo?: boolean
          last_synced_at?: string | null
          metaapi_account_id?: string | null
          metaapi_region?: string | null
          mode?: string
          mt_login?: string | null
          mt_server?: string | null
          name: string
          platform?: string
          starting_balance?: number
          sync_error?: string | null
          sync_status?: string
          user_id: string
        }
        Update: {
          balance?: number
          broker?: string | null
          created_at?: string
          currency?: string
          equity?: number
          id?: string
          is_demo?: boolean
          last_synced_at?: string | null
          metaapi_account_id?: string | null
          metaapi_region?: string | null
          mode?: string
          mt_login?: string | null
          mt_server?: string | null
          name?: string
          platform?: string
          starting_balance?: number
          sync_error?: string | null
          sync_status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_demo_data: { Args: never; Returns: undefined }
      load_demo_data: { Args: never; Returns: undefined }
      seed_demo_data: { Args: { _uid: string }; Returns: undefined }
      seed_user_defaults: { Args: { _uid: string }; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
