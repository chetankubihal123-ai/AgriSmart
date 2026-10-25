/*
  # Smart Farming Assistant Database Schema — COMPLETE
  
  All 8 tables used by the AgriSmart application:

  1. `profiles`         — User profiles (auto-created on signup)
  2. `farms`            — Registered farms per user
  3. `crop_data`        — Soil/weather readings per farm
  4. `predictions`      — ML predictions for crop health & yield
  5. `recommendations`  — Fertilizer, irrigation advice
  6. `products`         — E-commerce shop product catalog
  7. `orders`           — Customer orders
  8. `order_items`      — Line items within each order

  Security:
    - RLS enabled on all tables
    - Users can only access their own data
    - Products are publicly readable
    - Admin role can view all profiles, orders, and farms
*/

-- ======================
-- TABLE 1: profiles
-- ======================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  role text DEFAULT 'farmer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ======================
-- TABLE 2: farms
-- ======================
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  location text NOT NULL,
  area_hectares decimal NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ======================
-- TABLE 3: crop_data
-- ======================
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

-- ======================
-- TABLE 4: predictions
-- ======================
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

-- ======================
-- TABLE 5: recommendations
-- ======================
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

-- ======================
-- TABLE 6: products
-- ======================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price decimal NOT NULL DEFAULT 0,
  image_url text,
  category text NOT NULL DEFAULT 'general',
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ======================
-- TABLE 7: orders
-- ======================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  delivery_address text NOT NULL,
  phone_number text NOT NULL,
  total_amount decimal NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- ======================
-- TABLE 8: order_items
-- ======================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price_at_time decimal NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES: profiles
-- ==========================================
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ==========================================
-- RLS POLICIES: farms
-- ==========================================
CREATE POLICY "Users can view their own farms"
  ON farms FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own farms"
  ON farms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own farms"
  ON farms FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own farms"
  ON farms FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ==========================================
-- RLS POLICIES: crop_data
-- ==========================================
CREATE POLICY "Users can view crop data for their farms"
  ON crop_data FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM farms WHERE farms.id = crop_data.farm_id AND farms.user_id = auth.uid()
  ));

CREATE POLICY "Users can create crop data for their farms"
  ON crop_data FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM farms WHERE farms.id = crop_data.farm_id AND farms.user_id = auth.uid()
  ));

CREATE POLICY "Users can update crop data for their farms"
  ON crop_data FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM farms WHERE farms.id = crop_data.farm_id AND farms.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM farms WHERE farms.id = crop_data.farm_id AND farms.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete crop data for their farms"
  ON crop_data FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM farms WHERE farms.id = crop_data.farm_id AND farms.user_id = auth.uid()
  ));

-- ==========================================
-- RLS POLICIES: predictions
-- ==========================================
CREATE POLICY "Users can view predictions for their crop data"
  ON predictions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM crop_data
    JOIN farms ON farms.id = crop_data.farm_id
    WHERE crop_data.id = predictions.crop_data_id AND farms.user_id = auth.uid()
  ));

CREATE POLICY "Users can create predictions for their crop data"
  ON predictions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM crop_data
    JOIN farms ON farms.id = crop_data.farm_id
    WHERE crop_data.id = predictions.crop_data_id AND farms.user_id = auth.uid()
  ));

-- ==========================================
-- RLS POLICIES: recommendations
-- ==========================================
CREATE POLICY "Users can view recommendations for their predictions"
  ON recommendations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM predictions
    JOIN crop_data ON crop_data.id = predictions.crop_data_id
    JOIN farms ON farms.id = crop_data.farm_id
    WHERE predictions.id = recommendations.prediction_id AND farms.user_id = auth.uid()
  ));

CREATE POLICY "Users can create recommendations for their predictions"
  ON recommendations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM predictions
    JOIN crop_data ON crop_data.id = predictions.crop_data_id
    JOIN farms ON farms.id = crop_data.farm_id
    WHERE predictions.id = recommendations.prediction_id AND farms.user_id = auth.uid()
  ));

-- ==========================================
-- RLS POLICIES: products (publicly readable)
-- ==========================================
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ==========================================
-- RLS POLICIES: orders
-- ==========================================
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
  ON orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ==========================================
-- RLS POLICIES: order_items
-- ==========================================
CREATE POLICY "Users can view their own order items"
  ON order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can create order items for their orders"
  ON order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

-- ==========================================
-- AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- ADMIN POLICIES (for AdminDashboard)
-- ==========================================
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admin can view all orders"
  ON orders FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admin can view all farms"
  ON farms FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_crop_data_farm_id ON crop_data(farm_id);
CREATE INDEX IF NOT EXISTS idx_predictions_crop_data_id ON predictions(crop_data_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_prediction_id ON recommendations(prediction_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);