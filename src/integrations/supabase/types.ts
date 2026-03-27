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
      cars: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          drivetrain: string | null
          engine: string | null
          id: string
          image: string | null
          make: string | null
          model: string | null
          name: string
          notes: string | null
          power: string | null
          updated_at: string
          user_id: string
          weight: string | null
          year: number | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          drivetrain?: string | null
          engine?: string | null
          id?: string
          image?: string | null
          make?: string | null
          model?: string | null
          name: string
          notes?: string | null
          power?: string | null
          updated_at?: string
          user_id: string
          weight?: string | null
          year?: number | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          drivetrain?: string | null
          engine?: string | null
          id?: string
          image?: string | null
          make?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          power?: string | null
          updated_at?: string
          user_id?: string
          weight?: string | null
          year?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          address: string | null
          car_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          name: string
          status: string | null
          time: string | null
          track_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          car_id?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          name: string
          status?: string | null
          time?: string | null
          track_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          car_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          time?: string | null
          track_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          duration: number | null
          event_id: string
          id: string
          name: string
          notes: string | null
          start_time: string | null
          state: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          event_id: string
          id?: string
          name: string
          notes?: string | null
          start_time?: string | null
          state?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          start_time?: string | null
          state?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_data: {
        Row: {
          car_id: string | null
          created_at: string
          cross_percentage: number | null
          event_id: string | null
          fastest_lap_time: string | null
          fl_cold_pressure: number | null
          fl_hot_pressure: number | null
          fl_temp_center: number | null
          fl_temp_inside: number | null
          fl_temp_outside: number | null
          fr_cold_pressure: number | null
          fr_hot_pressure: number | null
          fr_temp_center: number | null
          fr_temp_inside: number | null
          fr_temp_outside: number | null
          front_percentage: number | null
          id: string
          left_percentage: number | null
          lf_camber: number | null
          lf_ride_height: number | null
          lf_shock: number | null
          lf_spring: number | null
          lr_camber: number | null
          lr_ride_height: number | null
          lr_shock: number | null
          lr_spring: number | null
          notes_times: string | null
          rear_percentage: number | null
          rf_camber: number | null
          rf_ride_height: number | null
          rf_shock: number | null
          rf_spring: number | null
          right_percentage: number | null
          rl_cold_pressure: number | null
          rl_hot_pressure: number | null
          rl_temp_center: number | null
          rl_temp_inside: number | null
          rl_temp_outside: number | null
          rr_camber: number | null
          rr_cold_pressure: number | null
          rr_hot_pressure: number | null
          rr_ride_height: number | null
          rr_shock: number | null
          rr_spring: number | null
          rr_temp_center: number | null
          rr_temp_inside: number | null
          rr_temp_outside: number | null
          session_id: string | null
          session_name: string | null
          setup_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          car_id?: string | null
          created_at?: string
          cross_percentage?: number | null
          event_id?: string | null
          fastest_lap_time?: string | null
          fl_cold_pressure?: number | null
          fl_hot_pressure?: number | null
          fl_temp_center?: number | null
          fl_temp_inside?: number | null
          fl_temp_outside?: number | null
          fr_cold_pressure?: number | null
          fr_hot_pressure?: number | null
          fr_temp_center?: number | null
          fr_temp_inside?: number | null
          fr_temp_outside?: number | null
          front_percentage?: number | null
          id?: string
          left_percentage?: number | null
          lf_camber?: number | null
          lf_ride_height?: number | null
          lf_shock?: number | null
          lf_spring?: number | null
          lr_camber?: number | null
          lr_ride_height?: number | null
          lr_shock?: number | null
          lr_spring?: number | null
          notes_times?: string | null
          rear_percentage?: number | null
          rf_camber?: number | null
          rf_ride_height?: number | null
          rf_shock?: number | null
          rf_spring?: number | null
          right_percentage?: number | null
          rl_cold_pressure?: number | null
          rl_hot_pressure?: number | null
          rl_temp_center?: number | null
          rl_temp_inside?: number | null
          rl_temp_outside?: number | null
          rr_camber?: number | null
          rr_cold_pressure?: number | null
          rr_hot_pressure?: number | null
          rr_ride_height?: number | null
          rr_shock?: number | null
          rr_spring?: number | null
          rr_temp_center?: number | null
          rr_temp_inside?: number | null
          rr_temp_outside?: number | null
          session_id?: string | null
          session_name?: string | null
          setup_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          car_id?: string | null
          created_at?: string
          cross_percentage?: number | null
          event_id?: string | null
          fastest_lap_time?: string | null
          fl_cold_pressure?: number | null
          fl_hot_pressure?: number | null
          fl_temp_center?: number | null
          fl_temp_inside?: number | null
          fl_temp_outside?: number | null
          fr_cold_pressure?: number | null
          fr_hot_pressure?: number | null
          fr_temp_center?: number | null
          fr_temp_inside?: number | null
          fr_temp_outside?: number | null
          front_percentage?: number | null
          id?: string
          left_percentage?: number | null
          lf_camber?: number | null
          lf_ride_height?: number | null
          lf_shock?: number | null
          lf_spring?: number | null
          lr_camber?: number | null
          lr_ride_height?: number | null
          lr_shock?: number | null
          lr_spring?: number | null
          notes_times?: string | null
          rear_percentage?: number | null
          rf_camber?: number | null
          rf_ride_height?: number | null
          rf_shock?: number | null
          rf_spring?: number | null
          right_percentage?: number | null
          rl_cold_pressure?: number | null
          rl_hot_pressure?: number | null
          rl_temp_center?: number | null
          rl_temp_inside?: number | null
          rl_temp_outside?: number | null
          rr_camber?: number | null
          rr_cold_pressure?: number | null
          rr_hot_pressure?: number | null
          rr_ride_height?: number | null
          rr_shock?: number | null
          rr_spring?: number | null
          rr_temp_center?: number | null
          rr_temp_inside?: number | null
          rr_temp_outside?: number | null
          session_id?: string | null
          session_name?: string | null
          setup_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_data_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_data_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
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
