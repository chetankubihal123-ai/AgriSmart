import { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Search, Tag, ShoppingCart, Plus, Minus, ArrowRight, Activity, Filter, ChevronRight, Star } from 'lucide-react';
import { CheckoutModal } from '../components/CheckoutModal';
import { useCart } from '../contexts/CartContext';

export function Shop() {
    const { addToCart, totalItems, totalPrice, items } = useCart();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const categories = ['All', 'Seeds', 'Nutrients', 'Farming Equipment'];

    const CROPS = [
        { id: 'Tomato', nameEN: 'Tomato', nameKN: 'ಟೊಮೆಟೊ', icon: 'https://cdn-icons-png.flaticon.com/512/1202/1202125.png' },
        { id: 'Chilli', nameEN: 'Chilli', nameKN: 'ಮೆಣಸಿನಕಾಯಿ', icon: '/images/crops/chilli.png' },
        { id: 'Onion', nameEN: 'Onion', nameKN: 'ಈರುಳ್ಳಿ', icon: '/images/crops/onion.png' },
        { id: 'Maize', nameEN: 'Maize', nameKN: 'ಮೆಕ್ಕೆಜೋಳ', icon: '/images/crops/maize.png' },
        { id: 'Okra', nameEN: 'Okra', nameKN: 'ಬೆಂಡೆಕಾಯಿ', icon: '/images/crops/okra.png' },
        { id: 'Brinjal', nameEN: 'Brinjal', nameKN: 'ಬದನೆಕಾಯಿ', icon: '/images/crops/brinjal.png' },
        { id: 'Cabbage', nameEN: 'Cabbage', nameKN: 'ಕೋಸು', icon: '/images/crops/cabbage.png' },
        { id: 'Cucumber', nameEN: 'Cucumber', nameKN: 'ಸೌತೆಕಾಯಿ', icon: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&q=80&w=200' },
    ];

    const STATIC_CATALOG = [
        // Tomato Crop
        { id: 's1', brand: 'Syngenta', name: 'Saaho (TO-3251) Tomato Seeds (ಸ್ಯಾಹೋ ಟೊಮೆಟೊ ಬೀಜ)', category: 'Seeds', crop: 'Tomato', price: 999, originalPrice: 1525, discount: 34, unit: '3500 seeds', image: 'https://images.unsplash.com/photo-1592841608277-33d2f837a962?auto=format&fit=crop&q=80&w=600' },
        { id: 's2', brand: 'Seminis', name: 'Abhilash Tomato Seeds (ಅಭಿಲಾಶ್ ಟೊಮೆಟೊ ಬೀಜ)', category: 'Seeds', crop: 'Tomato', price: 707, originalPrice: 813, discount: 13, unit: '10 gms', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600' },
        { id: 's3', brand: 'Syngenta', name: 'Heemsohna Tomato Seeds (ಹೀಮಸೋನಾ ಟೊಮೆಟೊ)', category: 'Seeds', crop: 'Tomato', price: 1065, originalPrice: 1231, discount: 13, unit: '3500 seeds', image: 'https://images.unsplash.com/photo-1590139704851-f0439bb752ee?auto=format&fit=crop&q=80&w=600' },
        { id: 'n1', brand: 'Bayer', name: 'Antracol Fungicide (ಪರಾಗಸ್ಪರ್ಶ ಕೀಟನಾಶಕ)', category: 'Nutrients', crop: 'Tomato', price: 273, originalPrice: 350, discount: 22, unit: '250 gms', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=600' },
        { id: 'n2', brand: 'Geolife', name: 'No-Virus Immunity Booster (ನೋ-ವೈರಸ್ ರೋಗನಿರೋಧಕ)', category: 'Nutrients', crop: 'Tomato', price: 369, originalPrice: 850, discount: 57, unit: '250 ml', image: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=600' },
        { id: 'n3', brand: 'Biostadt', name: 'Roko Fungicide (ರೋಕೋ ಶಿಲೀಂಧ್ರನಾಶಕ)', category: 'Nutrients', crop: 'Tomato', price: 352, originalPrice: 450, discount: 22, unit: '250 gms', image: 'https://images.unsplash.com/photo-1589365278144-c9e7059c43ba?auto=format&fit=crop&q=80&w=600' },
        { id: 'n4', brand: 'Bayer', name: 'Velum Prime Nematicide (ವೆಲಮ್ ಪ್ರೈಮ್)', category: 'Nutrients', crop: 'Tomato', price: 2223, originalPrice: 2920, discount: 24, unit: '250 ml', image: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&q=80&w=600' },
        
        // Chilli Crop
        { id: 'c1', brand: 'Syngenta', name: 'Royal Bullet Chilli Seeds (ರಾಯಲ್ ಬುಲೆಟ್ ಮೆಣಸಿನಕಾಯಿ)', category: 'Seeds', crop: 'Chilli', price: 677, originalPrice: 781, discount: 13, unit: '1500 seeds', image: '/images/products/green-chilli.png' },
        { id: 'c2', brand: 'Syngenta', name: 'HPH 5531 Chilli Seeds (ಮೆಣಸಿನಕಾಯಿ ಬೀಜ)', category: 'Seeds', crop: 'Chilli', price: 698, originalPrice: 961, discount: 27, unit: '1500 seeds', image: '/images/products/green-chilli.png' },
        { id: 'c3', brand: 'Nunhems', name: 'Armour F1 Chilli Seeds (ಆರ್ಮರ್ ಎಫ್ 1 ಮೆಣಸಿನಕಾಯಿ)', category: 'Seeds', crop: 'Chilli', price: 822, originalPrice: 1139, discount: 28, unit: '1500 seeds', image: '/images/products/green-chilli.png' },
        { id: 'c4', brand: 'VNR', name: 'VNR 145 Chilli Seeds (ವಿಎನ್ಆರ್ 145 ಮೆಣಸಿನಕಾಯಿ)', category: 'Seeds', crop: 'Chilli', price: 543, originalPrice: 720, discount: 25, unit: '10 gms', image: '/images/products/green-chilli.png' },
        { id: 'c5', brand: 'Nunhems', name: 'US 341 Chilli Seeds (ಯುಎಸ್ 341 ಮೆಣಸಿನಕಾಯಿ)', category: 'Seeds', crop: 'Chilli', price: 649, originalPrice: 871, discount: 25, unit: '1500 seeds', image: '/images/products/green-chilli.png' },
        { id: 'c6', brand: 'Rudraksh', name: 'Rudra 101 Chilli Seeds (ರುದ್ರ 101 ಮೆಣಸಿನಕಾಯಿ)', category: 'Seeds', crop: 'Chilli', price: 570, originalPrice: 1000, discount: 43, unit: '10 gms', image: '/images/products/green-chilli.png' },
        
        // Onion Crop
        { id: 'o1', brand: 'Seminis', name: 'Gulmohar Onion Seeds (ಗುಲ್ಮೊಹರ್ ಈರುಳ್ಳಿ ಬೀಜ)', category: 'Seeds', crop: 'Onion', price: 1585, originalPrice: 1689, discount: 6, unit: '500 gms', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600' },
        { id: 'o2', brand: 'Rudraksh', name: 'Onion Glory Seeds (ಈರುಳ್ಳಿ ಗ್ಲೋರಿ ಬೀಜ)', category: 'Seeds', crop: 'Onion', price: 2000, originalPrice: 3200, discount: 38, unit: '1000 gms', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600' },
        { id: 'o3', brand: 'East West', name: 'Prerana Onion Seeds (ಪ್ರೇರಣಾ ಈರುಳ್ಳಿ ಬೀಜ)', category: 'Seeds', crop: 'Onion', price: 1569, originalPrice: 2050, discount: 23, unit: '500 gms', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600' },
        { id: 'o4', brand: 'URJA Seeds', name: 'Urja Kalyani Onion (ಉರ್ಜಾ ಕಲ್ಯಾಣಿ ಈರುಳ್ಳಿ)', category: 'Seeds', crop: 'Onion', price: 350, originalPrice: 650, discount: 46, unit: '25 gms', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600' },
        { id: 'o5', brand: 'URJA Seeds', name: 'Urja Red Cosmo Onion (ರೆಡ್ ಕಾಸ್ಮೊ ಈರುಳ್ಳಿ)', category: 'Seeds', crop: 'Onion', price: 325, originalPrice: 600, discount: 46, unit: '25 gms', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600' },
        { id: 'o6', brand: 'Rudraksh', name: 'Fursungi Onion Seeds (ಫುರ್ಸುಂಗಿ ಈರುಳ್ಳಿ)', category: 'Seeds', crop: 'Onion', price: 2400, originalPrice: 2640, discount: 9, unit: '1 kg', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600' },
        
        // Brinjal & Others
        { id: 'b1', brand: 'VNR', name: 'VNR 212 Brinjal Seeds (ಬದನೆ ಬೀಜ)', category: 'Seeds', crop: 'Brinjal', price: 179, originalPrice: 240, discount: 25, unit: '10 gms', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600' },
        { id: 'b2', brand: 'VNR', name: 'VNR Haruna Bottle Gourd (ಹವಳ ಕಾಯಿ ಬೀಜ)', category: 'Seeds', crop: 'Brinjal', price: 399, originalPrice: 540, discount: 26, unit: '50 gms', image: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&q=80&w=600' },
        { id: 'k1', brand: 'VNR', name: 'Krish Cucumber Seeds (ಸೌತೆಕಾಯಿ ಬೀಜ)', category: 'Seeds', crop: 'Cucumber', price: 349, originalPrice: 480, discount: 27, unit: '10 gms', image: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&q=80&w=600' },
        { id: 'k2', brand: 'Advanta', name: 'Raadhika Bhindi Hybrid (ಬೆಂಡೆಕಾಯಿ ಬೀಜ)', category: 'Seeds', crop: 'Okra', price: 679, originalPrice: 990, discount: 31, unit: '1500 seeds', image: 'https://images.unsplash.com/photo-1627440221741-2a265675e2f7?auto=format&fit=crop&q=80&w=600' },
        
        // Plant Nutrition
        { id: 'pn1', brand: 'Coromandel', name: 'Fantac Plus Growth Promoter (ಫಾಂಟಾಕ್ ಪ್ಲಸ್)', category: 'Nutrients', price: 259, originalPrice: 430, discount: 40, unit: '100 ml', image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=600' },
        { id: 'pn2', brand: 'Syngenta', name: 'Isabion Biostimulant (ಇಸಾಬಿಯಾನ್ ಬಯೋ)', category: 'Nutrients', price: 174, originalPrice: 225, discount: 23, unit: '100 ml', image: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=600' },
        { id: 'pn3', brand: 'Katyayani', name: 'Copper Edta + Molybdenum (ಕಾಪರ್ ಎಡ್ತಾ)', category: 'Nutrients', price: 399, originalPrice: 850, discount: 53, unit: '70 gms', image: 'https://images.unsplash.com/photo-1584281723351-4e7fa0692795?auto=format&fit=crop&q=80&w=600' },
        { id: 'pn4', brand: 'Multiplex', name: 'General Liquid Micronutrient (ಲಿಕ್ವಿಡ್ ಮೈಕ್ರೊ)', category: 'Nutrients', price: 114, originalPrice: 170, discount: 33, unit: '200 ml', image: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=600' },
        { id: 'pn5', brand: 'Multiplex', name: 'Allbor Boron 20% (ಮಲ್ಟಿಪ್ಲೆಕ್ಸ್ ಬೋರಾನ್)', category: 'Nutrients', price: 176, originalPrice: 270, discount: 35, unit: '250 gms', image: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&q=80&w=600' },
        { id: 'pn6', brand: 'Multiplex', name: 'Samras Biostimulant (ಸಮ್ರಾಸ್ ಬಯೋ)', category: 'Nutrients', price: 363, originalPrice: 470, discount: 23, unit: '500 ml', image: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=600' },
        
        // Farming Equipment
        { id: 'eq1', brand: 'Sickle Innovations', name: 'Mango Picker Without Pole (ಮಾವಿನ ಮಷೀನ್)', category: 'Farming Equipment', price: 540, originalPrice: 599, discount: 10, unit: '1 unit', image: 'https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&q=80&w=600' },
        { id: 'eq2', brand: 'Bharat Agrotech', name: 'Bharat Goa Akadi (ಅಕಡಿ ಕುಡುಗೋಲು)', category: 'Farming Equipment', price: 355, originalPrice: 499, discount: 29, unit: '1 unit', image: 'https://images.unsplash.com/photo-1589923158776-cb4485d99fd6?auto=format&fit=crop&q=80&w=600' },
        { id: 'eq3', brand: 'Siddhi Agritech', name: 'Drip Kit 1000m (ಹನಿ ನೀರಾವರಿ ಕಿಟ್)', category: 'Farming Equipment', price: 3600, originalPrice: 3999, discount: 10, unit: '1000m', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600' },
        { id: 'eq4', brand: 'Vinspire Agrotech', name: 'Chaff Cutter Machine (ಚಾಫ್ ಕಟರ್ ಯಂತ್ರ)', category: 'Farming Equipment', price: 27500, originalPrice: 28000, discount: 2, unit: '1 unit', image: 'https://images.unsplash.com/photo-1533219057257-4bb9ed5d2cc6?auto=format&fit=crop&q=80&w=600' },
        { id: 'eq5', brand: 'Anil Packaging', name: 'Weed Mat 100 GSM (ಕಳೆ ನಿಯಂತ್ರಣ ಚಾಪೆ)', category: 'Farming Equipment', price: 3900, originalPrice: 4000, discount: 3, unit: '1 unit', image: 'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?auto=format&fit=crop&q=80&w=600' },
        { id: 'eq6', brand: 'Anil Packaging', name: 'Mulching Sheet Kiran (ಮಲ್ಚಿಂಗ್ ಶೀಟ್)', category: 'Farming Equipment', price: 2400, originalPrice: 2999, discount: 20, unit: '20 micron', image: 'https://images.unsplash.com/photo-1589923158776-cb4485d99fd6?auto=format&fit=crop&q=80&w=600' },
        { id: 'eq7', brand: 'Tapas', name: 'Pahalwaan 101 Sprayer (ಟಪಾಸ್ ಸ್ಪ್ರೇಯರ್)', category: 'Farming Equipment', price: 2599, originalPrice: 4999, discount: 48, unit: '1 unit', image: 'https://images.unsplash.com/photo-1561553543-e4c7b608b98d?auto=format&fit=crop&q=80&w=600' },
        { id: 'eq8', brand: 'Snap Exports', name: 'Neptune Knapsack Sprayer (ನೆಪ್ಚೂನ್ ಸ್ಪ್ರೇಯರ್)', category: 'Farming Equipment', price: 4200, originalPrice: 6000, discount: 30, unit: '1 unit', image: 'https://images.unsplash.com/photo-1561553543-e4c7b608b98d?auto=format&fit=crop&q=80&w=600' },
    ];

    useEffect(() => {
        setLoading(false);
    }, []);

    const filteredProducts = useMemo(() => {
        return STATIC_CATALOG.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 p.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
            const matchesCrop = !selectedCrop || p.crop === selectedCrop;
            return matchesSearch && matchesCategory && matchesCrop;
        });
    }, [searchQuery, selectedCategory, selectedCrop]);

    const getCategoryBanner = () => {
        if (selectedCategory === 'Nutrients') return 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=1200';
        if (selectedCategory === 'Seeds') return 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=1200';
        if (selectedCategory === 'Farming Equipment') return 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=1200';
        return 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&q=80&w=1200';
    };

    return (
        <div className="space-y-10 pb-32">
            {/* Hero Header Section */}
            <div className="relative rounded-[40px] overflow-hidden group shadow-2xl transition-all duration-700">
                <div className="absolute inset-0 z-0">
                    <img src={getCategoryBanner()} alt="Shop Header" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-r from-prodmast-dark/95 via-prodmast-dark/70 to-transparent"></div>
                </div>
                
                <div className="relative z-10 px-12 py-20 lg:py-24">
                    <div className="flex items-center gap-3 mb-6 bg-prodmast-accent/20 backdrop-blur-xl w-fit px-5 py-2 rounded-2xl border border-white/20 shadow-xl">
                        <Tag className="w-4 h-4 text-prodmast-accent" />
                        <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Official Brand Partner</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-sans font-extrabold text-white mb-6 tracking-tighter leading-tight italic">
                        Agri<span className="text-prodmast-accent">Market</span>
                    </h1>
                    <p className="text-gray-200 text-lg font-medium max-w-2xl leading-relaxed opacity-90 drop-shadow-md">
                        {selectedCategory === 'All' 
                            ? 'The largest online destination for certified Nutrients, Seeds, and Equipment. Reliable, branded, and delivered at best prices.' 
                            : `Browse our massive catalog of premium ${selectedCategory.toLowerCase()} from trusted global brands.`}
                    </p>
                </div>
            </div>

            {/* Shop By Crop Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div>
                        <h2 className="text-2xl font-extrabold text-prodmast-dark tracking-tight">Shop By Crop 🌾</h2>
                        <p className="text-gray-500 text-sm font-medium italic">Get solutions customized for your crops.</p>
                    </div>
                    <button onClick={() => { setSelectedCrop(null); setSelectedCategory('All'); }} className="text-prodmast-primary font-black text-sm hover:underline flex items-center gap-1 uppercase tracking-widest italic outline-none">
                        View All <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-hide no-scrollbar px-2">
                    {CROPS.map((crop) => (
                        <button
                            key={crop.id}
                            onClick={() => {
                                setSelectedCrop(selectedCrop === crop.id ? null : crop.id);
                                if (selectedCrop !== crop.id) setSelectedCategory('All');
                            }}
                            className={`flex flex-col items-center gap-3 group transition-all shrink-0 outline-none`}
                        >
                            <div className={`w-28 h-28 rounded-full flex items-center justify-center border-[3px] p-4 transition-all ${
                                selectedCrop === crop.id 
                                ? 'bg-prodmast-accent/10 border-prodmast-accent shadow-2xl scale-110' 
                                : 'bg-white border-gray-100 hover:border-prodmast-primary/50'
                            }`}>
                                <img src={crop.icon} alt={crop.nameEN} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-center">
                                <p className={`text-[11px] font-black uppercase tracking-widest ${selectedCrop === crop.id ? 'text-prodmast-primary underline underline-offset-4 decoration-2' : 'text-gray-500'}`}>{crop.nameEN}</p>
                                <p className={`text-[10px] font-bold ${selectedCrop === crop.id ? 'text-prodmast-primary/70' : 'text-gray-400'}`}>{crop.nameKN}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white border border-gray-100 p-8 rounded-[32px] shadow-sm sticky top-4 z-30 mx-2">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-8 py-3.5 rounded-2xl font-black transition-all text-xs whitespace-nowrap uppercase tracking-widest border-2 outline-none ${
                                selectedCategory === cat 
                                ? 'bg-prodmast-dark text-white border-prodmast-dark shadow-xl shadow-prodmast-dark/30 transform -translate-y-1' 
                                : 'bg-gray-50 text-gray-400 border-transparent hover:border-prodmast-primary/50 hover:text-prodmast-primary hover:bg-white'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="relative group w-full lg:w-96">
                    <Search className="w-5 h-5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2 group-hover:text-prodmast-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search Coragen, Seeds, Tools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-14 pr-8 py-4.5 w-full bg-gray-50 border border-gray-100 rounded-2xl text-[13px] font-bold focus:ring-4 focus:ring-prodmast-primary/10 focus:border-prodmast-primary outline-none transition-all shadow-inner placeholder:text-gray-400"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <div key={n} className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 animate-pulse">
                            <div className="w-full h-56 bg-gray-100 rounded-[24px] mb-6"></div>
                            <div className="h-6 bg-gray-100 rounded-lg w-3/4 mb-4"></div>
                            <div className="h-4 bg-gray-100 rounded-lg w-1/2 mb-8"></div>
                            <div className="h-12 bg-gray-100 rounded-xl w-full"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredProducts.map((product) => {
                        const cartItem = items.find(i => i.product.id === product.id);
                        return (
                            <div key={product.id} className="bg-white rounded-[28px] p-4 shadow-sm hover:shadow-2xl border border-gray-100 transition-all duration-500 group flex flex-col h-full relative overflow-hidden">
                                {/* Discount Badge */}
                                {product.discount && (
                                    <div className="absolute top-6 left-6 z-10">
                                        <div className="bg-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg transform -rotate-3 transition-transform group-hover:rotate-0">
                                            {product.discount}% OFF
                                        </div>
                                    </div>
                                )}
                                
                                {/* Product Image Area */}
                                <div className="relative w-full h-52 bg-gray-50 rounded-[24px] mb-6 overflow-hidden border border-gray-100/50">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-cover p-0 group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute top-4 right-4">
                                        <div className="p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg text-gray-400 hover:text-rose-500 hover:bg-white transition-all cursor-pointer border border-white/20">
                                            <Activity className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                {/* Info Area */}
                                <div className="flex-1 flex flex-col px-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black text-prodmast-primary uppercase tracking-[0.2em]">{product.brand}</span>
                                        <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
                                            <span className="text-[10px] font-black text-green-600">4.4</span>
                                            <Star className="w-2.5 h-2.5 text-green-600 fill-green-600" />
                                        </div>
                                    </div>
                                    <h3 className="text-[14px] font-extrabold text-prodmast-dark mb-2 group-hover:text-prodmast-primary transition-colors line-clamp-3 leading-snug tracking-tight min-h-[42px]" title={product.name}>
                                        {product.name}
                                    </h3>
                                    
                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">Size: {product.unit}</span>
                                        {product.crop && (
                                            <span className="text-[10px] font-black text-prodmast-primary/70 uppercase tracking-widest bg-prodmast-primary/5 px-2.5 py-1 rounded-lg border border-prodmast-primary/10 transition-all group-hover:bg-prodmast-accent group-hover:text-prodmast-primary group-hover:border-prodmast-primary/20">
                                                {product.crop}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-end justify-between mb-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-prodmast-dark tracking-tighter">
                                                    ₹{product.price.toLocaleString()}
                                                </span>
                                                {product.originalPrice && (
                                                    <span className="text-[13px] font-bold text-gray-400 line-through">₹{product.originalPrice.toLocaleString()}</span>
                                                )}
                                            </div>
                                            {product.originalPrice && (
                                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mt-0.5">
                                                    <span className="bg-green-100 px-1 rounded">Save ₹{(product.originalPrice - product.price).toLocaleString()}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {cartItem ? (
                                        <div className="flex items-center justify-between bg-prodmast-primary/5 rounded-2xl p-1.5 border border-prodmast-primary/10 scale-in shadow-inner">
                                            <button 
                                                onClick={() => addToCart(product as any, -1)}
                                                className="w-11 h-11 flex items-center justify-center bg-white rounded-xl shadow-md text-prodmast-primary hover:bg-prodmast-primary hover:text-white transition-all active:scale-90"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="font-black text-prodmast-dark text-lg px-4">{cartItem.quantity}</span>
                                            <button 
                                                onClick={() => addToCart(product as any, 1)}
                                                className="w-11 h-11 flex items-center justify-center bg-white rounded-xl shadow-md text-prodmast-primary hover:bg-prodmast-primary hover:text-white transition-all active:scale-90"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => addToCart(product as any, 1)}
                                            className="w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 bg-prodmast-primary text-white hover:bg-prodmast-dark hover:scale-[1.02] shadow-xl shadow-prodmast-primary/20 active:scale-95 italic"
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                            Add to Cart
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredProducts.length === 0 && (
                <div className="py-32 flex flex-col items-center justify-center text-center px-4 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 border border-gray-100">
                        <Filter className="w-10 h-10 text-prodmast-primary opacity-30" />
                    </div>
                    <h3 className="text-2xl font-black text-prodmast-dark mb-4 tracking-tight">No Products Found</h3>
                    <p className="text-gray-500 font-medium max-w-sm leading-relaxed mb-8">
                        We don't have these items for {selectedCrop ? selectedCrop : 'this category'} yet. Try exploring other crops or clearing your filters.
                    </p>
                    <button 
                        onClick={() => { setSelectedCrop(null); setSelectedCategory('All'); setSearchQuery(''); }}
                        className="px-10 py-5 bg-prodmast-primary text-white font-black rounded-2xl shadow-xl hover:bg-prodmast-dark transition-all uppercase text-[11px] tracking-widest italic"
                    >
                        Clear All Filters
                    </button>
                </div>
            )}

            {/* Sticky Checkout Bar */}
            {totalItems > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl animate-in slide-in-from-bottom-10 h-fit">
                    <div className="glass-card-dark p-4 md:p-6 flex items-center justify-between gap-6 border-prodmast-accent/30 bg-prodmast-primary/95 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl rounded-[32px]">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="w-16 h-16 bg-prodmast-accent/20 rounded-2xl flex items-center justify-center border border-prodmast-accent/30">
                                    <ShoppingBag className="w-8 h-8 text-prodmast-accent" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-white text-prodmast-primary rounded-full flex items-center justify-center text-[13px] font-black shadow-2xl ring-4 ring-prodmast-primary">
                                    {totalItems}
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-[10px] font-black text-prodmast-accent uppercase tracking-widest mb-1 opacity-80">Cart Subtotal</p>
                                <p className="text-3xl font-black text-white tracking-tighter">₹{totalPrice.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right sm:hidden">
                                <p className="text-2xl font-black text-white tracking-tighter">₹{totalPrice.toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => setIsCheckoutOpen(true)}
                                className="px-10 py-5 bg-prodmast-accent text-prodmast-primary font-black rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-prodmast-accent/30 uppercase text-xs tracking-widest italic"
                            >
                                Checkout Now
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
            />
        </div>
    );
}
