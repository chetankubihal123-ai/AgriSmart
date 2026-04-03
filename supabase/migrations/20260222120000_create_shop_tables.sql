/*
  # Shop Tables Schema

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price` (decimal)
      - `image_url` (text)
      - `category` (text)
      - `stock_quantity` (integer)
      - `created_at` (timestamptz)
    
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `customer_name` (text)
      - `delivery_address` (text)
      - `phone_number` (text)
      - `total_amount` (decimal)
      - `status` (text)
      - `created_at` (timestamptz)
      
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `product_id` (uuid, foreign key to products)
      - `quantity` (integer)
      - `price_at_time` (decimal)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to read products
    - Add policies for users to read and create their own orders
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price decimal NOT NULL DEFAULT 0.0,
  image_url text,
  category text NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  delivery_address text NOT NULL,
  phone_number text NOT NULL,
  total_amount decimal NOT NULL DEFAULT 0.0,
  payment_method text NOT NULL DEFAULT 'cod',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price_at_time decimal NOT NULL DEFAULT 0.0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update product stock"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to decrement stock atomically
CREATE OR REPLACE FUNCTION decrement_stock(prod_id uuid, dec_amount int)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity - dec_amount)
  WHERE id = prod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Orders policies
CREATE POLICY "Users can create their own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Order items policies
CREATE POLICY "Users can create their own order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Insert Dummy Data for Products
INSERT INTO products (name, description, price, category, stock_quantity, image_url)
VALUES 
  ('Emoctan Insecticide - Emamectin Benzoate 5% SG', 'A powerful insecticide for control of bollworms, fruit and shoot borers, and other caterpillars.', 372.00, 'Insecticides', 50, 'https://images.unsplash.com/photo-1599839619722-39751411ea63?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
  ('Hubel Humic Acid - Super Potassium Humate 98%', 'Improves soil structure, increases water holding capacity, and enhances nutrient uptake.', 261.00, 'Fertilizers', 30, 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
  ('Coragen Insecticide (Chlorantraniliprole 18.5% w/w)', 'Effective broad-spectrum control of insect pests in crops like cotton, sugarcane, and rice.', 208.00, 'Insecticides', 100, 'https://images.unsplash.com/photo-1581579186913-40a2bb19ff48?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
  ('Agrigib - Gibberellic Acid 0.001% L', 'Plant growth regulator that promotes cell elongation, leading to larger leaves and longer stems.', 294.00, 'Growth Regulators', 25, 'https://images.unsplash.com/photo-1592841200221-a6898f307ba8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
  ('Pellot - Paclobutrazol 23% SC', 'Specialized growth retardant for mango, resulting in an early, regular and heavy fruiting.', 680.00, 'Growth Regulators', 15, 'https://images.unsplash.com/photo-1599839619722-39751411ea63?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
  ('Benevia Insecticide', 'Cross-spectrum action against chewing and sucking pests in vegetables.', 870.00, 'Insecticides', 40, 'https://images.unsplash.com/photo-1581579186913-40a2bb19ff48?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
  ('Bayer Jump Insecticide', 'Systemic insecticide for control of sucking pests like aphids, jassids, and thrips.', 460.00, 'Insecticides', 60, 'https://images.unsplash.com/photo-1599839619722-39751411ea63?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
  ('Tafgor Insecticide', 'Broad-spectrum systemic insecticide suitable for controlling various pests in multiple crops.', 90.00, 'Insecticides', 120, 'https://images.unsplash.com/photo-1581579186913-40a2bb19ff48?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3');
