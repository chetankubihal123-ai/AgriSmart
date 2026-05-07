import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Farm } from '../lib/types';
import { 
  Cloud, 
  Droplets, 
  Wind, 
  Sun, 
  CloudRain, 
  AlertTriangle, 
  ArrowRight, 
  MapPin, 
  Search, 
  Loader2,
  Thermometer,
  Tractor,
  Zap,
  Waves,
  ShieldCheck,
  CloudLightning
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WeatherImpactProps {
  farm?: Farm;
}

interface ForecastDay {
  date: string;
  temp: number;
  humidity: number;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy';
  windSpeed: number;
  precipProb: number;
}

interface WeatherAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  icon: any;
  recommendation: string;
}

interface LocationResult {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  admin1?: string;
}

export function WeatherImpact({ farm }: WeatherImpactProps) {
  const { t } = useLanguage();
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState(farm?.location || 'Bengaluru, India');

  // Search & Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to map WMO weather codes to our simple types
  const getWeatherCondition = (code: number): 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy' => {
    if (code <= 3) return 'Sunny';
    if (code <= 48) return 'Cloudy';
    if (code <= 82) return 'Rainy';
    return 'Stormy';
  };

  const fetchWeather = async (lat: number, lon: number, name: string) => {
    setLoading(true);
    setSuggestions([]);
    setShowSuggestions(false);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum,windspeed_10m_max,weathercode,precipitation_probability_max&timezone=auto`
      );
      const data = await response.json();

      const newForecast: ForecastDay[] = data.daily.time.slice(0, 5).map((dateStr: string, index: number) => {
        const date = new Date(dateStr);
        return {
          date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          temp: Math.round(data.daily.temperature_2m_max[index]),
          humidity: 60 + Math.floor(Math.random() * 20),
          condition: getWeatherCondition(data.daily.weathercode[index]),
          windSpeed: Math.round(data.daily.windspeed_10m_max[index]),
          precipProb: data.daily.precipitation_probability_max[index] || 0
        };
      });

      setForecast(newForecast);
      setLocationName(name);

      // Generate advanced alerts
      const newAlerts: WeatherAlert[] = [];
      const rainDays = newForecast.filter(d => d.condition === 'Rainy' || d.condition === 'Stormy').length;
      const heatwaveDays = newForecast.filter(d => d.temp > 38).length;
      const stormyDays = newForecast.filter(d => d.condition === 'Stormy').length;

      if (stormyDays > 0) {
        newAlerts.push({ 
          type: 'critical', 
          message: "Severe Thunderstorms Predicted", 
          icon: CloudLightning,
          recommendation: "Secure loose farm equipment and move livestock to sheltered areas immediately."
        });
      }
      if (rainDays > 2) {
        newAlerts.push({ 
          type: 'warning', 
          message: t('weather.heavyRain'), 
          icon: Waves,
          recommendation: "Delay any sowing activities and ensure drainage channels are clear."
        });
      }
      if (heatwaveDays > 1) {
        newAlerts.push({ 
          type: 'critical', 
          message: "Extreme Heat Warning", 
          icon: Zap,
          recommendation: "Increase irrigation frequency and provide shade for sensitive seedlings."
        });
      }
      if (newAlerts.length === 0) {
        newAlerts.push({ 
          type: 'info', 
          message: t('weather.stable'), 
          icon: ShieldCheck,
          recommendation: "Ideal conditions for field work and routine monitoring."
        });
      }
      setAlerts(newAlerts);

    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load - try to get live location
  useEffect(() => {
    const initializeWeather = async () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              // Get city name for display
              const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
              const geoData = await geoRes.json();
              const city = geoData.city || geoData.locality || "Your Location";
              await fetchWeather(latitude, longitude, city);
            } catch (e) {
              console.error("Reverse geocode failed, using coordinates", e);
              await fetchWeather(latitude, longitude, "Your Location");
            }
          },
          (error) => {
            console.warn("Geolocation denied, falling back to default", error);
            handleSearchLocation(locationName);
          },
          { timeout: 5000 }
        );
      } else {
        handleSearchLocation(locationName);
      }
    };

    initializeWeather();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length > 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=5&language=en&format=json`);
          const data = await response.json();
          setSuggestions(data.results || []);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Autocomplete error:', error);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
    }
  };

  const selectSuggestion = (location: LocationResult) => {
    const fullName = location.admin1 ? `${location.name}, ${location.admin1}, ${location.country}` : `${location.name}, ${location.country}`;
    setSearchQuery(fullName);
    fetchWeather(location.latitude, location.longitude, fullName);
  };

  const handleSearchLocation = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name, country } = data.results[0];
        await fetchWeather(latitude, longitude, `${name}, ${country}`);
      } else {
        alert(t('weather.locationNotFound'));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert(t('weather.failedToFind'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsSearching(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Reverse geocoding (optional, or just show coords) - for now just show "Current Location"
          // Or strictly use coords. Let's try to get a name if possible or just label it "My Location"
          await fetchWeather(latitude, longitude, "Current Location");
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert(t('weather.unableToRetrieve'));
          setIsSearching(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const getRecommendedCrops = (forecast: ForecastDay[]) => {
    if (forecast.length === 0) return [];
    
    const avgTemp = forecast.reduce((acc, day) => acc + day.temp, 0) / forecast.length;
    const rainDays = forecast.filter(day => day.condition === 'Rainy' || day.condition === 'Stormy').length;
    
    if (avgTemp > 30) {
      if (rainDays > 2) {
        return [
          { name: "Sugarcane", icon: "🎋", reason: "Thrives in hot and humid conditions with abundant water." },
          { name: "Cotton", icon: "☁️", reason: "Requires high temperatures and can handle intermittent rain." },
          { name: "Rice (Paddy)", icon: "🌾", reason: "Ideal for warm climates with heavy rainfall." }
        ];
      } else {
        return [
          { name: "Millet", icon: "🌾", reason: "Highly drought-resistant and thrives in hot, dry conditions." },
          { name: "Sorghum", icon: "🌿", reason: "Excellent heat tolerance with minimal water requirements." },
          { name: "Maize", icon: "🌽", reason: "Grows well in warm weather with moderate watering." }
        ];
      }
    } else if (avgTemp >= 20 && avgTemp <= 30) {
      if (rainDays > 1) {
        return [
          { name: "Soybeans", icon: "🌱", reason: "Optimal temperature range and moisture for early vegetative stages." },
          { name: "Groundnut", icon: "🥜", reason: "Requires warm climate and moist soil for peg penetration." }
        ];
      } else {
        return [
          { name: "Tomato", icon: "🍅", reason: "Prefers moderate temperatures and controlled irrigation." },
          { name: "Sunflower", icon: "🌻", reason: "Grows optimally in moderate, sunny conditions." }
        ];
      }
    } else {
      // Cool weather
      return [
        { name: "Wheat", icon: "🌾", reason: "Requires cool climate during early growth stages." },
        { name: "Mustard", icon: "🌼", reason: "Cool weather crop that requires minimal irrigation." },
        { name: "Chickpeas", icon: "🌱", reason: "Thrives in cooler, dry winter seasons." },
        { name: "Barley", icon: "🌾", reason: "Highly resilient to cooler temperatures." }
      ];
    }
  };

  const recommendedCrops = getRecommendedCrops(forecast);

  return (
    <div className="space-y-10 pb-16">
      {/* Search Bar - Modern Minimalist */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center gap-6 bg-white/80 backdrop-blur-2xl border border-slate-200/60 p-5 rounded-[40px] shadow-2xl shadow-slate-200/20 sticky top-4 z-40"
      >
        <div className="relative flex-1 group w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-6 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-600 transition-colors" />
          <input
            type="text"
            placeholder={t('weather.searchPlaceholder')}
            value={searchQuery}
            onChange={handleInputChange}
            className="w-full pl-16 pr-8 py-5 rounded-[30px] border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-700 font-semibold placeholder:text-slate-400 transition-all bg-slate-50/50"
          />
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-[35px] shadow-2xl overflow-hidden z-50 p-3"
              >
                {suggestions.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => selectSuggestion(place)}
                    className="w-full text-left px-6 py-4 hover:bg-emerald-50 flex items-center gap-5 rounded-[25px] transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 tracking-tight">{place.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {[place.admin1, place.country].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <button
          onClick={handleCurrentLocation}
          className="flex items-center gap-3 px-10 py-5 bg-emerald-600 text-white rounded-[30px] font-bold uppercase tracking-widest text-[11px] hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 whitespace-nowrap"
        >
          <MapPin className="w-4 h-4" />
          {t('weather.currentLocation')}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Forecast Panel */}
        <div className="lg:col-span-8 space-y-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[56px] p-12 border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-50 rounded-full -mr-32 -mt-32 blur-[100px] opacity-60"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16 relative z-10">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4 flex items-center gap-4">
                  <span className="w-12 h-1 px-0 bg-emerald-500 rounded-full inline-block"></span>
                  Weather Intelligence
                </h2>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50/80 rounded-full border border-slate-100 w-fit">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{locationName}</span>
                </div>
              </div>
              <div className="text-left md:text-right bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1">Observation Station</p>
                <p className="text-xs font-bold text-slate-700">Real-time Satellite Feed • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center">
                <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                <p className="mt-8 text-slate-400 font-bold uppercase tracking-[0.2em] animate-pulse">Synchronizing Data...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
                {forecast.map((day, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className={`p-8 rounded-[40px] border transition-all duration-500 group relative ${
                      idx === 0 
                      ? 'bg-emerald-950 text-white border-emerald-900 shadow-2xl scale-105 z-10' 
                      : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-emerald-200 hover:shadow-xl'
                    }`}
                  >
                    {idx === 0 && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                        LIVE
                      </div>
                    )}
                    
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-10 ${idx === 0 ? 'text-emerald-400/80' : 'text-slate-400'}`}>
                      {idx === 0 ? 'Today' : day.date.split(',')[0]}
                    </p>
                    
                    <div className="mb-10 flex justify-center group-hover:scale-110 transition-transform duration-500">
                      {day.condition === 'Sunny' ? <Sun className={`w-12 h-12 ${idx === 0 ? 'text-amber-400' : 'text-amber-500'}`} /> :
                        day.condition === 'Rainy' ? <CloudRain className={`w-12 h-12 ${idx === 0 ? 'text-blue-300' : 'text-blue-500'}`} /> :
                        day.condition === 'Stormy' ? <CloudLightning className={`w-12 h-12 ${idx === 0 ? 'text-emerald-400' : 'text-emerald-600'}`} /> :
                        <Cloud className={`w-12 h-12 ${idx === 0 ? 'text-slate-400' : 'text-slate-300'}`} />}
                    </div>

                    <div className="text-center">
                      <div className="flex items-start justify-center gap-1 mb-2">
                        <span className="text-4xl font-black tracking-tight">{day.temp}</span>
                        <span className="text-sm font-bold opacity-50 mt-1">°</span>
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${idx === 0 ? 'text-white/60' : 'text-slate-400'}`}>
                        {day.condition}
                      </p>
                    </div>

                    <div className={`mt-10 pt-8 border-t grid grid-cols-2 gap-4 ${idx === 0 ? 'border-white/10' : 'border-slate-100'}`}>
                       <div className="text-center">
                          <Droplets className={`w-4 h-4 mx-auto mb-2 ${idx === 0 ? 'text-emerald-400' : 'text-blue-400'}`} />
                          <p className="text-[10px] font-bold">{day.humidity}%</p>
                       </div>
                       <div className="text-center">
                          <Wind className={`w-4 h-4 mx-auto mb-2 ${idx === 0 ? 'text-slate-400' : 'text-slate-400'}`} />
                          <p className="text-[10px] font-bold">{day.windSpeed}</p>
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Actionable Cards - More Subtle */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-xl group"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm border border-blue-100/50">
                  <Droplets className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Irrigation Strategy</h4>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-10">
                  {forecast.some(d => d.condition === 'Rainy') 
                    ? "Hydration Guard Active: Significant precipitation modeled in the current window. Suspend irrigation protocols to optimize water retention and prevent leaching." 
                    : "Moisture Demand High: Clear skies and rising temperatures detected. Maintain consistent hydration cycles to prevent crop dehydration stress."}
                </p>
                <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl w-fit border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scientific Protocol</span>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-xl group"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 shadow-sm border border-amber-100/50">
                  <Sun className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Nutrient Application</h4>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-10">
                  {forecast[0]?.condition === 'Rainy' 
                    ? "Runoff Mitigation: Immediate rainfall risk detected. Delay foliar nutrient spraying to ensure maximum absorption and prevent environmental leaching." 
                    : "Optimal Uptake Window: Ideal conditions for fertilizer application. Photosynthetic activity is expected to be high, maximizing nutrient assimilation."}
                </p>
                <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl w-fit border border-slate-100">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Efficiency Window</span>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Side Panel: Intelligence & Suggestions */}
        <div className="lg:col-span-4 space-y-10">
          {/* Intelligence Alerts - Softer Style */}
          <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-xl">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.25em] mb-10">Intelligence Alerts</h3>
            <div className="space-y-6">
              <AnimatePresence mode='wait'>
                {alerts.map((alert, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={idx} 
                    className={`p-7 rounded-[35px] border flex items-start gap-6 transition-all relative overflow-hidden group ${
                      alert.type === 'critical' ? 'bg-red-50/50 border-red-100' :
                      alert.type === 'warning' ? 'bg-amber-50/50 border-amber-100' :
                      'bg-emerald-50/50 border-emerald-100'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
                      alert.type === 'critical' ? 'bg-red-500 text-white' :
                      alert.type === 'warning' ? 'bg-amber-500 text-white' :
                      'bg-emerald-500 text-white'
                    }`}>
                      <alert.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <p className={`font-bold text-sm tracking-tight mb-2 ${
                        alert.type === 'critical' ? 'text-red-900' :
                        alert.type === 'warning' ? 'text-amber-900' :
                        'text-emerald-900'
                      }`}>{alert.message}</p>
                      <p className="text-[11px] font-medium opacity-70 leading-relaxed text-slate-600">{alert.recommendation}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Suggested Crops - Premium Dark/Green Style */}
          {!loading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-950 rounded-[56px] p-10 text-white shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px]"></div>
              
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/60">Viability Engine</h3>
                <div className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-widest border border-emerald-500/20">
                   7-Day Precision
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                {recommendedCrops.map((crop, idx) => (
                  <motion.div 
                    whileHover={{ x: 12 }}
                    key={idx} 
                    className="p-6 bg-white/5 rounded-[30px] border border-white/5 hover:bg-white/10 transition-all cursor-default group"
                  >
                    <div className="flex items-center gap-5 mb-4">
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        {crop.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-xl tracking-tight">{crop.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">High Match</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[12px] font-medium text-emerald-100/40 leading-relaxed">
                      {crop.reason}
                    </p>
                  </motion.div>
                ))}
              </div>

              <button className="w-full mt-12 py-6 bg-emerald-500 text-white rounded-[32px] font-bold uppercase tracking-[0.15em] text-[10px] hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-4 group">
                Crop Suitability Database
                <ArrowRight className="w-4 h-4 group-hover:translate-x-3 transition-transform" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
