

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
import { LandingPage } from './pages/LandingPage';
import { MarketRates } from './pages/MarketRates';
import { AdminDashboard } from './components/AdminDashboard';
import { FarmProvider, useFarm } from './contexts/FarmContext';
import { ClassifierProvider } from './contexts/ClassifierContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

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

  const storedPhone = typeof window !== 'undefined' ? localStorage.getItem('agrismart_user_phone') : null;
  const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('agrismart_user_email') : null;

  if (!user && !storedPhone && !storedEmail) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
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

// Guard specifically for Shop - only accessible after login
function ShopAuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storedPhone = typeof window !== 'undefined' ? localStorage.getItem('agrismart_user_phone') : null;
  const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('agrismart_user_email') : null;

  if (!user && !storedPhone && !storedEmail) {
    return <Navigate to="/auth" state={{ from: '/shop' }} replace />;
  }

  return <>{children}</>;
}

function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  useRole();
  const location = useLocation();

  const storedPhone = typeof window !== 'undefined' ? localStorage.getItem('agrismart_user_phone') : null;
  const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('agrismart_user_email') : null;
  const isAdmin = storedPhone === '9739623988' || (typeof window !== 'undefined' && localStorage.getItem('agrismart_is_admin') === 'true');

  if (user || storedPhone || storedEmail) {
    if (location.state?.from === '/shop') {
      return <Navigate to="/shop" replace />;
    }
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    const from = location.state?.from || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 animate-pulse shadow-lg shadow-green-200"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">AgriSmart</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="mt-3 text-sm text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

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
                   <Route path="dashboard" element={<Dashboard />} />
                   <Route path="admin" element={<PrivateRoute><AdminDashboard initialView="dashboard" /></PrivateRoute>} />
                   <Route path="admin/dashboard" element={<PrivateRoute><AdminDashboard initialView="dashboard" /></PrivateRoute>} />
                   <Route path="admin/users" element={<PrivateRoute><AdminDashboard initialView="users" /></PrivateRoute>} />
                   <Route path="admin/orders" element={<PrivateRoute><AdminDashboard initialView="orders" /></PrivateRoute>} />
                   <Route path="admin/payments" element={<PrivateRoute><AdminDashboard initialView="payments" /></PrivateRoute>} />
                   <Route path="admin/analytics" element={<PrivateRoute><AdminDashboard initialView="dashboard" /></PrivateRoute>} />
                   <Route path="land-analysis" element={<LandAnalysis />} />
                   <Route path="crop-health" element={<CropHealthWrapper />} />
                   <Route path="disease-detection" element={<DiseaseDetectionWrapper />} />
                   <Route path="weather" element={<WeatherImpactWrapper />} />
                   <Route path="shop" element={<ShopAuthGuard><Shop /></ShopAuthGuard>} />
                   <Route path="market-rates" element={<MarketRates />} />
                   <Route path="schemes" element={<SchemesFinder />} />
                   <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
