/*
  # Add Admin Visibility Policies

  1. New Policies
    - Allows admin (phone 9739623988) to view all data in critical tables:
      - `orders`
      - `order_items`
      - `farms`
      - `crop_data`
      - `predictions`
      - `recommendations`
*/

-- Admin Policy for Orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'phone' = '9739623988'
  );

-- Admin Policy for Order Items
CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'phone' = '9739623988'
  );

-- Admin Policy for Farms
CREATE POLICY "Admins can view all farms"
  ON public.farms FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'phone' = '9739623988'
  );

-- Admin Policy for Crop Data
CREATE POLICY "Admins can view all crop data"
  ON public.crop_data FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'phone' = '9739623988'
  );

-- Admin Policy for Predictions
CREATE POLICY "Admins can view all predictions"
  ON public.predictions FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'phone' = '9739623988'
  );

-- Admin Policy for Recommendations
CREATE POLICY "Admins can view all recommendations"
  ON public.recommendations FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'phone' = '9739623988'
  );
