import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { CropData, Prediction } from '../lib/types';
import {
  Sprout,
  Bug,
  Leaf,
  CloudRain,
  Activity,
  ArrowRight,
  Filter,
  AlertTriangle,
  TrendingUp,
  FileText,
  Sun,
  TrendingDown,
  Cloud,
  CloudSun,
  Bell,
  Droplets,
  LineChart,
  ShoppingBag,
  Landmark,
  Calculator
} from 'lucide-react';
import { useFarm } from '../App';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { YieldChart, CropDistributionChart, HealthTrendChart, SoilRadarChart } from './DashboardCharts';
import { DiseaseScanner } from './DiseaseScanner';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from './AdminDashboard';

export function Dashboard() {
  const { farms, selectedFarm, setSelectedFarm, loading: farmsLoading } = useFarm();
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [recentData, setRecentData] = useState<(CropData & { prediction?: Prediction })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState('All');
  const navigate = useNavigate();

  const [locationName, setLocationName] = useState<string | null>(null);
  const [weather, setWeather] = useState<{ temp: number, code: number } | null>(null);
  const [snapshotCrops, setSnapshotCrops] = useState([
    { id: 'chilli', name: 'Red Chilli (Teja)', price: 21500, trend: '+4.2%', up: true, flash: null as 'up' | 'down' | null },
    { id: 'corn', name: 'Maize / Corn', price: 2450, trend: '+1.5%', up: true, flash: null as 'up' | 'down' | null },
    { id: 'tomato', name: 'Tomato (Local)', price: 1800, trend: '-12.4%', up: false, flash: null as 'up' | 'down' | null }
  ]);

  useEffect(() => {
    const ticker = setInterval(() => {
      setSnapshotCrops(prev => prev.map(c => {
        if (Math.random() > 0.4) return { ...c, flash: null };
        const change = Math.round(c.price * (Math.random() * 0.004 - 0.002));
        if (change === 0) return { ...c, flash: null };
        return {
          ...c,
          price: c.price + change,
          flash: change > 0 ? 'up' : 'down'
        };
      }));
    }, 12000); // Throttled from 5s to 12s for performance improvement
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const geoData = await geoRes.json();
          setLocationName(geoData.city || geoData.locality || "Local");

          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const weatherData = await weatherRes.json();
          setWeather({ temp: weatherData.current_weather.temperature, code: weatherData.current_weather.weathercode });
        } catch (e) {
          console.error("Failed to fetch location data", e);
        }
      }, (error) => {
        console.warn("Geolocation denied or error", error);
      });
    }
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-5 h-5 text-amber-300" />;
    if (code <= 3) return <CloudSun className="w-5 h-5 text-blue-200" />;
    if (code >= 51) return <CloudRain className="w-5 h-5 text-indigo-300" />;
    return <Cloud className="w-5 h-5 text-gray-300" />;
  };

  // Derived Data for Live Charts
  const { soilData, healthTrendData, distributionData, yieldData } = useMemo(() => {
    if (!recentData || recentData.length === 0) {
      return {
        yieldData: [],
        distributionData: [],
        healthTrendData: [],
        soilData: []
      };
    }

    const latest = recentData[0];
    const chronological = [...recentData].reverse();

    const soilData = [
      { subject: 'Nitrogen', A: latest.nitrogen || 0 },
      { subject: 'Phosphorus', A: latest.phosphorus || 0 },
      { subject: 'Potassium', A: latest.potassium || 0 },
      { subject: 'pH Level', A: latest.ph_level ? (latest.ph_level / 14) * 100 : 0 },
      { subject: 'Moisture', A: latest.soil_moisture || 0 },
    ];

    const healthTrendData = chronological.map(d => {
      const date = new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      let health = 95;
      if (d.prediction) {
        if (d.prediction.health_status === 'Warning') health = 70;
        if (d.prediction.health_status === 'Critical' || d.prediction.health_status === 'Disease') health = 40;
        health = Math.round(health * (d.prediction.health_confidence / 100));
      }
      return { date, health };
    });

    const cropCounts = recentData.reduce((acc, curr) => {
      acc[curr.crop_type] = (acc[curr.crop_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const distributionData = Object.keys(cropCounts).map(key => ({
      name: key, value: cropCounts[key]
    }));

    const yieldData = chronological.map((d, index) => {
      const name = new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short' });
      const expected = d.prediction?.yield_estimate || 0;
      const isFuture = index >= chronological.length - 2;
      const actual = isFuture ? null : Math.round(expected * (0.85 + Math.random() * 0.25));
      return { name, expected: Math.round(expected), actual };
    });

    return { soilData, healthTrendData, distributionData, yieldData };
  }, [recentData]);

  useEffect(() => {
    if (selectedFarm) {
      loadRecentData();
    } else {
      setLoading(false);
    }
  }, [selectedFarm]);

  const loadRecentData = async () => {
    if (!selectedFarm) return;
    setLoading(true);
    try {
      const { data: cropData, error } = await supabase
        .from('crop_data')
        .select('*')
        .eq('farm_id', selectedFarm.id)
        .order('recorded_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const dataWithPredictions = await Promise.all(
        (cropData || []).map(async (crop) => {
          const { data: prediction } = await supabase
            .from('predictions')
            .select('*')
            .eq('crop_data_id', crop.id)
            .maybeSingle();

          return { ...crop, prediction: prediction || undefined };
        })
      );

      setRecentData(dataWithPredictions);
    } catch (error) {
      console.error('Error loading recent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const allFeatures = [
    {
      title: "Smart Schemes",
      desc: "Find government subsidies and agricultural schemes tailored specifically to your farm profile and crop selection.",
      icon: <Landmark className="w-8 h-8" />,
      path: "/schemes",
      iconColor: "text-indigo-600",
      bgHover: "group-hover:bg-indigo-50",
      image: "https://images.unsplash.com/photo-1590282424163-952328574169?auto=format&fit=crop&q=80&w=800",
      stats: [
        { label: "Matches", value: "8 Active" },
        { label: "State", value: "Karnataka" },
      ]
    },
    {
      title: "Land Analysis",
      desc: "Analyze farm health and soil metrics comprehensively using satellite imagery and IoT soil sensors. Track moisture, pH, and nutrient density in real-time.",
      icon: <FileText className="w-8 h-8" />,
      path: "/land-analysis",
      iconColor: "text-blue-600",
      bgHover: "group-hover:bg-blue-50",
      image: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=800",
      stats: [
        { label: "Accuracy", value: "98%" },
        { label: "Updates", value: "Daily" },
      ]
    },
    {
      title: "Crop Health",
      desc: "Check the current health and vitality of your crops. Compare historical growth rates and monitor localized stress factors across different farm sectors.",
      icon: <Leaf className="w-8 h-8" />,
      path: "/crop-health",
      iconColor: "text-green-600",
      bgHover: "group-hover:bg-green-50",
      image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=800",
      stats: [
        { label: "Scanned", value: "1.2k acres" },
        { label: "Status", value: "Optimal" },
      ]
    },
    {
      title: "Disease Tracker",
      desc: "Scan and review reported crop diseases instantly. Our AI models identify early signs of fungal and bacterial infections to prevent massive outbreaks.",
      icon: <Bug className="w-8 h-8" />,
      path: "/disease-detection",
      iconColor: "text-amber-600",
      bgHover: "group-hover:bg-amber-50",
      image: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=800",
      stats: [
        { label: "Diseases", value: "45+ tracked" },
        { label: "Prevention", value: "92%" },
      ]
    },
    {
      title: "Climate & Weather",
      desc: "Monitor localized weather conditions and forecasts to plan your irrigation and harvesting schedules with pinpoint accuracy.",
      icon: <CloudRain className="w-8 h-8" />,
      path: "/weather",
      iconColor: "text-indigo-600",
      bgHover: "group-hover:bg-indigo-50",
      image: "https://images.unsplash.com/photo-1561553543-e4c7b608b98d?auto=format&fit=crop&q=80&w=800",
      stats: [
        { label: "Radar", value: "Doppler" },
        { label: "Forecast", value: "14-Day" },
      ]
    },
    {
      title: "Market Rates",
      desc: "Track daily commodity prices from local APMCs and mandis. Plan your harvest sales by monitoring real-time trends for Chilli, Corn, and Tomato.",
      icon: <LineChart className="w-8 h-8" />,
      path: "/market-rates",
      iconColor: "text-emerald-600",
      bgHover: "group-hover:bg-emerald-50",
      image: "https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&q=80&w=800",
      stats: [
        { label: "Commodities", value: "24+" },
        { label: "Data Quality", value: "Live" },
      ]
    },
    {
      title: "Agri Shop",
      desc: "Purchase premium seeds, fertilizers, and smart farming tools directly from verified suppliers with exclusive agricultural discounts.",
      icon: <ShoppingBag className="w-8 h-8" />,
      path: "/shop",
      iconColor: "text-rose-600",
      bgHover: "group-hover:bg-rose-50",
      image: "https://images.unsplash.com/photo-1589923158776-cb4485d99fd6?auto=format&fit=crop&q=80&w=800",
      stats: [
        { label: "Suppliers", value: "Verified" },
        { label: "Delivery", value: "Pan-India" },
      ]
    }
  ];

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (farmsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-prodmast-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-prodmast-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-10 rounded-[32px] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1599839619722-39751411ea63?auto=format&fit=crop&q=80&w=1200" alt="Farm Sunset" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#002f1a]/95 via-[#004e24]/85 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full lg:w-auto">
          <div className="flex flex-col gap-2 mb-3">
            <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight leading-tight">
              {locationName ? locationName + " " : 'Main '}
              <span className="text-prodmast-accent">(karnataka)</span>
            </h1>
            {weather && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-white/95 bg-white/10 backdrop-blur-xl w-fit px-4 py-2 rounded-2xl border border-white/20 shadow-xl group/weather cursor-default transition-all hover:bg-white/20">
                  {getWeatherIcon(weather.code)}
                  <span className="font-extrabold text-lg tracking-tight">{Math.round(weather.temp)}°C</span>
                  <div className="w-[1px] h-3 bg-white/30 mx-1"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Local Weather</span>
                </div>

                <div className="flex items-center gap-2 text-white bg-indigo-500/80 backdrop-blur-xl w-fit px-4 py-2 rounded-2xl border border-indigo-400 shadow-xl group/roi cursor-pointer transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95" onClick={() => navigate('/dashboard')}>
                   <Calculator className="w-5 h-5 text-amber-300" />
                   <span className="font-extrabold text-lg tracking-tight">28.4%</span>
                   <div className="w-[1px] h-3 bg-white/30 mx-1"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-90">Expected ROI</span>
                </div>
              </div>
            )}
          </div>
          {selectedFarm ? (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 w-fit cursor-default">
              <span className="w-3 h-3 rounded-full bg-prodmast-accent animate-pulse shadow-[0_0_10px_#a3e635]"></span>
              <p className="text-slate-100 font-semibold">{t('dashboard.overview')} <span className="text-white font-extrabold ml-1">{selectedFarm.name}</span></p>
            </div>
          ) : (
            <p className="text-slate-200 text-sm font-semibold mt-2">Select a farm to explore analytics</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full lg:w-auto">
          {farms.length > 0 && (
            <>
              <div className="relative group w-full sm:w-auto">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-prodmast-accent outline-none transition-all appearance-none cursor-pointer pl-11 font-semibold text-sm"
                >
                  <option value="All" className="text-prodmast-dark">All Seasons</option>
                  <option value="Kharif" className="text-prodmast-dark">Kharif</option>
                  <option value="Rabi" className="text-prodmast-dark">Rabi</option>
                  <option value="Zaid" className="text-prodmast-dark">Zaid</option>
                </select>
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
              </div>

              <div className="relative group w-full sm:w-auto">
                <select
                  value={selectedFarm?.id || ''}
                  onChange={(e) => setSelectedFarm(farms.find(f => f.id === e.target.value) || null)}
                  className="w-full bg-prodmast-accent text-prodmast-dark hover:bg-prodmast-accent/90 border border-transparent rounded-xl px-6 py-3.5 outline-none transition-all appearance-none cursor-pointer min-w-[200px] font-extrabold uppercase tracking-widest text-[11px]"
                >
                  <option value="" disabled className="bg-white text-prodmast-dark">{t('dashboard.selectFarm')}</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id} className="bg-white text-prodmast-dark normal-case tracking-normal py-2 text-sm font-semibold">
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Market Snapshot Widget */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pt-2">
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 group cursor-pointer" onClick={() => navigate('/market-rates')}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-sans font-extrabold text-prodmast-dark flex items-center gap-3 tracking-wide uppercase">
              <LineChart className="w-6 h-6 text-emerald-600" />
              Live Market Snapshot
            </h3>
            <span className="text-sm font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              View Full Board <ArrowRight className="w-4 h-4" />
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {snapshotCrops.map(c => (
              <div key={c.name} className={`bg-gray-50 border rounded-[24px] p-6 flex justify-between items-center transition-all duration-500 overflow-hidden relative ${c.flash === 'up' ? 'border-green-400 bg-green-50 shadow-[0_0_15px_rgba(74,222,128,0.2)]' :
                c.flash === 'down' ? 'border-red-400 bg-red-50 shadow-[0_0_15px_rgba(248,113,113,0.2)]' :
                  'border-gray-100 hover:bg-emerald-50/30'
                }`}>
                <div className="relative z-10 transition-transform group-hover:translate-x-1">
                  <p className="font-bold text-gray-500 text-xs mb-1 uppercase tracking-widest">{c.name}</p>
                  <p className={`text-2xl font-black transition-colors duration-500 ${c.flash === 'up' ? 'text-green-600' : c.flash === 'down' ? 'text-red-600' : 'text-prodmast-dark'}`}>
                    ₹{c.price.toLocaleString()}
                  </p>
                </div>
                <div className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${c.up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {c.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {c.trend}
                </div>
                {c.flash === 'up' && <div className="absolute inset-0 bg-green-400/10 animate-ping opacity-20"></div>}
                {c.flash === 'down' && <div className="absolute inset-0 bg-red-400/10 animate-ping opacity-20"></div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h3 className="text-xl font-sans font-extrabold text-prodmast-dark flex items-center gap-3 mb-6 px-2 uppercase tracking-wide">
          <Bell className="w-6 h-6 text-prodmast-primary" />
          {t('dashboard.featuresAndAlerts')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-blue-50 border border-blue-200 rounded-3xl p-8 relative overflow-hidden group hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-100 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex flex-col relative z-10 h-full">
              <div className="bg-white w-14 h-14 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center mb-6">
                <CloudRain className="w-7 h-7 text-blue-500" />
              </div>
              <div>
                <h4 className="font-extrabold text-blue-900 text-xl tracking-tight mb-2">{t('dashboard.rainAlert')}</h4>
                <p className="text-blue-700 font-medium text-sm leading-relaxed mb-6">{t('dashboard.rainAlertDesc')}</p>
              </div>
              <button className="mt-auto self-start text-xs font-bold text-blue-800 uppercase tracking-widest bg-blue-100/50 hover:bg-blue-200 px-4 py-2 rounded-lg transition-colors">
                {t('dashboard.viewWeatherRadar')}
              </button>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-3xl p-8 relative overflow-hidden group hover:shadow-lg hover:shadow-red-900/5 transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-100 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex flex-col relative z-10 h-full">
              <div className="bg-white w-14 h-14 rounded-2xl shadow-sm border border-red-100 flex items-center justify-center mb-6">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-extrabold text-red-900 text-xl tracking-tight">{t('dashboard.diseaseOutbreakAlert')}</h4>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                </div>
                <p className="text-red-700 font-medium text-sm leading-relaxed mb-6">{t('dashboard.diseaseOutbreakDesc')}</p>
              </div>
              <button className="mt-auto self-start text-xs font-bold text-red-800 uppercase tracking-widest bg-red-100/50 hover:bg-red-200 px-4 py-2 rounded-lg transition-colors">
                {t('dashboard.deployTreatment')}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 relative overflow-hidden group hover:shadow-lg hover:shadow-amber-900/5 transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-100 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex flex-col relative z-10 h-full">
              <div className="bg-white w-14 h-14 rounded-2xl shadow-sm border border-amber-100 flex items-center justify-center mb-6">
                <Droplets className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <h4 className="font-extrabold text-amber-900 text-xl tracking-tight mb-2">{t('dashboard.irrigationReminder')}</h4>
                <p className="text-amber-700 font-medium text-sm leading-relaxed mb-6">{t('dashboard.irrigationReminderDesc')}</p>
              </div>
              <button className="mt-auto self-start text-xs font-bold text-amber-800 uppercase tracking-widest bg-amber-100/50 hover:bg-amber-200 px-4 py-2 rounded-lg transition-colors">
                {t('dashboard.startIrrigationNow')}
              </button>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-sans font-extrabold text-prodmast-dark flex items-center gap-3 mb-6 px-2 uppercase tracking-wide">
          <Activity className="w-6 h-6 text-prodmast-primary" />
          {t('dashboard.analyticsDashboard')}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <YieldChart data={yieldData} />
          <CropDistributionChart data={distributionData} />
          <HealthTrendChart data={healthTrendData} />
          <SoilRadarChart data={soilData} />
        </div>
      </div>

      <div className="pt-6">
        <h3 className="text-xl font-sans font-extrabold text-prodmast-dark flex items-center gap-3 mb-10 px-2 uppercase tracking-wide">
          <Activity className="w-6 h-6 text-prodmast-primary" />
          {t('dashboard.agriculturalModules')}
        </h3>

        <div className="space-y-12">
          {allFeatures.map((card, idx) => {
            const isReverse = idx % 2 !== 0;
            return (
              <div
                key={idx}
                onClick={() => navigate(card.path)}
                className={`group cursor-pointer bg-white rounded-[32px] border border-gray-200 shadow-sm hover:shadow-2xl hover:border-prodmast-primary/50 transition-all duration-500 overflow-hidden flex flex-col md:flex-row ${isReverse ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="md:w-1/2 h-64 md:h-auto relative overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 flex gap-3">
                    {card.stats.map((stat, i) => (
                      <div key={i} className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-5 py-2.5 rounded-xl flex flex-col items-start min-w-[120px]">
                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">{stat.label}</span>
                        <span className="font-extrabold text-lg tracking-tight">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:w-1/2 p-10 lg:p-14 flex flex-col justify-center relative bg-white z-10">
                  <div className={`w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-8 border border-gray-100 transition-all duration-500 ${card.bgHover} group-hover:shadow-inner transform group-hover:-translate-y-2`}>
                    <div className={`${card.iconColor}`}>{card.icon}</div>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-sans font-extrabold text-prodmast-dark mb-4 group-hover:text-prodmast-primary transition-colors duration-300 tracking-tight">
                    {card.title}
                  </h3>
                  <p className="text-prodmast-muted text-lg leading-relaxed mb-10 font-medium max-w-lg">
                    {card.desc}
                  </p>
                  <div className="mt-auto flex items-center gap-3">
                    <div className="w-10 h-[2px] bg-prodmast-primary/30 group-hover:w-16 transition-all duration-500"></div>
                    <span className="text-sm font-black text-prodmast-primary uppercase tracking-[0.2em] transition-all duration-500 group-hover:text-prodmast-dark">
                      Explore Module
                    </span>
                    <ArrowRight className="w-5 h-5 text-prodmast-primary transform group-hover:translate-x-3 transition-transform duration-500" />
                  </div>
                  <div className="absolute top-10 right-10 text-[160px] font-black text-gray-50 opacity-40 z-0 pointer-events-none transform translate-x-10 -translate-y-10 selection:bg-transparent">
                    0{idx + 1}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <StatCard title={t('dashboard.totalArea')} value={selectedFarm ? `${selectedFarm.area_hectares} ha` : '4.5 ha'} icon={<Sprout className="w-5 h-5" />} trend="+2.4%" trendUp={true} />
        <StatCard title="Est. ROI" value="28.4%" icon={<Calculator className="w-5 h-5 text-indigo-500" />} trend="+4.2% vs AVG" trendUp={true} />
        <StatCard title={t('dashboard.estYield')} value="450 Tons" icon={<TrendingUp className="w-5 h-5 text-blue-500" />} trend="+12% vs LY" trendUp={true} />
        <StatCard title={t('dashboard.avgHealth')} value="92%" icon={<Activity className="w-5 h-5 text-green-500" />} trend={t('dashboard.excellent')} trendUp={true} />
      </div>

      {selectedFarm && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          <DiseaseScanner />

          <div className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-sans font-bold text-prodmast-dark flex items-center gap-3 tracking-tight">
                <Activity className="w-8 h-8 text-prodmast-primary" />
                {t('dashboard.recentActivity')}
              </h3>
            </div>

            {loading ? (
              <div className="text-center py-12 text-prodmast-muted">{t('dashboard.loadingData')}</div>
            ) : recentData.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-prodmast-dark font-bold mb-2 text-lg">{t('dashboard.noData')}</p>
                <p className="text-sm text-prodmast-muted">{t('dashboard.startAnalyzing')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentData.map((data) => (
                  <div key={data.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-prodmast-primary/30 hover:shadow-md transition-all group">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                      <div>
                        <h4 className="font-bold text-prodmast-dark text-xl group-hover:text-prodmast-primary transition-colors">{data.crop_type}</h4>
                        <p className="text-sm text-prodmast-muted font-medium mt-1">
                          {new Date(data.recorded_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      {data.prediction && (
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${data.prediction.health_status === 'Healthy'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : data.prediction.health_status === 'Warning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                          <span className={`w-2 h-2 rounded-full ${data.prediction.health_status === 'Healthy' ? 'bg-green-500' : data.prediction.health_status === 'Warning' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                          {data.prediction.health_status}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-6">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <span className="text-gray-500 block text-xs font-bold mb-1 uppercase tracking-wider">{t('dashboard.temp')}</span>
                        <span className="font-bold text-prodmast-dark text-lg">{data.temperature}°C</span>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <span className="text-gray-500 block text-xs font-bold mb-1 uppercase tracking-wider">{t('dashboard.humidity')}</span>
                        <span className="font-bold text-prodmast-dark text-lg">{data.humidity}%</span>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <span className="text-gray-500 block text-xs font-bold mb-1 uppercase tracking-wider">{t('dashboard.ph')}</span>
                        <span className="font-bold text-prodmast-dark text-lg">{data.ph_level}</span>
                      </div>
                      {data.prediction && (
                        <div className="bg-prodmast-primary/5 rounded-xl p-4 border border-prodmast-primary/10">
                          <span className="text-prodmast-primary block text-xs font-bold mb-1 uppercase tracking-wider">{t('dashboard.estYield')}</span>
                          <span className="font-bold text-prodmast-dark text-lg">{data.prediction.yield_estimate} kg/ha</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, trend, trendUp }: { title: string; value: string; icon: React.ReactNode, trend?: string, trendUp?: boolean }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-6 flex flex-col relative hover:border-prodmast-primary/30 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <span className="text-sm font-bold text-prodmast-muted uppercase tracking-wider">{title}</span>
        <div className={`p-3 rounded-xl bg-gray-50 border border-gray-100 text-prodmast-primary group-hover:bg-prodmast-primary/10 group-hover:border-prodmast-primary/20 transition-all duration-300`}>
          {icon}
        </div>
      </div>
      <div className="relative z-10 mt-auto">
        <p className="text-3xl md:text-4xl font-sans font-extrabold text-prodmast-dark mb-4 tracking-tight">{value}</p>
        {trend && (
          <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md ${trendUp ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-700 bg-red-50 border border-red-200'}`}>
            {trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}
