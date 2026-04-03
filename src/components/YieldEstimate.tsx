import { useState } from 'react';
import { Farm } from '../lib/types';
import { TrendingUp, Sprout, Droplets, Thermometer, Calculator, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface YieldEstimateProps {
  farm?: Farm;
}

interface YieldFormData {
  cropType: string;
  soilType: string;
  area: string;
  temperature: string;
  rainfall: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  ph: string;
  seedCost: string;
  fertilizerCost: string;
  laborCost: string;
  irrigationCost: string;
  marketPrice: string;
}

interface YieldResult {
  estimatedYield: number; // in kg/ha
  totalYield: number; // in kg
  confidence: number;
  revenue: number;
  totalExpenses: number;
  netProfit: number;
  roi: number;
  factors: { name: string; impact: 'positive' | 'negative' | 'neutral'; value: string }[];
}

export function YieldEstimate({ farm }: YieldEstimateProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<YieldFormData>({
    cropType: 'Wheat',
    soilType: 'Loam',
    area: farm?.area_hectares?.toString() || '1',
    temperature: '25',
    rainfall: '100',
    nitrogen: '120',
    phosphorus: '60',
    potassium: '40',
    ph: '6.5',
    seedCost: '5000',
    fertilizerCost: '8000',
    laborCost: '12000',
    irrigationCost: '3000',
    marketPrice: '45' // Base price in Rs/kg
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<YieldResult | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateYield = async () => {
    setLoading(true);
    setResult(null);

    // Simulate AI Calculation delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock Prediction Logic
    // Base yield + adjustments based on inputs (simplified logic for demo)
    const baseYields: Record<string, number> = {
      'Wheat': 3000,
      'Rice': 4000,
      'Corn': 5000,
      'Soybean': 2500,
      'Cotton': 2000
    };

    const base = baseYields[formData.cropType] || 3000;

    // Random variations simulating AI interpreting complex factors
    const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
    const nitrogenImpact = Math.min(parseInt(formData.nitrogen) / 100, 1.2);

    const estimatedYield = Math.round(base * randomFactor * nitrogenImpact);
    const total = estimatedYield * parseFloat(formData.area);

    // Financial Calculations
    const marketPrice = parseFloat(formData.marketPrice);
    const revenue = total * marketPrice;
    const productionCosts = 
      parseFloat(formData.seedCost) + 
      parseFloat(formData.fertilizerCost) + 
      parseFloat(formData.laborCost) + 
      parseFloat(formData.irrigationCost);
    
    const totalExpenses = productionCosts * parseFloat(formData.area);
    const netProfit = revenue - totalExpenses;
    const roi = totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0;

    const mockResult: YieldResult = {
      estimatedYield: estimatedYield,
      totalYield: Math.round(total),
      confidence: 85 + Math.floor(Math.random() * 10),
      revenue: Math.round(revenue),
      totalExpenses: Math.round(totalExpenses),
      netProfit: Math.round(netProfit),
      roi: Math.round(roi),
      factors: [
        { name: t('recommendations.nutrientInput'), impact: parseInt(formData.nitrogen) > 100 ? 'positive' : 'negative', value: 'High influence' },
        { name: t('recommendations.rainForecast'), impact: 'positive', value: 'Optimal range' },
        { name: t('yield.soils.loam'), impact: 'neutral', value: `Adapted to ${formData.soilType}` }
      ]
    };

    setResult(mockResult);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 premium-glow-blue">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calculator className="w-8 h-8 text-blue-600" />
          {t('yield.title')}
          {!farm && <span className="text-sm font-normal text-gray-500 ml-2">{t('yield.demoMode')}</span>}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('recommendations.crop')}</label>
                <select
                  name="cropType"
                  value={formData.cropType}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                >
                  <option value="Wheat">{t('yield.crops.wheat')}</option>
                  <option value="Rice">{t('yield.crops.rice')}</option>
                  <option value="Corn">{t('yield.crops.corn')}</option>
                  <option value="Soybean">{t('yield.crops.soybean')}</option>
                  <option value="Cotton">{t('yield.crops.cotton')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('yield.soils.loam')}</label>
                <select
                  name="soilType"
                  value={formData.soilType}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="Clay">{t('yield.soils.clay')}</option>
                  <option value="Sandy">{t('yield.soils.sandy')}</option>
                  <option value="Loam">{t('yield.soils.loam')}</option>
                  <option value="Silt">{t('yield.soils.silt')}</option>
                  <option value="Peat">{t('yield.soils.peat')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.area')} (ha)</label>
                <input
                  type="number"
                  name="area"
                  value={formData.area}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('recommendations.temp')}</label>
                <div className="relative">
                  <Thermometer className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleInputChange}
                    className="w-full pl-9 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('recommendations.rainForecast')} (mm)</label>
                <div className="relative">
                  <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    name="rainfall"
                    value={formData.rainfall}
                    onChange={handleInputChange}
                    className="w-full pl-9 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NPK Inputs */}
              <div className="col-span-1 md:col-span-2 space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-green-600" />
                  {t('recommendations.nutrientInput')}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nitrogen (N)</label>
                    <input
                      type="number"
                      name="nitrogen"
                      value={formData.nitrogen}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Phosphorus (P)</label>
                    <input
                      type="number"
                      name="phosphorus"
                      value={formData.phosphorus}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Potassium (K)</label>
                    <input
                      type="number"
                      name="potassium"
                      value={formData.potassium}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Commercial Inputs */}
            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 shadow-inner">
              <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5" />
                {t('yield.productionCost')} Analysis (₹/ha)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-blue-700/70 mb-1 uppercase tracking-wider">{t('yield.seedCost')}</label>
                  <input
                    type="number"
                    name="seedCost"
                    value={formData.seedCost}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-blue-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700/70 mb-1 uppercase tracking-wider">{t('yield.fertilizerCost')}</label>
                  <input
                    type="number"
                    name="fertilizerCost"
                    value={formData.fertilizerCost}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-blue-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700/70 mb-1 uppercase tracking-wider">{t('yield.laborCost')}</label>
                  <input
                    type="number"
                    name="laborCost"
                    value={formData.laborCost}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-blue-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700/70 mb-1 uppercase tracking-wider">{t('yield.irrigationCost')}</label>
                  <input
                    type="number"
                    name="irrigationCost"
                    value={formData.irrigationCost}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-blue-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5"
                  />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-100">
                <label className="block text-xs font-bold text-blue-900 mb-1 uppercase tracking-wider">{t('yield.marketPrice')} (₹/kg)</label>
                <input
                  type="number"
                  name="marketPrice"
                  value={formData.marketPrice}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-black text-lg py-3 text-blue-900"
                />
              </div>
            </div>

            <button
              onClick={calculateYield}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm italic active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {t('recommendations.calculating')}
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Predict Profitability & Yield
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 premium-glow-blue">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4 min-h-[300px]">
                <div className="bg-white p-4 rounded-full shadow-sm">
                  <TrendingUp className="w-12 h-12 text-blue-200" />
                </div>
                <p>{t('yield.predictionConfidence')}</p>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in relative z-10">
                <div className="text-center bg-white p-6 rounded-[32px] shadow-soft border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('yield.estimatedYield')}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-black text-prodmast-primary tracking-tighter">{result.estimatedYield}</span>
                    <span className="text-gray-400 font-bold text-sm tracking-tight">kg/ha</span>
                  </div>
                  <div className="w-12 h-1 bg-prodmast-accent mx-auto mt-4 rounded-full"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('yield.revenue')}</p>
                      <p className="text-xl font-black text-emerald-600">₹{result.revenue.toLocaleString()}</p>
                   </div>
                   <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('yield.totalExpenses')}</p>
                      <p className="text-xl font-black text-rose-500">₹{result.totalExpenses.toLocaleString()}</p>
                   </div>
                </div>

                <div className={`p-8 rounded-[40px] text-center border-2 transition-all duration-700 ${result.netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-2 text-opacity-70 text-prodmast-dark">{t('yield.netProfit')}</p>
                   <p className={`text-4xl font-black tracking-tighter mb-2 ${result.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ₹{result.netProfit.toLocaleString()}
                   </p>
                   <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${result.roi >= 0 ? 'bg-emerald-200/50 text-emerald-800' : 'bg-rose-200/50 text-rose-800'}`}>
                      {result.roi >= 0 ? <TrendingUp className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {result.roi}% ROI
                   </div>
                </div>

                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('yield.predictionConfidence')}</span>
                    <span className="text-xs font-black text-blue-600">{result.confidence}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 p-1 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all duration-1000 shadow-sm"
                      style={{ width: `${result.confidence}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('yield.influencingFactors')}</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {result.factors.map((factor, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-50 group hover:border-blue-200 transition-colors">
                        <span className="font-bold text-gray-600">{factor.name}</span>
                        <span className={`font-black uppercase tracking-widest text-[10px] px-2 py-1 rounded-lg ${factor.impact === 'positive' ? 'text-emerald-600 bg-emerald-50' :
                          factor.impact === 'negative' ? 'text-rose-600 bg-rose-50' : 'text-gray-400 bg-gray-50'
                          }`}>
                          {factor.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-prodmast-primary/95 p-6 rounded-[32px] text-sm text-white shadow-xl relative overflow-hidden group">
                  <Sprout className="w-12 h-12 absolute -right-2 -bottom-2 text-white/10 group-hover:scale-125 transition-transform duration-500" />
                  <div className="relative z-10 flex gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 font-black text-prodmast-accent">!</div>
                    <p className="font-bold leading-relaxed opacity-90">
                      {t('yield.tip')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
