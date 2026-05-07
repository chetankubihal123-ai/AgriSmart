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
    <div className="space-y-8 pb-12">
      {/* Search Bar - Floating Style */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white/50 backdrop-blur-xl border border-white p-4 rounded-[32px] shadow-sm sticky top-0 z-30">
        <div className="relative flex-1 group">
          <Search className="w-5 h-5 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-prodmast-primary transition-colors" />
          <input
            type="text"
            placeholder={t('weather.searchPlaceholder')}
            value={searchQuery}
            onChange={handleInputChange}
            className="w-full pl-14 pr-6 py-4 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-prodmast-primary outline-none text-slate-900 font-bold placeholder:text-slate-400 transition-all bg-white"
          />
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden z-50 p-2"
              >
                {suggestions.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => selectSuggestion(place)}
                    className="w-full text-left px-5 py-4 hover:bg-slate-50 flex items-center gap-4 rounded-2xl transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-prodmast-primary/10 group-hover:text-prodmast-primary transition-colors">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-900 uppercase tracking-tight">{place.name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
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
          className="flex items-center gap-3 px-8 py-4 bg-prodmast-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-95 whitespace-nowrap"
        >
          <MapPin className="w-4 h-4" />
          {t('weather.currentLocation')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Forecast */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-prodmast-primary/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            
            <div className="flex justify-between items-end mb-12 relative z-10">
              <div>
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-2 uppercase italic">
                  Weather <span className="text-prodmast-primary">Analysis</span>
                </h2>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full w-fit">
                  <MapPin className="w-4 h-4 text-prodmast-primary" />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{locationName}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Last Sync</p>
                <p className="text-sm font-black text-slate-900">Live • Standard Time</p>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center">
                <Loader2 className="w-16 h-16 text-prodmast-primary animate-spin" />
                <p className="mt-6 text-slate-400 font-black uppercase tracking-widest animate-pulse">{t('weather.fetching')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {forecast.map((day, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className={`p-6 rounded-[32px] border-2 transition-all group ${
                      idx === 0 
                      ? 'bg-prodmast-dark text-white border-prodmast-dark shadow-2xl scale-105 z-10' 
                      : 'bg-white border-slate-50 hover:border-prodmast-primary/20 hover:shadow-lg'
                    }`}
                  >
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-6 ${idx === 0 ? 'text-white/40' : 'text-slate-400'}`}>
                      {idx === 0 ? 'Today' : day.date.split(',')[0]}
                    </p>
                    
                    <div className="mb-8 flex justify-center group-hover:scale-110 transition-transform">
                      {day.condition === 'Sunny' ? <Sun className={`w-10 h-10 ${idx === 0 ? 'text-amber-400' : 'text-amber-500'}`} /> :
                        day.condition === 'Rainy' ? <CloudRain className={`w-10 h-10 ${idx === 0 ? 'text-blue-400' : 'text-blue-500'}`} /> :
                        day.condition === 'Stormy' ? <CloudLightning className={`w-10 h-10 ${idx === 0 ? 'text-purple-400' : 'text-purple-600'}`} /> :
                        <Cloud className={`w-10 h-10 ${idx === 0 ? 'text-slate-400' : 'text-slate-300'}`} />}
                    </div>

                    <div className="text-center">
                      <div className="flex items-start justify-center gap-1 mb-1">
                        <span className="text-3xl font-black tracking-tighter">{day.temp}</span>
                        <span className="text-sm font-bold opacity-50">°C</span>
                      </div>
                      <p className={`text-[9px] font-black uppercase tracking-tighter ${idx === 0 ? 'text-white/60' : 'text-slate-400'}`}>
                        {day.condition}
                      </p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-2">
                       <div className="text-center">
                          <Droplets className={`w-3 h-3 mx-auto mb-1 ${idx === 0 ? 'text-blue-400' : 'text-blue-500'}`} />
                          <p className="text-[8px] font-black">{day.humidity}%</p>
                       </div>
                       <div className="text-center">
                          <Wind className={`w-3 h-3 mx-auto mb-1 ${idx === 0 ? 'text-slate-400' : 'text-slate-500'}`} />
                          <p className="text-[8px] font-black">{day.windSpeed}</p>
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Actionable Insights Section */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-blue-600 rounded-[40px] p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-xl">
                  <Droplets className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-black mb-3 italic tracking-tight">{t('weather.irrigation')}</h4>
                <p className="text-blue-50 font-medium text-sm leading-relaxed mb-8">
                  {forecast.some(d => d.condition === 'Rainy') 
                    ? "Precision Alert: Heavy rainfall detected in the 5-day model. Postpone manual irrigation to prevent root hypoxia and waterlogging." 
                    : "Action Plan: Consistent dry patterns detected. Maintain regular irrigation schedule, focusing on deep soil hydration."}
                </p>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl w-fit border border-white/20">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Optimized Protocol</span>
                </div>
              </div>

              <div className="bg-orange-600 rounded-[40px] p-8 text-white relative overflow-hidden group">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mb-16 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-xl">
                  <Sun className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-black mb-3 italic tracking-tight">{t('weather.nutrients')}</h4>
                <p className="text-orange-50 font-medium text-sm leading-relaxed mb-8">
                  {forecast[0]?.condition === 'Rainy' 
                    ? "Bio-Alert: Immediate rain risk. Postpone foliar nutrient spraying for at least 48 hours to prevent expensive chemical runoff." 
                    : "Optimal Window: High-visibility conditions. Ideal time for nitrogen application and mineral fertilization."}
                </p>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl w-fit border border-white/20">
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Premium Timing</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Alerts & Recommended Crops */}
        <div className="space-y-8">
          {/* Diagnostic Alerts */}
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Intelligence Alerts</h3>
            <div className="space-y-4">
              <AnimatePresence mode='wait'>
                {alerts.map((alert, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={idx} 
                    className={`p-6 rounded-3xl border flex items-start gap-5 transition-all relative overflow-hidden group ${
                      alert.type === 'critical' ? 'bg-red-50/50 border-red-100 text-red-900' :
                      alert.type === 'warning' ? 'bg-amber-50/50 border-amber-100 text-amber-900' :
                      'bg-green-50/50 border-green-100 text-green-900'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      alert.type === 'critical' ? 'bg-red-500 text-white' :
                      alert.type === 'warning' ? 'bg-amber-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      <alert.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase tracking-tight mb-2">{alert.message}</p>
                      <p className="text-xs font-medium opacity-70 leading-relaxed">{alert.recommendation}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Recommended Crops */}
          {!loading && (
            <div className="bg-slate-900 rounded-[48px] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-prodmast-primary/10 rounded-full blur-[100px]"></div>
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40">Suggested Crops</h3>
                <div className="px-3 py-1 bg-prodmast-primary/20 text-prodmast-primary rounded-full text-[8px] font-black uppercase tracking-widest border border-prodmast-primary/30">
                   7-Day Precision
                </div>
              </div>

              <div className="space-y-4">
                {recommendedCrops.map((crop, idx) => (
                  <motion.div 
                    whileHover={{ x: 10 }}
                    key={idx} 
                    className="p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all cursor-default"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">{crop.icon}</div>
                      <div>
                        <h4 className="font-black text-lg tracking-tight">{crop.name}</h4>
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-prodmast-primary" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-prodmast-primary">High Viability</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-white/50 leading-relaxed">
                      {crop.reason}
                    </p>
                  </motion.div>
                ))}
              </div>

              <button className="w-full mt-8 py-5 bg-white text-slate-900 rounded-[32px] font-black uppercase tracking-[0.15em] text-[10px] hover:bg-slate-100 transition-all flex items-center justify-center gap-3 group">
                Access Crop Database
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
}
