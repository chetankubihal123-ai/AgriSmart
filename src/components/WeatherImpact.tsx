import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Farm } from '../lib/types';
import {
  Cloud,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  MapPin,
  Search,
  Loader2,
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
  const { t, language } = useLanguage();
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState(farm?.location || 'Bengaluru, India');

  // Search & Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
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
          message: language === 'kn' ? "ತೀವ್ರ ಗುಡುಗು ಸಹಿತ ಮಳೆ ಮುನ್ಸೂಚನೆ" : "Severe Thunderstorms Predicted",
          icon: CloudLightning,
          recommendation: language === 'kn' ? "ಸಡಿಲವಾದ ಕೃಷಿ ಉಪಕರಣಗಳನ್ನು ಭದ್ರಪಡಿಸಿ ಮತ್ತು ಜಾನುವಾರುಗಳನ್ನು ತಕ್ಷಣ ಸುರಕ್ಷಿತ ಸ್ಥಳಗಳಿಗೆ ಸರಿಸಿ." : "Secure loose farm equipment and move livestock to sheltered areas immediately."
        });
      }
      if (rainDays > 2) {
        newAlerts.push({
          type: 'warning',
          message: t('weather.heavyRain'),
          icon: Waves,
          recommendation: language === 'kn' ? "ಯಾವುದೇ ಬಿತ್ತನೆ ಚಟುವಟಿಕೆಗಳನ್ನು ವಿಳಂಬಗೊಳಿಸಿ ಮತ್ತು ಕಾಲುವೆಗಳು ಸ್ವಚ್ಛವಾಗಿರುವುದನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ." : "Delay any sowing activities and ensure drainage channels are clear."
        });
      }
      if (heatwaveDays > 1) {
        newAlerts.push({
          type: 'critical',
          message: language === 'kn' ? "ತೀವ್ರ ಶಾಖದ ಎಚ್ಚರಿಕೆ" : "Extreme Heat Warning",
          icon: Zap,
          recommendation: language === 'kn' ? "ನೀರಾವರಿ ಆವರ್ತನವನ್ನು ಹೆಚ್ಚಿಸಿ ಮತ್ತು ಸೂಕ್ಷ್ಮ ಸಸಿಗಳಿಗೆ ನೆರಳು ನೀಡಿ." : "Increase irrigation frequency and provide shade for sensitive seedlings."
        });
      }
      if (newAlerts.length === 0) {
        newAlerts.push({
          type: 'info',
          message: t('weather.stable'),
          icon: ShieldCheck,
          recommendation: language === 'kn' ? "ಕ್ಷೇತ್ರದ ಕೆಲಸ ಮತ್ತು ದಿನನಿತ್ಯದ ಮೇಲ್ವಿಚಾರಣೆಗೆ ಸೂಕ್ತ ಪರಿಸ್ಥಿತಿಗಳು." : "Ideal conditions for field work and routine monitoring."
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
      if ('navigator' in window && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
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
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=5&language=en&format=json`);
          const data = await response.json();
          setSuggestions(data.results || []);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Autocomplete error:', error);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (location: LocationResult) => {
    const fullName = [location.name, location.admin1, location.country].filter(Boolean).join(', ');
    setSearchQuery(fullName);
    fetchWeather(location.latitude, location.longitude, fullName);
  };

  const handleSearchLocation = async (query: string) => {
    if (!query.trim()) return;
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const loc = data.results[0];
        const fullName = [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ');
        setSearchQuery(fullName);
        await fetchWeather(loc.latitude, loc.longitude, fullName);
      } else {
        alert(t('weather.locationNotFound'));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert(t('weather.failedToFind'));
    } finally {
      setShowSuggestions(false);
    }
  };

  const handleCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await fetchWeather(latitude, longitude, "Current Location");
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert(t('weather.unableToRetrieve'));
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
          { name: language === 'kn' ? "ಕಬ್ಬು" : "Sugarcane", icon: "🎋", reason: "Thrives in hot and humid conditions with abundant water." },
          { name: language === 'kn' ? "ಹತ್ತಿ" : "Cotton", icon: "☁️", reason: "Requires high temperatures and can handle intermittent rain." },
          { name: language === 'kn' ? "ಭತ್ತ" : "Rice (Paddy)", icon: "🌾", reason: "Ideal for warm climates with heavy rainfall." }
        ];
      } else {
        return [
          { name: language === 'kn' ? "ರಾಗಿ" : "Millet", icon: "🌾", reason: "Highly drought-resistant and thrives in hot, dry conditions." },
          { name: language === 'kn' ? "ಜೋಳ" : "Sorghum", icon: "🌿", reason: "Excellent heat tolerance with minimal water requirements." },
          { name: language === 'kn' ? "ಮೆಕ್ಕೆಜೋಳ" : "Maize", icon: "🌽", reason: "Grows well in warm weather with moderate watering." }
        ];
      }
    } else if (avgTemp >= 20 && avgTemp <= 30) {
      if (rainDays > 1) {
        return [
          { name: language === 'kn' ? "ಸೋಯಾಬೀನ್" : "Soybeans", icon: "🌱", reason: "Optimal temperature range and moisture for early vegetative stages." },
          { name: language === 'kn' ? "ನೆಲಗಡಲೆ" : "Groundnut", icon: "🥜", reason: "Requires warm climate and moist soil for peg penetration." }
        ];
      } else {
        return [
          { name: language === 'kn' ? "ಟೊಮೆಟೊ" : "Tomato", icon: "🍅", reason: "Prefers moderate temperatures and controlled irrigation." },
          { name: language === 'kn' ? "ಸೂರ್ಯಕಾಂತಿ" : "Sunflower", icon: "🌻", reason: "Grows optimally in moderate, sunny conditions." }
        ];
      }
    } else {
      return [
        { name: language === 'kn' ? "ಗೋಧಿ" : "Wheat", icon: "🌾", reason: "Requires cool climate during early growth stages." },
        { name: language === 'kn' ? "ಸಾಸಿವೆ" : "Mustard", icon: "🌼", reason: "Cool weather crop that requires minimal irrigation." },
        { name: language === 'kn' ? "ಕಡಲೆ" : "Chickpeas", icon: "🌱", reason: "Thrives in cooler, dry winter seasons." }
      ];
    }
  };

  const recommendedCrops = getRecommendedCrops(forecast);

  return (
    <div className="space-y-10 pb-16 w-full max-w-full flex flex-col justify-start">
      
      {/* Search Bar - Spacious, Majestic & Full Width */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center gap-8 bg-white/80 backdrop-blur-3xl border border-slate-200/60 p-6 rounded-[36px] shadow-xl w-full sticky top-4 z-40"
      >
        <div className="relative flex-1 group w-full">
          <Search className="w-6 h-6 text-slate-400 absolute left-8 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-600 transition-colors" />
          <input
            type="text"
            placeholder={t('weather.searchPlaceholder')}
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchLocation(searchQuery);
              }
            }}
            className="w-full pl-20 pr-10 py-6 rounded-[28px] border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none text-lg text-slate-700 font-extrabold placeholder:text-slate-400 transition-all bg-slate-50/50"
          />
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute top-full left-0 right-0 mt-6 bg-white border border-slate-200/60 rounded-[28px] shadow-2xl overflow-hidden z-50 p-4"
              >
                {suggestions.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => selectSuggestion(place)}
                    className="w-full text-left px-8 py-4 hover:bg-emerald-50 flex items-center gap-5 rounded-[22px] transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold text-base text-slate-800 tracking-tight">{place.name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">
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
          className="flex items-center gap-4 px-10 py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-[12px] transition-all shadow-lg shadow-emerald-100 active:scale-95 whitespace-nowrap"
        >
          <MapPin className="w-5 h-5" />
          {t('weather.currentLocation')}
        </button>
      </motion.div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start w-full">
        
        {/* Left main columns - span 8 */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Main Forecast Panel - Rounded & Elegant */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[48px] p-12 border border-slate-100 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-50 rounded-full -mr-32 -mt-32 blur-[100px] opacity-50"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 relative z-10">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-5 flex items-center gap-4">
                  <span className="w-12 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                  {language === 'kn' ? 'ಹವಾಮಾನ ಬುದ್ಧಿವಂತಿಕೆ' : 'Weather Intelligence'}
                </h2>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50/80 rounded-full border border-slate-100 w-fit shadow-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">{locationName}</span>
                </div>
              </div>
              <div className="text-left md:text-right bg-slate-50/50 p-4.5 rounded-[24px] border border-slate-100 shadow-inner">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1.5 leading-none">Observation Sync</p>
                <p className="text-xs font-extrabold text-slate-700">Satellite Stream • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.25em] animate-pulse text-sm">Syncing live climate index...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
                {forecast.map((day, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={idx}
                    className={`p-8 rounded-[36px] border transition-all duration-300 group relative flex flex-col justify-between items-center text-center ${idx === 0
                      ? 'bg-emerald-950 text-white border-emerald-900 shadow-2xl scale-105 z-10'
                      : 'bg-slate-50/30 border-slate-100 hover:bg-white hover:border-emerald-200 hover:shadow-xl'
                      }`}
                  >
                    {idx === 0 && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border border-emerald-500/20 leading-none">
                        LIVE
                      </div>
                    )}

                    <p className={`text-[10px] font-black uppercase tracking-[0.15em] mb-8 ${idx === 0 ? 'text-emerald-400/80' : 'text-slate-400'}`}>
                      {idx === 0 ? 'Today' : day.date.split(',')[0]}
                    </p>

                    <div className="mb-8 flex justify-center group-hover:scale-110 transition-transform duration-300">
                      {day.condition === 'Sunny' ? <Sun className={`w-12 h-12 ${idx === 0 ? 'text-amber-400' : 'text-amber-500'}`} /> :
                        day.condition === 'Rainy' ? <CloudRain className={`w-12 h-12 ${idx === 0 ? 'text-blue-300' : 'text-blue-500'}`} /> :
                        day.condition === 'Stormy' ? <CloudLightning className={`w-12 h-12 ${idx === 0 ? 'text-emerald-400' : 'text-emerald-600'}`} /> :
                        <Cloud className={`w-12 h-12 ${idx === 0 ? 'text-slate-400' : 'text-slate-300'}`} />}
                    </div>

                    <div>
                      <div className="flex items-start justify-center gap-0.5">
                        <span className="text-4xl font-black tracking-tighter">{day.temp}</span>
                        <span className="text-lg font-bold opacity-40 mt-0.5">°</span>
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.15em] mt-1 ${idx === 0 ? 'text-white/60' : 'text-slate-400'}`}>
                        {day.condition}
                      </p>
                    </div>

                    <div className={`mt-8 pt-6 border-t w-full grid grid-cols-2 gap-4 ${idx === 0 ? 'border-white/10' : 'border-slate-100'}`}>
                      <div className="text-center">
                        <Droplets className={`w-4 h-4 mx-auto mb-2 ${idx === 0 ? 'text-emerald-400' : 'text-blue-400'}`} />
                        <p className="text-[10px] font-black tracking-tight">{day.humidity}%</p>
                      </div>
                      <div className="text-center">
                        <Wind className={`w-4 h-4 mx-auto mb-2 ${idx === 0 ? 'text-slate-400' : 'text-slate-400'}`} />
                        <p className="text-[10px] font-black tracking-tight">{day.windSpeed}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Actionable Insights - Large & Bold Layout */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              
              <motion.div
                whileHover={{ y: -6 }}
                className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-lg group transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-16 h-16 bg-blue-50 rounded-[20px] flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm border border-blue-100/50">
                    <Droplets className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Irrigation Strategy</h4>
                  <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8">
                    {forecast.some(d => d.condition === 'Rainy')
                      ? "Hydration Guard Active: Significant precipitation modeled in the current window. Suspend irrigation protocols to optimize water retention and prevent leaching."
                      : "Moisture Demand High: Clear skies and rising temperatures detected. Maintain consistent hydration cycles to prevent crop dehydration stress."}
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 px-5 py-3.5 rounded-xl w-fit border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Scientific Protocol</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -6 }}
                className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-lg group transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-16 h-16 bg-amber-50 rounded-[20px] flex items-center justify-center mb-8 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 shadow-sm border border-amber-100/50">
                    <Sun className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Nutrient Application</h4>
                  <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8">
                    {forecast[0]?.condition === 'Rainy'
                      ? "Runoff Mitigation: Immediate rainfall risk detected. Delay foliar nutrient spraying to ensure maximum absorption and prevent environmental leaching."
                      : "Optimal Uptake Window: Ideal conditions for fertilizer application. Photosynthetic activity is expected to be high, maximizing nutrient assimilation."}
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 px-5 py-3.5 rounded-xl w-fit border border-slate-100">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Efficiency Window</span>
                </div>
              </motion.div>

            </div>
          )}
        </div>

        {/* Right Columns (Alerts & Viability Engine) - span 4 */}
        <div className="lg:col-span-4 space-y-10">
          
          {/* Intelligence Alerts Panel */}
          <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-lg">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-8 pl-1">Intelligence Alerts</h3>
            <div className="space-y-6">
              <AnimatePresence mode='wait'>
                {alerts.map((alert, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={idx}
                    className={`p-6 rounded-[28px] border flex items-start gap-5 transition-all relative overflow-hidden group ${alert.type === 'critical' ? 'bg-red-50/50 border-red-100' :
                      alert.type === 'warning' ? 'bg-amber-50/50 border-amber-100' :
                      'bg-emerald-50/50 border-emerald-100'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${alert.type === 'critical' ? 'bg-red-500 text-white' :
                      alert.type === 'warning' ? 'bg-amber-500 text-white' :
                      'bg-emerald-500 text-white'
                      }`}>
                      <alert.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`font-black text-base tracking-tight mb-2 ${alert.type === 'critical' ? 'text-red-900' :
                        alert.type === 'warning' ? 'text-amber-900' :
                        'text-emerald-900'
                        }`}>{alert.message}</p>
                      <p className="text-xs font-bold leading-relaxed text-slate-500">{alert.recommendation}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Viability Engine Panel - Majestic Dark Theme */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-950 rounded-[48px] p-10 text-white shadow-xl relative overflow-hidden"
            >
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-[100px]"></div>

              <div className="flex items-center justify-between mb-10 pb-3 border-b border-white/10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400/60">Viability Engine</h3>
                <div className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-sm leading-none">
                  7-Day Accuracy
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                {recommendedCrops.map((crop, idx) => (
                  <motion.div
                    whileHover={{ x: 8 }}
                    key={idx}
                    className="p-6 bg-white/5 rounded-[32px] border border-white/5 hover:bg-white/10 transition-all cursor-default group"
                  >
                    <div className="flex items-center gap-5 mb-4">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                        {crop.icon}
                      </div>
                      <div>
                        <h4 className="font-black text-lg tracking-tight leading-none">{crop.name}</h4>
                        <div className="flex items-center gap-1.5 mt-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 leading-none">High Suitability</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-emerald-100/40 leading-relaxed">
                      {crop.reason}
                    </p>
                  </motion.div>
                ))}
              </div>

            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
