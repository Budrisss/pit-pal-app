export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      cars: {
        Row: {
          color: string | null
          created_at: string
          id: string
          make: string | null
          model: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          notes: string | null
          track_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          notes?: string | null
          track_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          notes?: string | null
          track_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          fastest_lap_time: string | null
          id: string
          name: string
          notes: string | null
          start_time: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          event_id: string
          fastest_lap_time?: string | null
          id?: string
          name: string
          notes?: string | null
          start_time?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          event_id?: string
          fastest_lap_time?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_time?: string | null
          type?: string
          updated_at?: string
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
          air_density: number | null
          air_temp: number | null
          car: string | null
          car_id: string | null
          created_at: string
          cross_percentage: number | null
          date: string | null
          diameter: string | null
          driver: string | null
          event_id: string | null
          f_spoiler_height: string | null
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
          front_stagger_cold: string | null
          front_stagger_hot: string | null
          fuel_gal_used: string | null
          fuel_laps: string | null
          fuel_lpg: string | null
          fuel_mpg: string | null
          gear_ratio: string | null
          gear_set_number: string | null
          id: string
          left_percentage: number | null
          lf_ackerman: number | null
          lf_bump: number | null
          lf_camber: number | null
          lf_caster: number | null
          lf_ride_height: number | null
          lf_shock: number | null
          lf_spring: number | null
          lr_camber: number | null
          lr_ride_height: number | null
          lr_shock: number | null
          lr_spring: number | null
          lr_trailing_arm: number | null
          notes_times: string | null
          pressure_cold: string | null
          pressure_hot: string | null
          r_spoiler_angle: string | null
          rear_end_3rd_link_angle: string | null
          rear_end_f_height_3rd_link: string | null
          rear_end_pinion_angle: string | null
          rear_end_r_height_3rd_link: string | null
          rear_percentage: number | null
          rear_stagger_cold: string | null
          rear_stagger_hot: string | null
          rf_ackerman: number | null
          rf_bump: number | null
          rf_camber: number | null
          rf_caster: number | null
          rf_ride_height: number | null
          rf_shock: number | null
          rf_spring: number | null
          right_percentage: number | null
          rl_cold_pressure: number | null
          rl_hot_pressure: number | null
          rl_temp_center: number | null
          rl_temp_inside: number | null
          rl_temp_outside: number | null
          rpm: string | null
          rr_camber: number | null
          rr_cold_pressure: number | null
          rr_hot_pressure: number | null
          rr_ride_height: number | null
          rr_shock: number | null
          rr_spring: number | null
          rr_temp_center: number | null
          rr_temp_inside: number | null
          rr_temp_outside: number | null
          rr_trailing_arm: number | null
          session_id: string
          session_name: string
          setup_name: string | null
          size_cold: string | null
          size_hot: string | null
          sway_bar: string | null
          sway_preload: string | null
          tire_comp: string | null
          toe: string | null
          total_percentage: number | null
          track: string | null
          track_bar_frame_side: string | null
          track_bar_length: string | null
          track_bar_rear_end_side: string | null
          track_bar_split: string | null
          updated_at: string
          user_id: string
          weather: string | null
        }
        Insert: {
          air_density?: number | null
          air_temp?: number | null
          car?: string | null
          car_id?: string | null
          created_at?: string
          cross_percentage?: number | null
          date?: string | null
          diameter?: string | null
          driver?: string | null
          event_id?: string | null
          f_spoiler_height?: string | null
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
          front_stagger_cold?: string | null
          front_stagger_hot?: string | null
          fuel_gal_used?: string | null
          fuel_laps?: string | null
          fuel_lpg?: string | null
          fuel_mpg?: string | null
          gear_ratio?: string | null
          gear_set_number?: string | null
          id?: string
          left_percentage?: number | null
          lf_ackerman?: number | null
          lf_bump?: number | null
          lf_camber?: number | null
          lf_caster?: number | null
          lf_ride_height?: number | null
          lf_shock?: number | null
          lf_spring?: number | null
          lr_camber?: number | null
          lr_ride_height?: number | null
          lr_shock?: number | null
          lr_spring?: number | null
          lr_trailing_arm?: number | null
          notes_times?: string | null
          pressure_cold?: string | null
          pressure_hot?: string | null
          r_spoiler_angle?: string | null
          rear_end_3rd_link_angle?: string | null
          rear_end_f_height_3rd_link?: string | null
          rear_end_pinion_angle?: string | null
          rear_end_r_height_3rd_link?: string | null
          rear_percentage?: number | null
          rear_stagger_cold?: string | null
          rear_stagger_hot?: string | null
          rf_ackerman?: number | null
          rf_bump?: number | null
          rf_camber?: number | null
          rf_caster?: number | null
          rf_ride_height?: number | null
          rf_shock?: number | null
          rf_spring?: number | null
          right_percentage?: number | null
          rl_cold_pressure?: number | null
          rl_hot_pressure?: number | null
          rl_temp_center?: number | null
          rl_temp_inside?: number | null
          rl_temp_outside?: number | null
          rpm?: string | null
          rr_camber?: number | null
          rr_cold_pressure?: number | null
          rr_hot_pressure?: number | null
          rr_ride_height?: number | null
          rr_shock?: number | null
          rr_spring?: number | null
          rr_temp_center?: number | null
          rr_temp_inside?: number | null
          rr_temp_outside?: number | null
          rr_trailing_arm?: number | null
          session_id: string
          session_name: string
          setup_name?: string | null
          size_cold?: string | null
          size_hot?: string | null
          sway_bar?: string | null
          sway_preload?: string | null
          tire_comp?: string | null
          toe?: string | null
          total_percentage?: number | null
          track?: string | null
          track_bar_frame_side?: string | null
          track_bar_length?: string | null
          track_bar_rear_end_side?: string | null
          track_bar_split?: string | null
          updated_at?: string
          user_id: string
          weather?: string | null
        }
        Update: {
          air_density?: number | null
          air_temp?: number | null
          car?: string | null
          car_id?: string | null
          created_at?: string
          cross_percentage?: number | null
          date?: string | null
          diameter?: string | null
          driver?: string | null
          event_id?: string | null
          f_spoiler_height?: string | null
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
          front_stagger_cold?: string | null
          front_stagger_hot?: string | null
          fuel_gal_used?: string | null
          fuel_laps?: string | null
          fuel_lpg?: string | null
          fuel_mpg?: string | null
          gear_ratio?: string | null
          gear_set_number?: string | null
          id?: string
          left_percentage?: number | null
          lf_ackerman?: number | null
          lf_bump?: number | null
          lf_camber?: number | null
          lf_caster?: number | null
          lf_ride_height?: number | null
          lf_shock?: number | null
          lf_spring?: number | null
          lr_camber?: number | null
          lr_ride_height?: number | null
          lr_shock?: number | null
          lr_spring?: number | null
          lr_trailing_arm?: number | null
          notes_times?: string | null
          pressure_cold?: string | null
          pressure_hot?: string | null
          r_spoiler_angle?: string | null
          rear_end_3rd_link_angle?: string | null
          rear_end_f_height_3rd_link?: string | null
          rear_end_pinion_angle?: string | null
          rear_end_r_height_3rd_link?: string | null
          rear_percentage?: number | null
          rear_stagger_cold?: string | null
          rear_stagger_hot?: string | null
          rf_ackerman?: number | null
          rf_bump?: number | null
          rf_camber?: number | null
          rf_caster?: number | null
          rf_ride_height?: number | null
          rf_shock?: number | null
          rf_spring?: number | null
          right_percentage?: number | null
          rl_cold_pressure?: number | null
          rl_hot_pressure?: number | null
          rl_temp_center?: number | null
          rl_temp_inside?: number | null
          rl_temp_outside?: number | null
          rpm?: string | null
          rr_camber?: number | null
          rr_cold_pressure?: number | null
          rr_hot_pressure?: number | null
          rr_ride_height?: number | null
          rr_shock?: number | null
          rr_spring?: number | null
          rr_temp_center?: number | null
          rr_temp_inside?: number | null
          rr_temp_outside?: number | null
          rr_trailing_arm?: number | null
          session_id?: string
          session_name?: string
          setup_name?: string | null
          size_cold?: string | null
          size_hot?: string | null
          sway_bar?: string | null
          sway_preload?: string | null
          tire_comp?: string | null
          toe?: string | null
          total_percentage?: number | null
          track?: string | null
          track_bar_frame_side?: string | null
          track_bar_length?: string | null
          track_bar_rear_end_side?: string | null
          track_bar_split?: string | null
          updated_at?: string
          user_id?: string
          weather?: string | null
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
        ]
      }
      tracks: {
        Row: {
          address: string
          city: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          state: string | null
          track_type: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          state?: string | null
          track_type?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          state?: string | null
          track_type?: string | null
          updated_at?: string
          website?: string | null
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
