import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Search, Activity, MapPin, Clock, ArrowLeft, Maximize2, Info } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

interface Commodity {
  id: string;
  name: string;
  currentPrice: number;
  unit: string;
  trend: number; // percentage
  trendUp: boolean;
  history: number[];
  market: string;
  quality: 'Premium' | 'Standard' | 'Fair';
  lastUpdated?: Date;
  isFlashing?: 'up' | 'down' | null;
}

const BASE_CROPS = [
  { id: 'chilli', name: 'Red Chilli (Teja)', basePrice: 22500, unit: 'Quintal', quality: 'Premium' as const },
  { id: 'corn', name: 'Maize / Corn', basePrice: 2450, unit: 'Quintal', quality: 'Standard' as const },
  { id: 'tomato', name: 'Tomato (Local)', basePrice: 1800, unit: 'Quintal', quality: 'Fair' as const },
  { id: 'soybean', name: 'Soybean (Yellow)', basePrice: 4850, unit: 'Quintal', quality: 'Premium' as const },
  { id: 'wheat', name: 'Wheat (Lokwan)', basePrice: 2850, unit: 'Quintal', quality: 'Standard' as const },
  { id: 'cotton', name: 'Cotton (BT)', basePrice: 7200, unit: 'Quintal', quality: 'Premium' as const }
];

const DEFAULT_MARKETS = ['Guntur APMC', 'Nizamabad APMC', 'Kolar APMC', 'Latur Mandi', 'Sehore APMC', 'Khammam Mandi'];

// Generate a deterministic hash from a string
const stringHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

