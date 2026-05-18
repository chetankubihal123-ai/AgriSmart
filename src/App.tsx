

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
import { MarketRates } from './pages/MarketRates';
import { AdminDashboard } from './components/AdminDashboard';
import { FarmProvider, useFarm } from './contexts/FarmContext';
import { ClassifierProvider } from './contexts/ClassifierContext';

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
    return <Navigate to="/auth" />;
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
      <Route
        path="/*"
        element={
          <FarmProvider>
             <Layout>
                <Routes>
                   <Route path="/dashboard" element={<Dashboard />} />
                   <Route path="/admin/users" element={<PrivateRoute><AdminDashboard initialView="users" /></PrivateRoute>} />
                   <Route path="/admin/orders" element={<PrivateRoute><AdminDashboard initialView="orders" /></PrivateRoute>} />
                   <Route path="/admin/analytics" element={<PrivateRoute><AdminDashboard initialView="dashboard" /></PrivateRoute>} />
                   <Route path="/land-analysis" element={<LandAnalysis />} />
                   <Route path="/crop-health" element={<CropHealthWrapper />} />
                   <Route path="/disease-detection" element={<DiseaseDetectionWrapper />} />
                   <Route path="/weather" element={<WeatherImpactWrapper />} />
                   <Route path="/shop" element={<PrivateRoute><Shop /></PrivateRoute>} />
                   <Route path="/market-rates" element={<MarketRates />} />
                   <Route path="/schemes" element={<SchemesFinder />} />
                </Routes>
             </Layout>
          </FarmProvider>
        }
      />
    </Routes>
  );
}

import { CartProvider } from './contexts/CartContext';
import { OfflineBanner } from './components/OfflineBanner';

function App() {
  return (
    <Router>
      <AuthProvider>
        <RoleProvider>
          <LanguageProvider>
            <ClassifierProvider>
              <CartProvider>
                <OfflineBanner />
                <AppContent />
              </CartProvider>
            </ClassifierProvider>
          </LanguageProvider>
        </RoleProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
