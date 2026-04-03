export interface Database {
  public: {
    Tables: {
      farms: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          location: string;
          area_hectares: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          location: string;
          area_hectares: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          location?: string;
          area_hectares?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      crop_data: {
        Row: {
          id: string;
          farm_id: string;
          crop_type: string;
          nitrogen: number;
          phosphorus: number;
          potassium: number;
          ph_level: number;
          temperature: number;
          humidity: number;
          rainfall: number;
          soil_moisture: number;
          recorded_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          crop_type: string;
          nitrogen: number;
          phosphorus: number;
          potassium: number;
          ph_level: number;
          temperature: number;
          humidity: number;
          rainfall: number;
          soil_moisture: number;
          recorded_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          crop_type?: string;
          nitrogen?: number;
          phosphorus?: number;
          potassium?: number;
          ph_level?: number;
          temperature?: number;
          humidity?: number;
          rainfall?: number;
          soil_moisture?: number;
          recorded_at?: string;
          created_at?: string;
        };
      };
      predictions: {
        Row: {
          id: string;
          crop_data_id: string;
          health_status: string;
          health_confidence: number;
          yield_estimate: number;
          yield_confidence: number;
          risk_factors: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          crop_data_id: string;
          health_status: string;
          health_confidence: number;
          yield_estimate: number;
          yield_confidence: number;
          risk_factors?: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          crop_data_id?: string;
          health_status?: string;
          health_confidence?: number;
          yield_estimate?: number;
          yield_confidence?: number;
          risk_factors?: unknown;
          created_at?: string;
        };
      };
      recommendations: {
        Row: {
          id: string;
          prediction_id: string;
          fertilizer_type: string;
          fertilizer_quantity: number;
          irrigation_schedule: string;
          irrigation_amount: number;
          preventive_measures: string;
          optimal_conditions: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          prediction_id: string;
          fertilizer_type: string;
          fertilizer_quantity: number;
          irrigation_schedule: string;
          irrigation_amount: number;
          preventive_measures: string;
          optimal_conditions?: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          prediction_id?: string;
          fertilizer_type?: string;
          fertilizer_quantity?: number;
          irrigation_schedule?: string;
          irrigation_amount?: number;
          preventive_measures?: string;
          optimal_conditions?: unknown;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          image_url: string | null;
          category: string;
          stock_quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          price?: number;
          image_url?: string | null;
          category: string;
          stock_quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          image_url?: string | null;
          category?: string;
          stock_quantity?: number;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          customer_name: string;
          delivery_address: string;
          phone_number: string;
          total_amount: number;
          payment_method: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_name: string;
          delivery_address: string;
          phone_number: string;
          total_amount?: number;
          payment_method?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_name?: string;
          delivery_address?: string;
          phone_number?: string;
          total_amount?: number;
          payment_method?: string;
          status?: string;
          created_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price_at_time: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity?: number;
          price_at_time?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          price_at_time?: number;
          created_at?: string;
        };
      };
    };
  };
}

export type Farm = Database['public']['Tables']['farms']['Row'];
export type CropData = Database['public']['Tables']['crop_data']['Row'];
export type Prediction = Database['public']['Tables']['predictions']['Row'];
export type Recommendation = Database['public']['Tables']['recommendations']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
