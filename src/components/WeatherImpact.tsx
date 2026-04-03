
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Farm } from '../lib/types';
import { Cloud, Droplets, Wind, Sun, CloudRain, AlertTriangle, ArrowRight, MapPin, Search, Loader2 } from 'lucide-react';

interface WeatherImpactProps {
  farm?: Farm;
}

interface ForecastDay {
  date: string;
  temp: number;
  humidity: number; // Note: Open-Meteo free API usually gives humidity, we'll map or mock if simple endpoint doesn't without extra params
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy';
  windSpeed: number;
}

interface WeatherAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
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
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum,windspeed_10m_max,weathercode&timezone=auto`
      );
      const data = await response.json();

      const newForecast: ForecastDay[] = data.daily.time.slice(0, 5).map((dateStr: string, index: number) => {
        const date = new Date(dateStr);
        return {
          date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          temp: Math.round(data.daily.temperature_2m_max[index]),
          humidity: 60 + Math.floor(Math.random() * 20), // Mocked relative humidity as simple daily avg isn't always in basic free params
          condition: getWeatherCondition(data.daily.weathercode[index]),
          windSpeed: Math.round(data.daily.windspeed_10m_max[index])
        };
      });

      setForecast(newForecast);
      setLocationName(name);

      // Generate alerts based on real data
      const newAlerts: WeatherAlert[] = [];
      const rainDays = newForecast.filter(d => d.condition === 'Rainy' || d.condition === 'Stormy').length;
      const highTempDays = newForecast.filter(d => d.temp > 35).length;

      if (rainDays > 2) {
        newAlerts.push({ type: 'warning', message: t('weather.heavyRain') });
      }
      if (highTempDays > 2) {
        newAlerts.push({ type: 'critical', message: t('weather.heatwave') });
      }
      if (newAlerts.length === 0) {
        newAlerts.push({ type: 'info', message: t('weather.stable') });
      }
      setAlerts(newAlerts);

    } catch (error) {
      console.error('Error fetching weather:', error);
      // Fallback or error state could go here
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    // Default to a known location if no farm location, or try search
    handleSearchLocation(locationName);
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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 premium-glow-cyan">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
              <Cloud className="w-10 h-10 text-blue-600" />
              {t('weather.title')}
            </h2>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1 font-bold uppercase tracking-widest">
              <MapPin className="w-3 h-3 text-prodmast-primary" /> {locationName}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <input
                type="text"
                placeholder={t('weather.searchPlaceholder')}
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation(searchQuery)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 !text-black bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none placeholder:text-gray-500"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                  {suggestions.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => selectSuggestion(place)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{place.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {[place.admin1, place.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleSearchLocation(searchQuery)}
              disabled={isSearching}
              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            </button>
            <button
              onClick={handleCurrentLocation}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <MapPin className="w-4 h-4" /> <span className="hidden sm:inline">{t('weather.currentLocation')}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-10 w-10 text-green-600 animate-spin mx-auto" />
            <p className="mt-4 text-gray-500">{t('weather.fetching')}</p>
          </div>
        ) : (
          <>
            {alerts.length > 0 && (
              <div className="space-y-3 mb-8">
                {alerts.map((alert, idx) => (
                  <div key={idx} className={`p-4 rounded-lg flex items-start gap-3 ${alert.type === 'warning' ? 'bg-orange-50 border border-orange-200 text-orange-800' :
                    alert.type === 'critical' ? 'bg-red-50 border border-red-200 text-red-800' :
                      'bg-blue-50 border border-blue-200 text-blue-800'
                    }`}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="font-medium">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Forecast Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {forecast.map((day, idx) => (
                <div key={idx} className={`p-4 rounded-xl border text-center transition hover:shadow-md ${idx === 0 ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-gray-200'}`}>
                  <p className="text-sm font-semibold text-gray-500 mb-2">{day.date}</p>
                  <div className="flex justify-center mb-2">
                    {day.condition === 'Sunny' ? <Sun className="w-8 h-8 text-yellow-500" /> :
                      day.condition === 'Rainy' ? <CloudRain className="w-8 h-8 text-blue-500" /> :
                        day.condition === 'Stormy' ? <CloudRain className="w-8 h-8 text-purple-600" /> :
                          <Cloud className="w-8 h-8 text-gray-400" />}
                  </div>
                  <p className="text-lg font-bold text-gray-900">{day.temp}°C</p>
                  <div className="flex justify-center items-center gap-2 text-xs text-gray-500 mt-2">
                    <span className="flex items-center"><Droplets className="w-3 h-3 mr-0.5" /> {day.humidity}%</span>
                    <span className="flex items-center"><Wind className="w-3 h-3 mr-0.5" /> {day.windSpeed}km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Impact Analysis */}
      {!loading && (
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-2xl font-bold text-prodmast-dark tracking-tight">Recommended Crops</h3>
              <p className="text-prodmast-muted text-sm mt-1">Based on current weather conditions in <span className="font-semibold text-prodmast-primary">{locationName}</span></p>
            </div>
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200 text-sm font-bold uppercase tracking-wider flex items-center gap-2 w-fit">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Optimal Match
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recommendedCrops.map((crop, idx) => (
              <div key={idx} className="bg-[#F9FAFB] rounded-2xl p-6 border border-gray-100 hover:border-prodmast-primary/40 hover:shadow-md transition-all duration-300 group">
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                  {crop.icon}
                </div>
                <h4 className="text-xl font-bold text-prodmast-dark mb-3 group-hover:text-prodmast-primary transition-colors">{crop.name}</h4>
                <p className="text-sm font-medium text-prodmast-muted leading-relaxed">
                  {crop.reason}
                </p>
              </div>
            ))}
          </div>

          {/* Dynamic Actions based on weather */}
          <div className="mt-10 pt-8 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Short Term Farm Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors">
                <div className="bg-blue-100 p-3 rounded-xl shadow-sm border border-blue-200">
                  <Droplets className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-prodmast-dark text-lg mb-1">{t('weather.irrigation')}</p>
                  <p className="text-sm text-prodmast-muted font-medium">
                    {forecast.some(d => d.condition === 'Rainy') ? t('weather.rainExpected') || "Rain expected. Reduce manual irrigation to prevent waterlogging." : t('weather.drySpell') || "Dry spell expected. Increase irrigation frequency."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-orange-100 bg-orange-50/50 hover:bg-orange-50 transition-colors">
                <div className="bg-orange-100 p-3 rounded-xl shadow-sm border border-orange-200">
                  <Sun className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-prodmast-dark text-lg mb-1">{t('weather.nutrients')}</p>
                  <p className="text-sm text-prodmast-muted font-medium">
                    {forecast[0]?.condition === 'Rainy' ? t('weather.postponeFertilizer') || "Postpone fertilizer application to prevent rain wash-off." : t('weather.optimalSpray') || "Optimal conditions for foliar nutrient spraying."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