export function MarketRates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1D' | '1M' | '1Y'>('1D');
  const [now, setNow] = useState(new Date());
  const { t } = useLanguage();

  const selectedCommodity = useMemo(() => 
    commodities.find(c => c.id === selectedCropId),
    [selectedCropId, commodities]
  );

  // Generate historical data based on time range
  const chartData = useMemo(() => {
    if (!selectedCommodity) return [];
    
    const base = selectedCommodity.currentPrice;
    const points: any[] = [];
    const count = timeRange === '1D' ? 24 : timeRange === '1M' ? 30 : 12;
    
    // Seeded random for consistency
    let seed = stringHash(selectedCommodity.id + timeRange);
    const rnd = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    let current = base * (timeRange === '1D' ? 0.98 : timeRange === '1M' ? 0.92 : 0.85);

    for (let i = 0; i < count; i++) {
        const volatility = timeRange === '1D' ? 0.005 : timeRange === '1M' ? 0.02 : 0.05;
        const trend = selectedCommodity.trendUp ? 1.002 : 0.998;
        current = current * trend * (1 + (rnd() * volatility * 2 - volatility));
        
        let label = '';
        if (timeRange === '1D') label = `${i}:00`;
        else if (timeRange === '1M') label = `Day ${i + 1}`;
        else label = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i];

        points.push({ time: label, price: Math.round(current) });
    }
    
    // Ensure the last point matches current price
    points[points.length - 1].price = base;
    return points;
  }, [selectedCommodity, timeRange]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { high: 0, low: 0, change: 0, changePercent: 0 };
    const prices = chartData.map(p => p.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const first = prices[0];
    const last = prices[prices.length - 1];
    const change = last - first;
    const changePercent = parseFloat(((change / first) * 100).toFixed(2));
    return { high, low, change, changePercent };
  }, [chartData]);

  // Handle scroll to analysis when selected
  useEffect(() => {
    if (selectedCropId) {
      setTimeout(() => {
        const element = document.getElementById('price-analysis');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [selectedCropId]);

  // Timer to redraw "time ago" counters smoothly
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. DYNAMIC LOCATION GENERATOR
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // If empty or small, use defaults
    const useDefault = query.length < 3;
    const targetLocation = useDefault ? null : query.charAt(0).toUpperCase() + query.slice(1);

    const generated: Commodity[] = BASE_CROPS.map((crop, idx) => {
      const marketName = targetLocation ? `${targetLocation} APMC` : DEFAULT_MARKETS[idx];
      
      // Use location hash to vary the base price slightly so "Dharwad" is different from "Guntur"
      const hashOffset = targetLocation ? (stringHash(targetLocation + crop.id) % 30 - 15) / 100 : 0; // +/- 15% variation by region
      const adjustedPrice = Math.round(crop.basePrice * (1 + hashOffset));

      // Generate a realistic 7-day history leading up to today
      const history = Array.from({ length: 7 }).map(() => {
         const noise = 1 + (Math.random() * 0.04 - 0.02); // +/- 2%
         return Math.round(adjustedPrice * noise);
      });
      
      // Ensure current is the exactly last in history
      history[6] = adjustedPrice;

      return {
        id: `${crop.id}-${marketName}`,
        name: crop.name,
        currentPrice: adjustedPrice,
        unit: crop.unit,
        trend: parseFloat((Math.random() * 5 + 0.1).toFixed(1)), // 0.1% to 5.0%
        trendUp: Math.random() > 0.4, // Slight bias up
        history,
        market: marketName,
        quality: crop.quality,
        lastUpdated: new Date()
      };
    });

    setCommodities(generated);
  }, [searchQuery]);


  // 2. LIVE TRADING TICKER (MINUTE-BY-MINUTE SIMULATION)
  useEffect(() => {
    // Ticker fires every 6 seconds to simulate high-frequency trading updates
    const ticker = setInterval(() => {
      setCommodities(prev => prev.map(cmd => {
        // Only 30% chance a specific commodity updates this tick to feel organic
        if (Math.random() > 0.3) {
          // Clear flashing state if it didn't update just now
          return cmd.isFlashing ? { ...cmd, isFlashing: null } : cmd;
        }

        const volatility = 0.008; // 0.8% max swing per tick
        const swingMultiplier = 1 + (Math.random() * volatility * 2 - volatility);
        const newPrice = Math.round(cmd.currentPrice * swingMultiplier);
        
        if (newPrice === cmd.currentPrice) return { ...cmd, isFlashing: null };

        const isUp = newPrice > cmd.currentPrice;
        
        // Update history (shift real-time)
        const newHistory = [...cmd.history];
        newHistory[newHistory.length - 1] = newPrice; // Update the 'today' datapoint

        // Recalculate daily trend based on the oldest history point vs new point
        const oldest = newHistory[0];
        const newTrend = parseFloat((Math.abs((newPrice - oldest) / oldest) * 100).toFixed(1));

        return {
          ...cmd,
          currentPrice: newPrice,
          trend: newTrend,
          trendUp: newPrice >= oldest,
          history: newHistory,
          lastUpdated: new Date(),
          isFlashing: isUp ? 'up' : 'down'
        };
      }));
    }, 6000); // Fast 6 second updates

    return () => clearInterval(ticker);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Force a minor tick on all
    setCommodities(prev => prev.map(cmd => ({ ...cmd, isFlashing: 'up', lastUpdated: new Date() })));
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Helper to format "last updated" counter
  const getTimeAgo = (date?: Date) => {
    if (!date) return 'Live';
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 5) return t('market.justNow');
    if (seconds < 60) return `${seconds}${t('market.secondsAgo')}`;
    return `1${t('market.minutesAgo')}`;
  };

  // Volume simulation totals
  const totalVolume = commodities.reduce((acc, curr) => acc + curr.currentPrice, 0) * 12;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-10 rounded-[32px] shadow-lg relative overflow-hidden bg-[#00170c]">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
          <img src="https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&q=80&w=1200" alt="Market" className="w-full h-full object-cover" />
        </div>

        <div className="relative z-10 w-full lg:w-auto">
          <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white mb-3 tracking-tight">
            {t('market.title').split(' ')[0]} <span className="text-prodmast-accent">{t('market.title').split(' ')[1] || ''}</span>
          </h1>
          <div className="flex items-center gap-3 bg-green-500/20 backdrop-blur-md px-5 py-3 rounded-2xl border border-green-400/30 w-fit">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_#ef4444]"></span>
            <p className="text-green-50 font-bold uppercase tracking-widest text-xs">{t('market.liveTradingFloor')}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <input 
              type="text" 
              placeholder={t('market.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white placeholder:text-white/50 rounded-xl px-4 py-3.5 pl-12 focus:ring-2 focus:ring-prodmast-accent outline-none transition-all font-semibold text-sm box-border"
            />
          </div>
          <button 
            onClick={handleRefresh}
            className={`bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl p-3.5 transition-all outline-none box-border ${isRefreshing ? 'animate-spin cursor-not-allowed' : 'active:scale-95'}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Real-time Ticker Marquee */}
      <div className="bg-prodmast-dark text-white rounded-2xl overflow-hidden py-3 px-4 shadow-xl border border-gray-800 flex items-center">
        <div className="flex-shrink-0 bg-red-600 text-white text-[10px] uppercase font-black px-3 py-1 rounded-md mr-4 animate-pulse">
            {t('market.liveTicker')}
        </div>
        <div className="marquee-container overflow-hidden w-full whitespace-nowrap relative">
           <div className="animate-[marquee_20s_linear_infinite] inline-flex space-x-12">
               {commodities.map(c => (
                   <span key={`ticker-${c.id}`} className="font-bold text-sm tracking-wide">
                       {c.name}: <span className={c.trendUp ? 'text-green-400' : 'text-red-400'}>₹{c.currentPrice}</span>
                   </span>
               ))}
               {/* Duplicate for seamless looping */}
               {commodities.map(c => (
                   <span key={`ticker-dup-${c.id}`} className="font-bold text-sm tracking-wide">
                       {c.name}: <span className={c.trendUp ? 'text-green-400' : 'text-red-400'}>₹{c.currentPrice}</span>
                   </span>
               ))}
           </div>
        </div>
      </div>

      {/* Global Market Stats */}
       <h3 className="text-xl font-sans font-extrabold text-prodmast-dark flex items-center gap-3 mb-6 px-2 uppercase tracking-wide mt-10">
          <Activity className="w-6 h-6 text-prodmast-primary" />
          {t('market.agriCommoditiesIndex')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-[24px] border border-gray-200 p-6 flex flex-col justify-between hover:border-prodmast-primary/30 transition-all shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('market.volumes')}</span>
          <span className="text-3xl font-black text-prodmast-dark">{totalVolume.toLocaleString()} MT</span>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-green-600 bg-green-50 w-fit px-3 py-1 rounded-lg">
            <TrendingUp className="w-4 h-4" /> Strong Trade Liquidity
          </div>
        </div>
        <div className="bg-white rounded-[24px] border border-gray-200 p-6 flex flex-col justify-between hover:border-prodmast-primary/30 transition-all shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('market.highestPriced')}</span>
          <span className="text-3xl font-black text-prodmast-dark">
             {commodities.length > 0 ? commodities.reduce((prev, current) => (prev.currentPrice > current.currentPrice) ? prev : current).name : 'N/A'}
          </span>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 w-fit px-3 py-1 rounded-lg">
            High Demand
          </div>
        </div>
        <div className="bg-white rounded-[24px] border border-gray-200 p-6 flex flex-col justify-between hover:border-prodmast-primary/30 transition-all shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('market.tradingActivity')}</span>
          <span className="text-3xl font-black text-prodmast-dark">{t('market.heavy')}</span>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 w-fit px-3 py-1 rounded-lg">
            <RefreshCw className="w-4 h-4 animate-spin-slow" /> Minute-by-Minute Updates
          </div>
        </div>
      </div>

      {/* Interactive Analysis View (Appears on selection) */}
      {selectedCommodity ? (
        <div id="price-analysis" className="bg-prodmast-dark rounded-[40px] p-8 md:p-12 border border-white/10 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-500 mb-12">
           <div className="absolute top-0 right-0 p-8">
             <button 
                onClick={() => setSelectedCropId(null)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all"
             >
                <ArrowLeft className="w-6 h-6" />
             </button>
           </div>

           <div className="flex flex-col lg:flex-row gap-12 relative z-10">
              {/* Left Column: Data & Stats */}
              <div className="w-full lg:w-1/3 flex flex-col justify-center">
                 <div className="inline-flex items-center gap-2 bg-prodmast-accent/20 text-prodmast-accent px-4 py-2 rounded-xl border border-prodmast-accent/30 w-fit mb-6">
                    <Maximize2 className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('market.priceAnalysis')}</span>
                 </div>
                 
                 <h2 className="text-5xl font-black text-white mb-2 leading-tight">{selectedCommodity.name}</h2>
                 <p className="text-white/60 font-bold mb-8 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-prodmast-accent" />
                    {selectedCommodity.market} • {selectedCommodity.quality} Quality
                 </p>

                 <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                       <p className="text-white/40 text-[10px] font-black uppercase tracking-tighter mb-1">{t('market.high')}</p>
                       <p className="text-2xl font-black text-white">₹{stats.high.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                       <p className="text-white/40 text-[10px] font-black uppercase tracking-tighter mb-1">{t('market.low')}</p>
                       <p className="text-2xl font-black text-white">₹{stats.low.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 bg-gradient-to-br from-white/10 to-transparent rounded-2xl p-5 border border-white/10 flex justify-between items-center">
                       <div>
                          <p className="text-white/40 text-[10px] font-black uppercase tracking-tighter mb-1">{t('market.change')} ({timeRange})</p>
                          <p className={`text-3xl font-black ${stats.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                             {stats.change >= 0 ? '+' : ''}₹{Math.abs(stats.change).toLocaleString()}
                          </p>
                       </div>
                       <div className={`px-4 py-2 rounded-xl font-black text-lg ${stats.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {stats.change >= 0 ? '↑' : '↓'} {Math.abs(stats.changePercent)}%
                       </div>
                    </div>
                 </div>

                 <button className="w-full bg-prodmast-accent hover:bg-prodmast-accent/90 text-prodmast-dark font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95">
                    SET PRICE ALERT
                 </button>
              </div>

              {/* Right Column: Chart */}
              <div className="w-full lg:w-2/3 flex flex-col pt-4">
                 <div className="flex justify-between items-center mb-8">
                    <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                       {(['1D', '1M', '1Y'] as const).map(range => (
                          <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                timeRange === range ? 'bg-prodmast-accent text-prodmast-dark shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {t(`market.${range === '1D' ? 'oneDay' : range === '1M' ? 'oneMonth' : 'oneYear'}`)}
                          </button>
                       ))}
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-white/40 text-xs font-bold uppercase tracking-widest">
                       <Info className="w-4 h-4" />
                       Real-time Simulation Active
                    </div>
                 </div>

                 <div className="h-[400px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                          <defs>
                             <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={stats.change >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={stats.change >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0} />
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis 
                            dataKey="time" 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            minTickGap={20}
                          />
                          <YAxis 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(val) => `₹${val}`}
                            domain={['dataMin - 100', 'dataMax + 100']}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#00170c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke={stats.change >= 0 ? "#4ade80" : "#f87171"} 
                            strokeWidth={4} 
                            fillOpacity={1} 
                            fill="url(#colorPrice)" 
                            animationDuration={1500}
                          />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>

           {/* Decorative elements */}
           <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-prodmast-accent/20 rounded-full blur-[100px] pointer-events-none"></div>
           <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        </div>
      ) : (
        <div className="mb-12 flex flex-col items-center justify-center p-12 rounded-[40px] border-4 border-dashed border-gray-100 bg-gray-50/50 group hover:bg-white transition-all duration-500">
           <div className="bg-white shadow-xl rounded-2xl p-4 mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-10 h-10 text-prodmast-primary" />
           </div>
           <h3 className="text-xl font-black text-prodmast-dark mb-2">{t('market.selectCropDetail')}</h3>
           <p className="text-gray-400 font-medium">{t('market.liveTradingFloor')} v2.1 • Smart Analysis System</p>
        </div>
      )}

      {/* Commodity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {commodities.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border border-gray-200 border-dashed">
             <p className="text-lg font-bold text-prodmast-muted">No commodities found matching "{searchQuery}"</p>
             <p className="text-sm text-gray-400 mt-2">Try entering a different location.</p>
          </div>
        ) : (
          commodities.map((item) => (
            <div 
              key={item.id} 
              onClick={() => {
                setSelectedCropId(item.id);
                window.scrollTo({ top: document.getElementById('price-analysis')?.offsetTop || 400, behavior: 'smooth' });
              }}
              className={`bg-white border-2 rounded-[32px] p-8 hover:shadow-xl transition-all duration-300 group flex flex-col relative overflow-hidden cursor-pointer ${
                selectedCropId === item.id ? 'border-prodmast-primary ring-4 ring-prodmast-primary/10 scale-[1.02]' : 
                item.isFlashing === 'up' ? 'border-green-400 shadow-[0_0_30px_rgba(74,222,128,0.3)] bg-green-50/10' : 
                item.isFlashing === 'down' ? 'border-red-400 shadow-[0_0_30px_rgba(248,113,113,0.3)] bg-red-50/10' : 
                'border-gray-100 hover:border-prodmast-primary/50'
              }`}
            >
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                   <h3 className="text-2xl font-extrabold text-prodmast-dark tracking-tight mb-2 group-hover:text-prodmast-primary transition-colors">{item.name}</h3>
                   <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
                     <MapPin className="w-4 h-4 text-prodmast-primary" />
                     {item.market}
                   </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  item.quality === 'Premium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  item.quality === 'Standard' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-gray-100 text-gray-600 border-gray-300'
                }`}>
                  {item.quality}
                </div>
              </div>

              <div className="flex items-end gap-3 mb-8 relative z-10">
                 <span className={`text-5xl font-black leading-none tracking-tighter transition-colors duration-500 ${
                    item.isFlashing === 'up' ? 'text-green-600' : 
                    item.isFlashing === 'down' ? 'text-red-600' : 
                    'text-prodmast-dark'
                 }`}>
                    ₹{item.currentPrice.toLocaleString()}
                 </span>
                 <span className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">/ {item.unit}</span>
              </div>

              <div className="mb-6 relative z-10">
                {/* SVG Sparkline (Historical Trend Simulation) */}
                <div className="w-full h-16 relative">
                  <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                    {/* Compute exact points from history */}
                    <path
                      d={`M ${item.history.map((val, i) => `${(i / (item.history.length - 1)) * 100},${30 - (((val - Math.min(...item.history)) / (Math.max(...item.history) - Math.min(...item.history))) * 30 || 15)}`).join(' L ')}`}
                      fill="none"
                      stroke={item.trendUp ? '#16a34a' : '#dc2626'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`drop-shadow-md transition-all duration-1000 ${item.isFlashing ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between relative z-10">
                <div className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-colors duration-500 ${item.trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {item.trendUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  {item.trend}%
                </div>
                
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('market.lastTrade')}</span>
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                     <Clock className="w-3.5 h-3.5 text-blue-500" />
                     {getTimeAgo(item.lastUpdated)}
                  </span>
                </div>
              </div>

              {/* Flashing glow background effect */}
              {item.isFlashing === 'up' && (
                  <div className="absolute inset-0 bg-green-400/5 mix-blend-overlay z-0 animate-pulse"></div>
              )}
              {item.isFlashing === 'down' && (
                  <div className="absolute inset-0 bg-red-400/5 mix-blend-overlay z-0 animate-pulse"></div>
              )}

            </div>
          ))
        )}
      </div>

    </div>
  );
}
