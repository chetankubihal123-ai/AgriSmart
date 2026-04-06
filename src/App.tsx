

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { RoleProvider, useRole } from './contexts/RoleContext';
import { Auth } from './components/Auth';
import { ResetPassword } from './components/ResetPassword';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CropHealth } from './components/CropHealth';
import { WeatherImpact } from './components/WeatherImpact';
import { DiseaseDetection } from './components/DiseaseDetection';
import { LandAnalysis } from './components/LandAnalysis';
import { Shop } from './pages/Shop';
import { SchemesFinder } from './components/SchemesFinder';
import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from './lib/supabase';
import { Farm } from './lib/types';
import { LandingPage } from './pages/LandingPage';
import { RoleSelection } from './pages/RoleSelection';
import { MarketRates } from './pages/MarketRates';
import { AdminDashboard } from './components/AdminDashboard';

// Create a context to manage farm state globally for the dashboard routes
const FarmContext = createContext<{
  farms: Farm[];
  selectedFarm: Farm | null;
  setSelectedFarm: (farm: Farm | null) => void;
  loadFarms: () => Promise<void>;
  loading: boolean;
}>({
  farms: [],
  selectedFarm: null,
  setSelectedFarm: () => { },
  loadFarms: async () => { },
  loading: true,
});

export const useFarm = () => useContext(FarmContext);

function FarmProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFarms = async () => {
    if (!user) return;
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return <FarmProvider>{children}</FarmProvider>;
}

function RoleProtectedRoute({ children }: { children: React.ReactNode }) {
  const { role } = useRole();
  const location = useLocation();

  if (!role) {
    return <Navigate to="/role-selection" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Wrapper components to consume context and pass farm prop
function CropHealthWrapper() {
  const { selectedFarm } = useFarm();
  // Allow rendering without selectedFarm
  return <CropHealth farm={selectedFarm || undefined} />;
}

function WeatherImpactWrapper() {
  const { selectedFarm } = useFarm();
  return <WeatherImpact farm={selectedFarm || undefined} />;
}

function DiseaseDetectionWrapper() {

  return <DiseaseDetection />;
}

function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { role } = useRole();
  const location = useLocation();

  if (user) {
    if (!role) {
      return <Navigate to="/role-selection" replace />;
    }
    const from = location.state?.from || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={
        <RedirectIfAuthenticated>
          <Auth />
        </RedirectIfAuthenticated>
      } />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/role-selection" element={
        <PrivateRoute>
          <RoleSelection />
        </PrivateRoute>
      } />
      <Route
        path="/*"
        element={
          <PrivateRoute>
             <RoleProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/admin/users" element={<AdminDashboard initialView="users" />} />
                  <Route path="/admin/orders" element={<AdminDashboard initialView="orders" />} />
                  <Route path="/admin/analytics" element={<AdminDashboard initialView="dashboard" />} />
                  <Route path="/land-analysis" element={<LandAnalysis />} />
                  <Route path="/crop-health" element={<CropHealthWrapper />} />
                  <Route path="/disease-detection" element={<DiseaseDetectionWrapper />} />
                  <Route path="/weather" element={<WeatherImpactWrapper />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/market-rates" element={<MarketRates />} />
                  <Route path="/schemes" element={<SchemesFinder />} />
                </Routes>
              </Layout>
             </RoleProtectedRoute>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

import { CartProvider } from './contexts/CartContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <RoleProvider>
          <LanguageProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </LanguageProvider>
        </RoleProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
