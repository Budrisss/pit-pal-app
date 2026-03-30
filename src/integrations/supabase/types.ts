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
      event_announcements: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message: string
          organizer_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message: string
          organizer_id: string
        }
        Update: {
          created_at?: string
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
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_announcements_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notes: string | null
          registration_type_id: string
          user_email: string
          user_id: string
          user_name: string
          user_phone: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          registration_type_id: string
          user_email: string
          user_id: string
          user_name: string
          user_phone?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          registration_type_id?: string
          user_email?: string
          user_id?: string
          user_name?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_registration_type_id_fkey"
            columns: ["registration_type_id"]
            isOneToOne: false
            referencedRelation: "registration_types"
            referencedColumns: ["id"]
          },
        ]
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
          public_event_id: string | null
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
          public_event_id?: string | null
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
          public_event_id?: string | null
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
      organizer_profiles: {
        Row: {
          approved: boolean
          contact_email: string
          created_at: string
          description: string | null
          id: string
          org_name: string
          phone: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          approved?: boolean
          contact_email: string
          created_at?: string
          description?: string | null
          id?: string
          org_name: string
          phone?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          approved?: boolean
          contact_email?: string
          created_at?: string
          description?: string | null
          id?: string
          org_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      organizer_settings: {
        Row: {
          created_at: string
          default_reg_types: string
          default_session_duration: number
          default_sessions: Json
          id: string
          notif_announcement_confirm: boolean
          notif_cancel_registration: boolean
          notif_new_registration: boolean
          notif_session_reminder: boolean
          organizer_profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_reg_types?: string
          default_session_duration?: number
          default_sessions?: Json
          id?: string
          notif_announcement_confirm?: boolean
          notif_cancel_registration?: boolean
          notif_new_registration?: boolean
          notif_session_reminder?: boolean
          organizer_profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_reg_types?: string
          default_session_duration?: number
          default_sessions?: Json
          id?: string
          notif_announcement_confirm?: boolean
          notif_cancel_registration?: boolean
          notif_new_registration?: boolean
          notif_session_reminder?: boolean
          organizer_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_settings_organizer_profile_id_fkey"
            columns: ["organizer_profile_id"]
            isOneToOne: true
            referencedRelation: "organizer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_event_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          event_id: string
          id: string
          name: string
          registration_type_id: string | null
          sort_order: number
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          event_id: string
          id?: string
          name: string
          registration_type_id?: string | null
          sort_order?: number
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          event_id?: string
          id?: string
          name?: string
          registration_type_id?: string | null
          sort_order?: number
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_event_sessions_registration_type_id_fkey"
            columns: ["registration_type_id"]
            isOneToOne: false
            referencedRelation: "registration_types"
            referencedColumns: ["id"]
          },
        ]
      }
      public_events: {
        Row: {
          address: string | null
          car_classes: string | null
          city: string | null
          created_at: string
          date: string
          description: string | null
          entry_fee: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          organizer_id: string
          registration_link: string | null
          state: string | null
          status: string
          time: string | null
          track_name: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          car_classes?: string | null
          city?: string | null
          created_at?: string
          date: string
          description?: string | null
          entry_fee?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          organizer_id: string
          registration_link?: string | null
          state?: string | null
          status?: string
          time?: string | null
          track_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          car_classes?: string | null
          city?: string | null
          created_at?: string
          date?: string
          description?: string | null
          entry_fee?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          organizer_id?: string
          registration_link?: string | null
          state?: string | null
          status?: string
          time?: string | null
          track_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          max_spots: number | null
          name: string
          price: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          max_spots?: number | null
          name: string
          price?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          max_spots?: number | null
          name?: string
          price?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
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
      user_locations: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          updated_at?: string
          user_id?: string
          zip_code?: string
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
      events_within_radius: {
        Args: { radius_miles?: number; user_lat: number; user_lng: number }
        Returns: {
          address: string | null
          car_classes: string | null
          city: string | null
          created_at: string
          date: string
          description: string | null
          entry_fee: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          organizer_id: string
          registration_link: string | null
          state: string | null
          status: string
          time: string | null
          track_name: string | null
          updated_at: string
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "public_events"
          isOneToOne: false
          isSetofReturn: true
        }
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
