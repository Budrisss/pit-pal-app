-- Add comprehensive setup data fields to match the chassis setup sheet

-- Header information
ALTER TABLE setup_data ADD COLUMN date DATE;
ALTER TABLE setup_data ADD COLUMN track TEXT;
ALTER TABLE setup_data ADD COLUMN driver TEXT;
ALTER TABLE setup_data ADD COLUMN car TEXT;
ALTER TABLE setup_data ADD COLUMN weather TEXT;
ALTER TABLE setup_data ADD COLUMN air_temp NUMERIC;
ALTER TABLE setup_data ADD COLUMN air_density NUMERIC;

-- Setup parameters
ALTER TABLE setup_data ADD COLUMN sway_bar TEXT;
ALTER TABLE setup_data ADD COLUMN sway_preload TEXT;
ALTER TABLE setup_data ADD COLUMN diameter TEXT;
ALTER TABLE setup_data ADD COLUMN front_stagger_cold TEXT;
ALTER TABLE setup_data ADD COLUMN front_stagger_hot TEXT;
ALTER TABLE setup_data ADD COLUMN toe TEXT;
ALTER TABLE setup_data ADD COLUMN f_spoiler_height TEXT;
ALTER TABLE setup_data ADD COLUMN r_spoiler_angle TEXT;

-- Tire data
ALTER TABLE setup_data ADD COLUMN tire_comp TEXT;
ALTER TABLE setup_data ADD COLUMN pressure_cold TEXT;
ALTER TABLE setup_data ADD COLUMN pressure_hot TEXT;
ALTER TABLE setup_data ADD COLUMN size_cold TEXT;
ALTER TABLE setup_data ADD COLUMN size_hot TEXT;

-- Weight data for each corner
ALTER TABLE setup_data ADD COLUMN lf_spring NUMERIC;
ALTER TABLE setup_data ADD COLUMN lf_shock NUMERIC;
ALTER TABLE setup_data ADD COLUMN lf_ride_height NUMERIC;
ALTER TABLE setup_data ADD COLUMN lf_caster NUMERIC;
ALTER TABLE setup_data ADD COLUMN lf_camber NUMERIC;
ALTER TABLE setup_data ADD COLUMN lf_bump NUMERIC;
ALTER TABLE setup_data ADD COLUMN lf_ackerman NUMERIC;

ALTER TABLE setup_data ADD COLUMN rf_spring NUMERIC;
ALTER TABLE setup_data ADD COLUMN rf_shock NUMERIC;
ALTER TABLE setup_data ADD COLUMN rf_ride_height NUMERIC;
ALTER TABLE setup_data ADD COLUMN rf_caster NUMERIC;
ALTER TABLE setup_data ADD COLUMN rf_camber NUMERIC;
ALTER TABLE setup_data ADD COLUMN rf_bump NUMERIC;
ALTER TABLE setup_data ADD COLUMN rf_ackerman NUMERIC;

ALTER TABLE setup_data ADD COLUMN lr_spring NUMERIC;
ALTER TABLE setup_data ADD COLUMN lr_shock NUMERIC;
ALTER TABLE setup_data ADD COLUMN lr_ride_height NUMERIC;
ALTER TABLE setup_data ADD COLUMN lr_camber NUMERIC;
ALTER TABLE setup_data ADD COLUMN lr_trailing_arm NUMERIC;

ALTER TABLE setup_data ADD COLUMN rr_spring NUMERIC;
ALTER TABLE setup_data ADD COLUMN rr_shock NUMERIC;
ALTER TABLE setup_data ADD COLUMN rr_ride_height NUMERIC;
ALTER TABLE setup_data ADD COLUMN rr_camber NUMERIC;
ALTER TABLE setup_data ADD COLUMN rr_trailing_arm NUMERIC;

-- Tire temperature percentages
ALTER TABLE setup_data ADD COLUMN front_percentage NUMERIC;
ALTER TABLE setup_data ADD COLUMN cross_percentage NUMERIC;
ALTER TABLE setup_data ADD COLUMN left_percentage NUMERIC;
ALTER TABLE setup_data ADD COLUMN right_percentage NUMERIC;
ALTER TABLE setup_data ADD COLUMN total_percentage NUMERIC;
ALTER TABLE setup_data ADD COLUMN rear_percentage NUMERIC;

-- Rear stagger
ALTER TABLE setup_data ADD COLUMN rear_stagger_cold TEXT;
ALTER TABLE setup_data ADD COLUMN rear_stagger_hot TEXT;

-- Track bar
ALTER TABLE setup_data ADD COLUMN track_bar_rear_end_side TEXT;
ALTER TABLE setup_data ADD COLUMN track_bar_frame_side TEXT;
ALTER TABLE setup_data ADD COLUMN track_bar_split TEXT;
ALTER TABLE setup_data ADD COLUMN track_bar_length TEXT;

-- Rear end
ALTER TABLE setup_data ADD COLUMN rear_end_pinion_angle TEXT;
ALTER TABLE setup_data ADD COLUMN rear_end_3rd_link_angle TEXT;
ALTER TABLE setup_data ADD COLUMN rear_end_f_height_3rd_link TEXT;
ALTER TABLE setup_data ADD COLUMN rear_end_r_height_3rd_link TEXT;

-- Gears
ALTER TABLE setup_data ADD COLUMN gear_ratio TEXT;
ALTER TABLE setup_data ADD COLUMN gear_set_number TEXT;
ALTER TABLE setup_data ADD COLUMN rpm TEXT;

-- Fuel
ALTER TABLE setup_data ADD COLUMN fuel_laps TEXT;
ALTER TABLE setup_data ADD COLUMN fuel_gal_used TEXT;
ALTER TABLE setup_data ADD COLUMN fuel_mpg TEXT;
ALTER TABLE setup_data ADD COLUMN fuel_lpg TEXT;

-- Notes/Times
ALTER TABLE setup_data ADD COLUMN notes_times TEXT;