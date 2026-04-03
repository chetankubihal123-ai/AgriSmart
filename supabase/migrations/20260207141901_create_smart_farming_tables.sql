/*
  # Smart Farming Assistant Database Schema

  1. New Tables
    - `farms`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - farm name
      - `location` (text) - farm location
      - `area_hectares` (decimal) - farm area in hectares
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `crop_data`
      - `id` (uuid, primary key)
      - `farm_id` (uuid, foreign key to farms)
      - `crop_type` (text) - type of crop being grown
      - `nitrogen` (decimal) - nitrogen content in soil
      - `phosphorus` (decimal) - phosphorus content in soil
      - `potassium` (decimal) - potassium content in soil
      - `ph_level` (decimal) - soil pH level
      - `temperature` (decimal) - temperature in celsius
      - `humidity` (decimal) - humidity percentage
      - `rainfall` (decimal) - rainfall in mm
      - `soil_moisture` (decimal) - soil moisture percentage
      - `recorded_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `predictions`
      - `id` (uuid, primary key)
      - `crop_data_id` (uuid, foreign key to crop_data)
      - `health_status` (text) - predicted health status
      - `health_confidence` (decimal) - confidence score for health prediction
      - `yield_estimate` (decimal) - estimated yield in kg/hectare
      - `yield_confidence` (decimal) - confidence score for yield prediction
      - `risk_factors` (jsonb) - identified risk factors
      - `created_at` (timestamptz)
    
    - `recommendations`
      - `id` (uuid, primary key)
      - `prediction_id` (uuid, foreign key to predictions)
      - `fertilizer_type` (text) - recommended fertilizer
      - `fertilizer_quantity` (decimal) - quantity in kg/hectare
      - `irrigation_schedule` (text) - irrigation recommendations
      - `irrigation_amount` (decimal) - water amount in liters
      - `preventive_measures` (text) - preventive actions to take
      - `optimal_conditions` (jsonb) - optimal growing conditions
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create farms table
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  location text NOT NULL,
  area_hectares decimal NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create crop_data table
CREATE TABLE IF NOT EXISTS crop_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE NOT NULL,
  crop_type text NOT NULL,
  nitrogen decimal NOT NULL DEFAULT 0,
  phosphorus decimal NOT NULL DEFAULT 0,
  potassium decimal NOT NULL DEFAULT 0,
  ph_level decimal NOT NULL DEFAULT 7.0,
  temperature decimal NOT NULL DEFAULT 0,
  humidity decimal NOT NULL DEFAULT 0,
  rainfall decimal NOT NULL DEFAULT 0,
  soil_moisture decimal NOT NULL DEFAULT 0,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_data_id uuid REFERENCES crop_data(id) ON DELETE CASCADE NOT NULL,
  health_status text NOT NULL,
  health_confidence decimal NOT NULL DEFAULT 0,
  yield_estimate decimal NOT NULL DEFAULT 0,
  yield_confidence decimal NOT NULL DEFAULT 0,
  risk_factors jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid REFERENCES predictions(id) ON DELETE CASCADE NOT NULL,
  fertilizer_type text NOT NULL,
  fertilizer_quantity decimal NOT NULL DEFAULT 0,
  irrigation_schedule text NOT NULL,
  irrigation_amount decimal NOT NULL DEFAULT 0,
  preventive_measures text NOT NULL,
  optimal_conditions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for farms table
CREATE POLICY "Users can view their own farms"
  ON farms FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own farms"
  ON farms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own farms"
  ON farms FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own farms"
  ON farms FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for crop_data table
CREATE POLICY "Users can view crop data for their farms"
  ON crop_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = crop_data.farm_id
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create crop data for their farms"
  ON crop_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = crop_data.farm_id
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update crop data for their farms"
  ON crop_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = crop_data.farm_id
      AND farms.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = crop_data.farm_id
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete crop data for their farms"
  ON crop_data FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = crop_data.farm_id
      AND farms.user_id = auth.uid()
    )
  );

-- RLS Policies for predictions table
CREATE POLICY "Users can view predictions for their crop data"
  ON predictions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crop_data
      JOIN farms ON farms.id = crop_data.farm_id
      WHERE crop_data.id = predictions.crop_data_id
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create predictions for their crop data"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crop_data
      JOIN farms ON farms.id = crop_data.farm_id
      WHERE crop_data.id = predictions.crop_data_id
      AND farms.user_id = auth.uid()
    )
  );

-- RLS Policies for recommendations table
CREATE POLICY "Users can view recommendations for their predictions"
  ON recommendations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM predictions
      JOIN crop_data ON crop_data.id = predictions.crop_data_id
      JOIN farms ON farms.id = crop_data.farm_id
      WHERE predictions.id = recommendations.prediction_id
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recommendations for their predictions"
  ON recommendations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM predictions
      JOIN crop_data ON crop_data.id = predictions.crop_data_id
      JOIN farms ON farms.id = crop_data.farm_id
      WHERE predictions.id = recommendations.prediction_id
      AND farms.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_crop_data_farm_id ON crop_data(farm_id);
CREATE INDEX IF NOT EXISTS idx_predictions_crop_data_id ON predictions(crop_data_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_prediction_id ON recommendations(prediction_id);