export interface RegistrationType {
  id?: string;
  name: string;
  description: string;
  price: string;
  max_spots: number | null;
  registered_count?: number;
}

export interface RunGroup {
  id?: string;
  name: string;
  sort_order: number;
}

export interface EventRegistration {
  id: string;
  registration_type_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  notes: string | null;
  created_at: string;
  car_number: number | null;
  run_group_id: string | null;
}

export interface PublicEvent {
  id: string;
  name: string;
  date: string;
  time: string | null;
  description: string | null;
  track_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  entry_fee: string | null;
  car_classes: string | null;
  registration_link: string | null;
  status: string;
  organizer_id: string;
  latitude?: number | null;
  longitude?: number | null;
  registration_types?: RegistrationType[];
  run_groups?: RunGroup[];
}

export interface EventSession {
  id?: string;
  run_group_id: string | null;
  registration_type_id: string | null;
  name: string;
  start_time: string;
  duration_minutes: number | null;
  sort_order: number;
}
