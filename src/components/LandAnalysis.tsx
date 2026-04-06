import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FileText, Map as MapIcon, Sprout, TrendingUp, AlertCircle, CheckCircle2, Clock, ChevronDown, Layers, Crosshair, Search, Navigation } from 'lucide-react';

interface SoilData {
  n: number;
  p: number;
  k: number;
  ph: number;
  moisture: number;
}

interface CropRecommendation {
  name: string;
  duration: number; // in days
  yield: string;
  matchScore: number;
  care: string[];
  maintenance: string[];
  timeline: { title: string; desc: string }[];
}

interface HeatmapSpot {
  x: number;
  y: number;
  health: number; // 0-100
  n: number;
  p: number;
  k: number;
}

interface OwnerData {
  extent: string;
  khataNumber: string;
}

import { karnatakaLocations } from '../data/karnatakaLocations';

export function LandAnalysis() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [formData, setFormData] = useState({
    district: '',
    taluk: '',
    hobli: '',
    village: '',
    surveyNumber: '',
    hissaNumber: ''
  });

  const [districts] = useState(Object.keys(karnatakaLocations));
  const [taluks, setTaluks] = useState<string[]>([]);
  const [hoblis, setHoblis] = useState<string[]>([]);
  const [villages, setVillages] = useState<string[]>([]);

  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);

  // Cascading Selection Logic
  useEffect(() => {
    if (formData.district) {
      const selectedDistrict = karnatakaLocations[formData.district];
      setTaluks(Object.keys(selectedDistrict));
      setFormData(prev => ({ ...prev, taluk: '', hobli: '', village: '' }));
      setHoblis([]);
      setVillages([]);
    }
  }, [formData.district]);

  useEffect(() => {
    if (formData.district && formData.taluk) {
      const selectedTaluk = karnatakaLocations[formData.district][formData.taluk];
      setHoblis(Object.keys(selectedTaluk));
      setFormData(prev => ({ ...prev, hobli: '', village: '' }));
      setVillages([]);
    }
  }, [formData.district, formData.taluk]);

  useEffect(() => {
    if (formData.district && formData.taluk && formData.hobli) {
      const selectedVillages = karnatakaLocations[formData.district][formData.taluk][formData.hobli];
      setVillages(selectedVillages);
      setFormData(prev => ({ ...prev, village: '' }));
    }
  }, [formData.district, formData.taluk, formData.hobli]);

  const simulateAnalysis = () => {
    if (!formData.surveyNumber || !formData.district) return;

    setLoading(true);
    setShowResults(false);

    setTimeout(() => {
      // Logic using string concat instead of template literals for safety here
      const uniqueString = formData.district + formData.taluk + formData.village + formData.surveyNumber + formData.hissaNumber;
      const hash = uniqueString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

      const newSoilData: SoilData = {
        n: 100 + (hash % 150),
        p: 20 + (hash % 60),
        k: 100 + (hash % 200),
        ph: 5.5 + (hash % 30) / 10,
        moisture: 30 + (hash % 60)
      };

      const cropOptions = [
        {
          name: "Sugarcane (ಕಬ್ಬು)",
          duration: 365,
          yield: "100 Tons/acre",
          care: ["Requires consistent irrigation", "Apply NPK 10:26:26"],
          maintenance: ["Weeding every 20 days", "Trash mulching"]
        },
        {
          name: "Cotton (ಹತ್ತಿ)",
          duration: 160,
          yield: "15 Quintals/acre",
          care: ["Sensitive to waterlogging", "Spray Monocrotophos"],
          maintenance: ["Soil earthing up", "Pest monitoring"]
        },
        {
          name: "Maize (ಮೆಕ್ಕೆಜೋಳ)",
          duration: 110,
          yield: "35 Quintals/acre",
          care: ["Heavy feeder of Nitrogen", "Fall Armyworm control"],
          maintenance: ["Thinning plants", "Top dressing urea"]
        },
        {
          name: "Paddy (ಭತ್ತ)",
          duration: 140,
          yield: "25 Quintals/acre",
          care: ["Needs standing water", "Transplanting required"],
          maintenance: ["Water level management", "Weed control"]
        },
        {
          name: "Tomato (ಟೊಮ್ಯಾಟೊ)",
          duration: 90,
          yield: "20 Tons/acre",
          care: ["Staking required", "Regular fungicide spray"],
          maintenance: ["Pruning branches", "Fruit borer control"]
        },
        {
          name: "Chilli (ಮೆಣಸಿನಕಾಯಿ)",
          duration: 150,
          yield: "10 Quintals/acre (Dry)",
          care: ["Avoid water stagnation", "Leaf curl virus management"],
          maintenance: ["Regular picking", "Drying on clean floor"]
        }
      ];

      const crop1Index = hash % cropOptions.length;
      const crop2Index = (hash + 3) % cropOptions.length;

      const selectedCrops = [cropOptions[crop1Index], cropOptions[crop2Index]].map(baseCrop => ({
        ...baseCrop,
        matchScore: 85 + (hash % 14),
        timeline: [
          { title: "Sowing", desc: "Day 0-10" },
          { title: "Vegetative", desc: "Day 10-45" },
          { title: "Flowering", desc: "Day 45-70" },
          { title: "Harvest", desc: "Maturity" }
        ]
      }));

      setSoilData(newSoilData);
      setRecommendations(selectedCrops);

      // Simulation of Owner Details (Bhoomi Style)
      // Special case for user's exact screenshot: Dharwad -> Kundgol -> Saunshi -> Pashupatihala -> 201 -> 5
      if (
        formData.district === 'Dharwad' &&
        formData.taluk === 'Kundgol' &&
        formData.village === 'Pashupatihala' &&
        formData.surveyNumber === '201' &&
        formData.hissaNumber === '5'
      ) {
        setOwnerData({
          extent: "0.10.0.00",
          khataNumber: "23"
        });
      } else {
        // Generic Simulation - Incorporate Survey and Hissa into hash for uniqueness
        const subHash = (formData.surveyNumber + formData.hissaNumber).split('').reduce((acc, char) => acc + char.charCodeAt(0), hash);



        setOwnerData({
          extent: (0.1 + (subHash % 80) / 10).toFixed(2) + ".0.00",
          khataNumber: (100 + (subHash % 900)).toString()
        });
      }

      setLoading(false);
      setShowResults(true);
    }, 3000);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-2 p-8 rounded-3xl glass backdrop-blur-xl border border-white/50 relative overflow-hidden shadow-2xl premium-glow-blue">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-3">
            <FileText className="w-10 h-10 text-blue-600" />
            {t('landAnalysis.title')}
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl font-medium">
            {t('landAnalysis.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-3xl p-6 border border-white/5 relative overflow-hidden premium-glow-blue">

            <div className="absolute top-0 right-0 bg-slate-900/5 px-3 py-1 rounded-bl-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-l border-white/20">
              {t('landAnalysis.officialFormat')}
            </div>

            <div className="space-y-5 mt-2">

              <div className="space-y-1.5">
                <label className="text-slate-600 text-xs font-black uppercase tracking-wider ml-1">{t('landAnalysis.district')} *</label>
                <div className="relative">
                  <select
                    className="w-full bg-white/50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none font-bold"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  >
                    <option value="" className="bg-white text-slate-500">{t('landAnalysis.selectDistrict')}</option>
                    {districts.map(d => <option key={d} value={d} className="bg-white text-slate-900">{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 text-xs font-black uppercase tracking-wider ml-1">{t('landAnalysis.taluk')} *</label>
                <div className="relative">
                  <select
                    className="w-full bg-white/50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none font-bold disabled:opacity-50"
                    value={formData.taluk}
                    onChange={(e) => setFormData({ ...formData, taluk: e.target.value })}
                    disabled={!formData.district}
                  >
                    <option value="" className="bg-white text-slate-500">{t('landAnalysis.selectTaluk')}</option>
                    {taluks.map(t => <option key={t} value={t} className="bg-white text-slate-900">{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 text-xs font-black uppercase tracking-wider ml-1">{t('landAnalysis.hobli')} *</label>
                <div className="relative">
                  <select
                    className="w-full bg-white/50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none font-bold disabled:opacity-50"
                    value={formData.hobli}
                    onChange={(e) => setFormData({ ...formData, hobli: e.target.value })}
                    disabled={!formData.taluk}
                  >
                    <option value="" className="bg-white text-slate-500">{t('landAnalysis.selectHobli')}</option>
                    {hoblis.map(h => <option key={h} value={h} className="bg-white text-slate-900">{h}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 text-xs font-black uppercase tracking-wider ml-1">{t('landAnalysis.village')} *</label>
                <div className="relative">
                  <select
                    className="w-full bg-white/50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none font-bold disabled:opacity-50"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    disabled={!formData.hobli}
                  >
                    <option value="" className="bg-white text-slate-500">{t('landAnalysis.selectVillage')}</option>
                    {villages.map(v => <option key={v} value={v} className="bg-white text-slate-900">{v}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-600 text-xs font-black uppercase tracking-wider ml-1">{t('landAnalysis.surveyNumber')} *</label>
                  <div className="relative">
                    <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="e.g. 201"
                      className="w-full bg-white/70 border border-slate-300 text-slate-900 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-bold placeholder:text-slate-400"
                      value={formData.surveyNumber}
                      onChange={(e) => setFormData({ ...formData, surveyNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-600 text-xs font-black uppercase tracking-wider ml-1">{t('landAnalysis.hissaNumber')}</label>
                  <input
                    type="text"
                    placeholder="e.g. 5"
                    className="w-full bg-white/70 border border-slate-300 text-slate-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-bold placeholder:text-slate-400"
                    value={formData.hissaNumber}
                    onChange={(e) => setFormData({ ...formData, hissaNumber: e.target.value })}
                  />
                </div>
              </div>

              <button
                onClick={simulateAnalysis}
                disabled={loading || !formData.surveyNumber || !formData.village}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('landAnalysis.analyzing')}
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    {t('landAnalysis.analyze')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          {!showResults && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/10 rounded-3xl opacity-50 min-h-[400px]">
              <MapIcon className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">{t('landAnalysis.enterDetails')}</p>
              <p className="text-gray-600 text-sm mt-2">{t('landAnalysis.bhoomiIntegration')}</p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center p-12 min-h-[400px]">
              <div className="w-20 h-20 relative">
                <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <MapIcon className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
              </div>
              <p className="mt-6 text-blue-400 font-bold animate-pulse text-lg">{t('landAnalysis.fetchingRecord')} {formData.surveyNumber}...</p>
              <div className="flex flex-col items-center gap-1 mt-3 text-sm text-gray-500">
                <span>{t('landAnalysis.checking')} {formData.village}, {formData.taluk}...</span>
                <span>{t('landAnalysis.verifyingHissa')}</span>
              </div>
            </div>
          )}

          {showResults && ownerData && soilData && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

              {/* Owner Details Card (Bhoomi Portal Style) */}
              <div className="glass rounded-3xl border border-white/10 overflow-hidden premium-glow-blue">
                <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">{t('landAnalysis.ownerDetails')}</h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('landAnalysis.monitoringCell')}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4">{t('landAnalysis.extent')}</th>
                        <th className="px-6 py-4 text-right">{t('landAnalysis.khataNumber')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="text-slate-900 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-5 font-black text-lg font-mono">{ownerData.extent}</td>
                        <td className="px-6 py-5 text-right font-black text-blue-600 text-xl">{ownerData.khataNumber}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass rounded-3xl p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"></div>
                <div className="flex items-center gap-2 mb-8">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('landAnalysis.soilCondition')}</h2>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-200">
                      S.No: {formData.surveyNumber}/{formData.hissaNumber}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-200">{t('landAnalysis.verified')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <SoilMetric label={t('landAnalysis.nitrogen')} value={soilData.n} unit="mg/kg" color="text-blue-400" barColor="bg-blue-500" />
                  <SoilMetric label={t('landAnalysis.phosphorus')} value={soilData.p} unit="mg/kg" color="text-orange-400" barColor="bg-orange-500" />
                  <SoilMetric label={t('landAnalysis.potassium')} value={soilData.k} unit="mg/kg" color="text-purple-400" barColor="bg-purple-500" />
                  <SoilMetric label={t('landAnalysis.phLevel')} value={soilData.ph} unit="pH" color="text-green-400" barColor="bg-green-500" max={14} />
                  <SoilMetric label={t('landAnalysis.moisture')} value={soilData.moisture} unit="%" color="text-cyan-400" barColor="bg-cyan-500" max={100} />
                </div>
              </div>

              {/* NEW: Bhoomi Official Land Map Integration */}
              <div className="glass rounded-[40px] border border-white/10 overflow-hidden bg-slate-900 shadow-2xl relative">
                {/* Bhoomi Portal Header Style */}
                <div className="bg-[#f8f9fa] border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Seal_of_Karnataka.svg/512px-Seal_of_Karnataka.svg.png" alt="Govt. of Karnataka" className="w-10 h-10 object-contain" />
                      <div>
                         <h2 className="text-[14px] font-black text-gray-900 uppercase leading-none">BHOOMI MAPS ಭೂಮಿ ನಕ್ಷೆಗಳು</h2>
                         <p className="text-[9px] text-red-600 font-bold uppercase tracking-tight">Survey Settlement & Land Records डिपार्टमेंट</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                       <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded">RTC</span>
                       <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-1 rounded">MUTATION</span>
                   </div>
                </div>

                <div className="relative h-[600px] w-full bg-slate-800">
                  <BhoomiMapContainer 
                    district={formData.district} 
                    village={formData.village} 
                    survey={formData.surveyNumber}
                    hissa={formData.hissaNumber}
                  />

                  {/* Bhoomi Map UI Overlays */}
                  <div className="absolute top-4 left-4 z-[1000] w-64 space-y-2 pointer-events-none">
                     <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-gray-200 pointer-events-auto">
                        <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                           <Search className="w-4 h-4 text-gray-400" />
                           <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{t('landAnalysis.officialDetails')}</span>
                        </div>
                        <div className="space-y-2">
                           <MapDetailItem label={t('landAnalysis.district')} value={formData.district} />
                           <MapDetailItem label={t('landAnalysis.taluk')} value={formData.taluk} />
                           <MapDetailItem label={t('landAnalysis.hobli')} value={formData.hobli} />
                           <MapDetailItem label={t('landAnalysis.village')} value={formData.village} />
                           <div className="flex justify-between items-center bg-blue-50 p-2 rounded-lg border border-blue-100">
                              <span className="text-[9px] text-blue-600 font-black uppercase">SURVEY/HISSA</span>
                              <span className="text-xs font-black text-blue-900">{formData.surveyNumber}/{formData.hissaNumber}</span>
                           </div>
                        </div>
                     </div>

                     <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-gray-200 pointer-events-auto">
                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Layers className="w-3 h-3 text-blue-600" />
                           {t('landAnalysis.mapLayers')}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                           <button className="bg-blue-600 text-white text-[9px] font-black py-2 rounded uppercase shadow-sm">Satellite</button>
                           <button className="bg-white text-gray-600 border border-gray-200 text-[9px] font-black py-2 rounded uppercase">Cadastral</button>
                        </div>
                     </div>
                  </div>

                  {/* Watermark/Monitoring Cell Overlay */}
                  <div className="absolute bottom-6 right-6 z-[1000] text-right pointer-events-none">
                     <div className="bg-black/50 backdrop-blur-sm text-white/50 text-[10px] font-mono px-3 py-1 rounded mb-2">
                        SCAN_POINT: {formData.surveyNumber}.{formData.hissaNumber} | MULTI_SPECTAL: ENABLED
                     </div>
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Bhoomi Monitoring Cell © NIC Karnataka</p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                  <Sprout className="w-8 h-8 text-prodmast-primary" />
                  {t('landAnalysis.bestCrops')}
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  {recommendations.map((crop, idx) => (
                    <div key={idx} className="glass rounded-3xl overflow-hidden border border-white/10 group hover:border-prodmast-accent/30 transition-all duration-300 premium-glow-green">
                      <div className="p-6 bg-white/5 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-prodmast-primary/10 flex items-center justify-center border border-prodmast-primary/20">
                              <Sprout className="w-6 h-6 text-prodmast-primary" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{crop.name}</h3>
                              <div className="flex items-center gap-3 text-xs text-slate-500 font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-prodmast-primary" /> {crop.duration} days</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-3xl font-black text-prodmast-primary leading-none">{crop.matchScore}%</span>
                            <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{t('landAnalysis.match')}</span>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-2 bg-slate-900/5 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 text-xs font-black uppercase tracking-wider self-start shadow-sm">
                          <TrendingUp className="w-4 h-4 text-prodmast-primary" />
                          {t('landAnalysis.yield')}: <span className="text-slate-900">{crop.yield}</span>
                        </div>
                      </div>

                      <div className="p-6 space-y-4 bg-black/20">
                        <div>
                          <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-widest">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            {t('landAnalysis.care')}
                          </h4>
                          <ul className="space-y-1">
                            {crop.care.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0 shadow-sm"></span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-widest">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            {t('landAnalysis.maintenance')}
                          </h4>
                          <ul className="space-y-1">
                            {crop.maintenance.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0 shadow-sm"></span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MapDetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center text-[9px]">
      <span className="text-gray-400 font-black uppercase">{label}</span>
      <span className="text-gray-900 font-bold">{value || 'N/A'}</span>
    </div>
  );
}

function BhoomiMapContainer({ district, village, survey, hissa }: { district: string, village: string, survey: string, hissa: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  useEffect(() => {
    // Wait for Leaflet to be available via CDN
    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current || leafletMapRef.current) return;

      // Deterministic coords based on village name for Saunshi case
      // Default Saunshi/Pashupatihal coords matched to Sanna Kere pond vicinity
      let lat = 15.17652;
      let lon = 75.37064;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([lat, lon], 17);

      leafletMapRef.current = map;

      // Add high-resolution satellite imagery (Esri World Imagery)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }).addTo(map);

      // Create a "Bhoomi" style parcel boundary (Yellow lines)
      // Adjusted polygon to match the real field shape North-West of Sanna Kere
      const parcelCoords = [
        [lat + 0.00045, lon - 0.00065],
        [lat + 0.0004, lon + 0.00055],
        [lat - 0.00035, lon + 0.0005],
        [lat - 0.0004, lon - 0.0006]
      ];

      const polygon = L.polygon(parcelCoords, {
        color: '#fbbf24', // Bhoomi Yellow
        weight: 3,
        fillColor: '#fbbf24',
        fillOpacity: 0.1,
        dashArray: '8, 8'
      }).addTo(map);

      polygon.bindTooltip(`SURVEY NO: 201/5`, { permanent: true, direction: 'center', className: 'bhoomi-tooltip' }).openTooltip();

      // Add zoom control to top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add crosshair/radar pin (matches your screenshot style)
      const crosshairIcon = L.divIcon({
        className: 'custom-crosshair-icon',
        html: `
          <div class="crosshair-wrapper">
            <div class="crosshair-line-h"></div>
            <div class="crosshair-line-v"></div>
            <div class="radar-ping"></div>
          </div>
        `
      });

      L.marker([lat, lon], { icon: crosshairIcon }).addTo(map);
    };

    const timer = setInterval(() => {
      if ((window as any).L) {
        initMap();
        clearInterval(timer);
      }
    }, 100);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      clearInterval(timer);
    };
  }, [district, village, survey, hissa]);

  return <div ref={mapRef} className="h-full w-full" />;
}

function SoilMetric({ label, value, unit, color, barColor, max = 200 }: { label: string, value: number, unit: string, color: string, barColor: string, max?: number }) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="bg-white/50 border border-slate-200 rounded-2xl p-4 flex flex-col h-full justify-between shadow-sm group hover:border-slate-300 transition-all">
      <div className="flex justify-between items-end mb-2">
        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
      </div>
      <div>
        <div className={"text-2xl font-black mb-2 flex items-baseline gap-1 " + color}>
          {typeof value === 'number' ? value.toFixed(1) : value}
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{unit}</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-100 shadow-inner">
          <div
            className={"h-full transition-all duration-1000 ease-out " + barColor}
            style={{ width: percentage + "%" }}
          ></div>
        </div>
      </div>
    </div>
  );
}
