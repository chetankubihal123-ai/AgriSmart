import { useState } from 'react';
import { Farm } from '../lib/types';
import { Droplet, Leaf, Beaker, Sprout, Wind, ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface RecommendationsProps {
  farm?: Farm;
}

type Tab = 'fertilizer' | 'irrigation';

interface FertilizerRec {
  fertilizer: string;
  quantity: string;
  reason: string;
  frequency: string;
}

interface IrrigationRec {
  schedule: string;
  amount: string;
  method: string;
  nextWatering: string;
}

export function Recommendations({ farm: _farm }: RecommendationsProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('fertilizer');
  const [loading, setLoading] = useState(false);

  // Fertilizer Form State
  const [fertForm, setFertForm] = useState({
    crop: 'Wheat',
    stage: 'Vegetative',
    nitrogen: '',
    phosphorus: '',
    potassium: ''
  });
  const [fertResult, setFertResult] = useState<FertilizerRec | null>(null);

  // Irrigation Form State
  const [irrigationForm, setIrrigationForm] = useState({
    crop: 'Wheat',
    soilMoisture: '',
    rainForecast: 'No Rain',
    temperature: '25'
  });
  const [irrigationResult, setIrrigationResult] = useState<IrrigationRec | null>(null);

  const handleGetFertilizerRec = async () => {
    setLoading(true);
    setFertResult(null);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock Logic
    let rec: FertilizerRec = {
      fertilizer: 'N-P-K 20-20-20',
      quantity: '50 kg/ha',
      reason: 'Balanced nutrients needed for early growth.',
      frequency: 'Apply every 2-3 weeks'
    };

    if (parseInt(fertForm.nitrogen) < 100) {
      rec = {
        fertilizer: 'Urea (46-0-0)',
        quantity: '40 kg/ha',
        reason: 'Low Nitrogen detected. Urea provides a quick nitrogen boost essential for leaf development.',
        frequency: 'Apply immediately, then monitor'
      };
    } else if (fertForm.stage === 'Flowering') {
      rec = {
        fertilizer: 'Superphosphate',
        quantity: '60 kg/ha',
        reason: 'Phosphorus boost is critical during flowering for fruit set.',
        frequency: 'Single application'
      };
    }

    setFertResult(rec);
    setLoading(false);
  };

  const handleGetIrrigationRec = async () => {
    setLoading(true);
    setIrrigationResult(null);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock Logic
    const moisture = parseInt(irrigationForm.soilMoisture);
    let rec: IrrigationRec;

    if (moisture < 30) {
      rec = {
        schedule: 'Daily early morning',
        amount: '15mm per day',
        method: 'Drip Irrigation',
        nextWatering: 'Tomorrow 6:00 AM'
      };
    } else if (moisture > 70) {
      rec = {
        schedule: 'Hold watering',
        amount: '0mm',
        method: 'None',
        nextWatering: 'Check again in 3 days'
      };
    } else {
      rec = {
        schedule: 'Every 3 days',
        amount: '10mm per session',
        method: 'Sprinkler',
        nextWatering: 'In 2 days'
      };
    }

    setIrrigationResult(rec);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden premium-glow-amber">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('fertilizer')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 ${activeTab === 'fertilizer'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Leaf className="w-5 h-5" />
              {t('recommendations.fertilizerAdvice')}
            </button>
            <button
              onClick={() => setActiveTab('irrigation')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 ${activeTab === 'irrigation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Droplet className="w-5 h-5" />
              {t('recommendations.irrigationPlanner')}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'fertilizer' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                  <Beaker className="w-6 h-6 text-prodmast-primary" />
                  {t('recommendations.nutrientInput')}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('recommendations.crop')}</label>
                    <select
                      value={fertForm.crop}
                      onChange={(e) => setFertForm({ ...fertForm, crop: e.target.value })}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-gray-900"
                    >
                      <option value="Wheat">{t('weather.crops.wheat')}</option>
                      <option value="Rice">{t('weather.crops.rice')}</option>
                      <option value="Corn">{t('weather.crops.corn')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('recommendations.growthStage')}</label>
                    <select
                      value={fertForm.stage}
                      onChange={(e) => setFertForm({ ...fertForm, stage: e.target.value })}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    >
                      <option value="Seeding">{t('recommendations.stages.seeding')}</option>
                      <option value="Vegetative">{t('recommendations.stages.vegetative')}</option>
                      <option value="Flowering">{t('recommendations.stages.flowering')}</option>
                      <option value="Ripening">{t('recommendations.stages.ripening')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">N (kg/ha)</label>
                    <input
                      type="number"
                      placeholder="120"
                      value={fertForm.nitrogen}
                      onChange={(e) => setFertForm({ ...fertForm, nitrogen: e.target.value })}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">P (kg/ha)</label>
                    <input
                      type="number"
                      placeholder="50"
                      value={fertForm.phosphorus}
                      onChange={(e) => setFertForm({ ...fertForm, phosphorus: e.target.value })}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">K (kg/ha)</label>
                    <input
                      type="number"
                      placeholder="40"
                      value={fertForm.potassium}
                      onChange={(e) => setFertForm({ ...fertForm, potassium: e.target.value })}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGetFertilizerRec}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition"
                >
                  {loading ? t('recommendations.analyzing') : t('recommendations.getRecommendation')}
                </button>
              </div>

              <div className="bg-green-50 rounded-xl p-6 border border-green-100 premium-glow-green">
                {!fertResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 opacity-60">
                    <Leaf className="w-16 h-16 mb-4" />
                    <p>{t('recommendations.enterDetails')}</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-white p-2 rounded-full shadow-sm">
                        <Sprout className="w-8 h-8 text-prodmast-primary" />
                      </div>
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('recommendations.recommendedAction')}</h4>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                      <p className="text-sm text-gray-500 mb-1">{t('recommendations.recommendedFertilizer')}</p>
                      <p className="text-xl font-bold text-green-700">{fertResult.fertilizer}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-green-100">
                        <p className="text-xs text-gray-500">{t('recommendations.quantity')}</p>
                        <p className="font-semibold text-gray-900">{fertResult.quantity}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-green-100">
                        <p className="text-xs text-gray-500">{t('recommendations.frequency')}</p>
                        <p className="font-semibold text-gray-900">{fertResult.frequency}</p>
                      </div>
                    </div>

                    <div className="bg-green-100 p-3 rounded-lg text-sm text-green-800 flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>{fertResult.reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                  <Droplet className="w-6 h-6 text-blue-600" />
                  {t('recommendations.waterClimateInput')}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('recommendations.currentMoisture')}</label>
                  <input
                    type="number"
                    placeholder="e.g. 45"
                    value={irrigationForm.soilMoisture}
                    onChange={(e) => setIrrigationForm({ ...irrigationForm, soilMoisture: e.target.value })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ideal range is typically 60-80%</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('recommendations.rainForecast')}</label>
                    <select
                      value={irrigationForm.rainForecast}
                      onChange={(e) => setIrrigationForm({ ...irrigationForm, rainForecast: e.target.value })}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="No Rain">{t('weather.stable')}</option>
                      <option value="Light Rain">{t('weather.status.good')}</option>
                      <option value="Heavy Rain">{t('weather.heavyRain')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('recommendations.temp')}</label>
                    <input
                      type="number"
                      value={irrigationForm.temperature}
                      onChange={(e) => setIrrigationForm({ ...irrigationForm, temperature: e.target.value })}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGetIrrigationRec}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  {loading ? t('recommendations.calculating') : t('recommendations.getPlan')}
                </button>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 premium-glow-blue">
                {!irrigationResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 opacity-60">
                    <Wind className="w-16 h-16 mb-4" />
                    <p>{t('recommendations.enterMoisture')}</p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('recommendations.irrigationSchedule')}</h4>
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">
                        {t('recommendations.active')}
                      </span>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                        <p className="text-sm text-gray-500">{t('recommendations.nextWatering')}</p>
                        <p className="text-xl font-bold text-blue-600 flex items-center gap-2">
                          {irrigationResult.nextWatering}
                          <ArrowRight className="w-4 h-4" />
                        </p>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-gray-100">
                        <div className="p-4">
                          <p className="text-xs text-gray-500 mb-1">{t('recommendations.amount')}</p>
                          <p className="font-semibold text-gray-900">{irrigationResult.amount}</p>
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-gray-500 mb-1">{t('recommendations.method')}</p>
                          <p className="font-semibold text-gray-900">{irrigationResult.method}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-sm text-blue-800 bg-blue-100/50 p-3 rounded-lg">
                      <Droplet className="w-5 h-5 flex-shrink-0" />
                      <p>
                        {t('recommendations.adjustedSchedule').replace('{{forecast}}', irrigationForm.rainForecast)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
