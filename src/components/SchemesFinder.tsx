import { useState } from 'react';
import { 
  Building2, 
  Award, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Landmark,
  Search,
  Sparkles,
  X
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useFarm } from '../App';
import { motion, AnimatePresence } from 'framer-motion';

interface Scheme {
  id: string;
  name: string;
  provider: string;
  category: 'Fertilizer' | 'Water' | 'Financial' | 'Insurance' | 'Technology';
  eligibility: string[];
  benefits: string[];
  description: string;
  documentRequired: string[];
  matchScore: number;
  tags: string[];
  state: string;
  applicationUrl: string;
  lastDate: string; // ISO format: YYYY-MM-DD
  isNew?: boolean;
}

export function SchemesFinder() {
  const { t } = useLanguage();
  const { selectedFarm } = useFarm();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'All' | string>('All');
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);

  // Mock Database of Schemes (Focus on Karnataka/India)
  const schemes: Scheme[] = [
    {
      id: 'pm-kisan',
      name: 'PM-Kisan Samman Nidhi',
      provider: 'Central Government',
      category: 'Financial',
      eligibility: ['Small and marginal farmers', 'Landholding up to 2 hectares'],
      benefits: ['₹6,000 per year in 3 installments', 'Direct Bank Transfer'],
      description: 'A central sector scheme to provide income support to all landholding farmers families in the country.',
      documentRequired: ['Aadhaar Card', 'Land Records', 'Bank Passbook'],
      matchScore: selectedFarm && selectedFarm.area_hectares <= 2 ? 98 : 65,
      tags: ['Income Support', 'Universal'],
      state: 'All',
      applicationUrl: 'https://pmkisan.gov.in/',
      lastDate: '2026-12-31'
    },
    {
      id: 'krishi-bhagya',
      name: 'Krishi Bhagya Scheme',
      provider: 'Karnataka Government',
      category: 'Water',
      eligibility: ['Farmers in dry zone districts', 'Preference to SC/ST farmers'],
      benefits: ['Subsidy for Farm Ponds', 'Diesel Pumpsets at 50% cost', 'Polytunnels & Shadenets'],
      description: 'Integrated farming system aimed at improving the livelihood of farmers in rain-fed areas of Karnataka.',
      documentRequired: ['RTC / Pahani', 'Caste Certificate (if applicable)', 'Voter ID'],
      matchScore: 92,
      tags: ['Dry Land', 'Irrigation'],
      state: 'Karnataka',
      applicationUrl: 'https://raitamitra.karnataka.gov.in/info-3/Krishi+Bhagya/kn',
      lastDate: '2026-05-15',
      isNew: true
    },
    {
      id: 'pm-fasal-bima',
      name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      provider: 'Central Government',
      category: 'Insurance',
      eligibility: ['All farmers growing notified crops', 'Tenant farmers also eligible'],
      benefits: ['Low premium (1.5% to 5%)', 'Full sum insured for crop loss', 'Covers post-harvest losses'],
      description: 'Insurance service for farmers for their yields to provide financial support in case of crop failure.',
      documentRequired: ['Sowing Certificate', 'Land Record', 'Bank Account'],
      matchScore: 88,
      tags: ['Risk Coverage', 'Climate'],
      state: 'All',
      applicationUrl: 'https://pmfby.gov.in/',
      lastDate: '2026-07-31'
    },
    {
      id: 'karnataka-diesel',
      name: 'Raitha Vidyanidhi Scholarship',
      provider: 'Karnataka Government',
      category: 'Financial',
      eligibility: ['Children of farmers', 'Students pursuing higher education'],
      benefits: ['Scholarship up to ₹11,000/year', 'Support for education'],
      description: 'A unique scholarship program for children of farmers to encourage higher education.',
      documentRequired: ['Farmer ID (FRUITS ID)', 'Student ID Card'],
      matchScore: 75,
      tags: ['Education', 'Family Support'],
      state: 'Karnataka',
      applicationUrl: 'https://ssp.postmatric.karnataka.gov.in/',
      lastDate: '2026-08-15',
      isNew: true
    },
    {
      id: 'micro-irrigation',
      name: 'Pradhan Mantri Krishi Sinchai Yojana (PMKSY)',
      provider: 'Government of India',
      category: 'Water',
      eligibility: ['Farmers with existing water source', 'Focus on "Per Drop More Crop"'],
      benefits: ['90% subsidy on Drip/Sprinkler for Small Farmers', 'Water management training'],
      description: 'Enhancing physical access to water on farm and expanding cultivable area under assured irrigation.',
      documentRequired: ['Soil Test Report', 'Land Map', 'Dealer Quotation'],
      matchScore: selectedFarm ? 94 : 80,
      tags: ['Drip Irrigation', 'Sustainability'],
      state: 'All',
      applicationUrl: 'https://pmksy.gov.in/',
      lastDate: '2026-06-30'
    },
    {
      id: 'expired-test-scheme',
      name: 'Old Fertilizer Subsidy (Expired)',
      provider: 'Historical Data',
      category: 'Fertilizer',
      eligibility: ['N/A'],
      benefits: ['N/A'],
      description: 'This is a test case for an expired scheme that should be hidden.',
      documentRequired: [],
      matchScore: 20,
      tags: ['Legacy'],
      state: 'All',
      applicationUrl: '#',
      lastDate: '2025-12-31'
    }
  ];

  const filteredSchemes = schemes.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || s.category === filterCategory;
    const isExpired = new Date(s.lastDate) < new Date();
    return matchesSearch && matchesCategory && !isExpired;
  }).sort((a, b) => b.matchScore - a.matchScore);

  const categories = ['All', 'Financial', 'Water', 'Insurance', 'Technology'];

  return (
    <div className="space-y-8 pb-20 mt-10">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[40px] p-10 relative overflow-hidden shadow-2xl border border-white/10">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-400 p-2 rounded-xl">
               <Landmark className="w-6 h-6 text-indigo-900" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
               {t('schemes.title')}
            </h1>
          </div>
          <p className="text-indigo-100 text-lg font-medium max-w-2xl mb-8 opacity-80 leading-relaxed">
             {t('schemes.subtitle')}
          </p>

          <div className="flex flex-col md:flex-row gap-4 max-w-3xl">
             <div className="relative flex-grow">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
               <input 
                 type="text" 
                 placeholder="Search by name or benefit..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-indigo-300 focus:ring-2 focus:ring-amber-400 focus:outline-none backdrop-blur-md transition-all"
               />
             </div>
             <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shrink-0 overflow-x-auto no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-6 py-3 rounded-[14px] text-xs font-black uppercase tracking-widest transition-all ${filterCategory === cat ? 'bg-amber-400 text-indigo-900 shadow-lg' : 'text-indigo-100 hover:bg-white/10'}`}
                  >
                    {cat}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/20 rounded-full blur-[100px] translate-x-20 -translate-y-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full blur-[80px] -translate-x-10 translate-y-10"></div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredSchemes.map((scheme, idx) => (
            <motion.div
              key={scheme.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedScheme(scheme)}
              className="group cursor-pointer bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-indigo-200 transition-all duration-500 flex flex-col relative overflow-hidden"
            >
               {/* Match Score Indicator */}
               <div className="absolute top-0 right-0 p-8 text-right">
                  <div className="inline-block bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{t('schemes.matchScore')}</p>
                     <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span className="text-xl font-black text-indigo-900">{scheme.matchScore}%</span>
                     </div>
                  </div>
               </div>

               <div className="flex items-start gap-6 mb-8 pr-24">
                  <div className={`w-16 h-16 rounded-[14px] flex items-center justify-center shrink-0 border transition-all duration-500 ${scheme.category === 'Financial' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : scheme.category === 'Water' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex gap-2 mb-2">
                       {scheme.isNew && (
                         <span className="text-[9px] font-black uppercase tracking-widest bg-amber-400 text-indigo-900 px-2.5 py-1 rounded-md animate-pulse">
                           NEW
                         </span>
                       )}
                       {scheme.tags.map(tag => (
                         <span key={tag} className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md">
                           {tag}
                         </span>
                       ))}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{scheme.name}</h3>
                    <p className="text-sm font-bold text-gray-400 mt-1">{scheme.provider} • {scheme.state === 'All' ? 'Central' : scheme.state}</p>
                  </div>
               </div>

               <p className="text-gray-500 font-medium text-sm leading-relaxed mb-8 flex-grow">
                  {scheme.description}
               </p>

               <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                    <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                       <Clock className="w-4 h-4" />
                       Closes: {new Date(scheme.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className="flex items-center gap-1.5">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                       Verified
                    </span>
                  </div>
                  <button className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                    {t('schemes.applyNow')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedScheme && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xl">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white w-full max-w-3xl rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-8 sm:p-12 overflow-hidden relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedScheme(null)}
                className="absolute top-6 right-6 w-12 h-12 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 transition-colors border border-gray-100 z-20"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
                    <div className="bg-indigo-600 p-4 rounded-3xl shadow-xl shadow-indigo-100 relative">
                       <Award className="w-10 h-10 text-white" />
                       {selectedScheme.isNew && (
                         <span className="absolute -top-2 -right-2 bg-amber-400 text-indigo-900 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter">New</span>
                       )}
                    </div>
                    <div>
                       <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{selectedScheme.name}</h2>
                       <div className="flex items-center gap-3">
                         <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs">{selectedScheme.provider}</p>
                         <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                         <p className="text-amber-600 font-black uppercase tracking-widest text-[10px]">Apply by {new Date(selectedScheme.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                       </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-8">
                     <div>
                       <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          {t('schemes.eligibility')}
                       </h4>
                       <ul className="space-y-3">
                         {selectedScheme.eligibility.map((item, i) => (
                           <li key={i} className="flex gap-3 text-sm font-medium text-gray-500 leading-relaxed">
                              <span className="w-5 h-5 flex items-center justify-center bg-gray-50 rounded-full shrink-0 border border-gray-100 mt-0.5">•</span>
                              {item}
                           </li>
                         ))}
                       </ul>
                     </div>
                     <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-blue-500" />
                          {t('schemes.documents')}
                       </h4>
                       <div className="flex flex-wrap gap-2">
                          {selectedScheme.documentRequired.map(doc => (
                             <span key={doc} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold border border-blue-100">
                                {doc}
                             </span>
                          ))}
                       </div>
                     </div>
                   </div>

                   <div className="space-y-8">
                     <div className="bg-indigo-50/50 rounded-[32px] p-8 border border-indigo-100 shadow-inner">
                       <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-500" />
                          {t('schemes.benefits')}
                       </h4>
                       <ul className="space-y-4">
                         {selectedScheme.benefits.map((benefit, i) => (
                           <li key={i} className="flex gap-3 text-indigo-900/80 font-bold text-sm leading-relaxed">
                              <ArrowRight className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                              {benefit}
                           </li>
                         ))}
                       </ul>
                     </div>
                   </div>
                </div>

                <div className="mt-12 pt-10 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="flex -space-x-3">
                         {[1,2,3].map(i => (
                           <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="Farmer" />
                           </div>
                         ))}
                      </div>
                      <p className="text-xs font-bold text-gray-400">
                         <span className="text-slate-900 font-extrabold">12.5k+</span> farmers applied this month
                      </p>
                   </div>
                   <button 
                     onClick={() => window.open(selectedScheme.applicationUrl, '_blank')}
                     className="w-full sm:w-auto bg-slate-900 text-white font-black px-10 py-5 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs italic"
                   >
                      Start Application Now
                   </button>
                </div>
              </div>

              {/* Success BG Decor */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full blur-[80px] translate-x-20 -translate-y-20 -z-0"></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
