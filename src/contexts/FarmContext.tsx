import React, { createContext, useContext, useState, useEffect } from 'react';
import { Farm } from '../lib/types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface FarmContextType {
  farms: Farm[];
  selectedFarm: Farm | null;
  setSelectedFarm: (farm: Farm | null) => void;
  loadFarms: () => Promise<void>;
  loading: boolean;
}

const FarmContext = createContext<FarmContextType>({
  farms: [],
  selectedFarm: null,
  setSelectedFarm: () => { },
  loadFarms: async () => { },
  loading: true,
});

export const useFarm = () => useContext(FarmContext);

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFarms = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFarms(data || []);
      if (data && data.length > 0 && !selectedFarm) {
        setSelectedFarm(data[0]);
      }
    } catch (error) {
      console.error('Error loading farms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();
  }, [user]);

  return (
    <FarmContext.Provider value={{ farms, selectedFarm, setSelectedFarm, loadFarms, loading }}>
      {children}
    </FarmContext.Provider>
  );
}
