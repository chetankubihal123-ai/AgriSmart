import { useState, useEffect } from 'react';
import { ShoppingBag, Search, Tag, Sprout, ShoppingCart, Plus, Minus, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import { CheckoutModal } from '../components/CheckoutModal';
import { useCart } from '../contexts/CartContext';

export function Shop() {
    const { addToCart, totalItems, totalPrice, items } = useCart();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Checkout state
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const categories = ['All', 'Seeds', 'Pesticide', 'Tools', 'Sprayers', 'Fertilizer'];

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             p.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryBanner = () => {
        if (selectedCategory === 'Pesticide') return 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=1200';
        if (selectedCategory === 'Seeds') return 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=1200';
        if (selectedCategory === 'Tools') return 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=1200';
        if (selectedCategory === 'Sprayers') return 'https://images.unsplash.com/photo-1561553543-e4c7b608b98d?auto=format&fit=crop&q=80&w=1200';
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
                            ? 'The largest online destination for certified Pesticides, Seeds, and Equipment. Reliable, branded, and delivered at best prices.' 
                            : `Browse our massive catalog of premium ${selectedCategory.toLowerCase()} from trusted global brands.`}
                    </p>
                </div>
            </div>

            {/* Filter and Search Bar Overhaul */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white border border-gray-100 p-8 rounded-[32px] shadow-sm sticky top-4 z-30 mx-2">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-8 py-3.5 rounded-2xl font-black transition-all text-xs whitespace-nowrap uppercase tracking-widest border-2 ${
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
                        placeholder="Search for Coragen, Saaho Tomato..."
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
                            <div key={product.id} className="bg-white rounded-[24px] p-4 shadow-sm hover:shadow-2xl border border-gray-100 transition-all duration-500 group flex flex-col h-full relative overflow-hidden">
                                {/* Product Image Area */}
                                <div className="relative w-full h-48 bg-gray-50 rounded-[20px] mb-6 overflow-hidden border border-gray-50">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                                            <Sprout className="w-12 h-12" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest text-prodmast-primary border border-gray-100 shadow-xl">
                                            {product.category}
                                        </div>
                                    </div>
                                </div>

                                {/* Info Area */}
                                <div className="flex-1 flex flex-col px-1">
                                    <h3 className="text-[15px] font-extrabold text-prodmast-dark mb-1 group-hover:text-prodmast-primary transition-colors line-clamp-2 leading-tight tracking-tight" title={product.name}>
                                        {product.name}
                                    </h3>
                                    
                                    <div className="flex items-center justify-between mb-6 mt-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</span>
                                            <span className="text-xl font-black text-prodmast-dark tracking-tighter">
                                                ₹{product.price.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Stock</span>
                                            <span className="text-xs font-black text-green-600 flex items-center gap-1.5">
                                                {product.stock_quantity}
                                            </span>
                                        </div>
                                    </div>

                                    {cartItem ? (
                                        <div className="flex items-center justify-between bg-prodmast-primary/5 rounded-xl p-1 border border-prodmast-primary/10">
                                            <button 
                                                onClick={() => addToCart(product, -1)}
                                                className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-prodmast-primary hover:bg-prodmast-primary hover:text-white transition-all"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="font-black text-prodmast-dark px-4">{cartItem.quantity}</span>
                                            <button 
                                                onClick={() => addToCart(product, 1)}
                                                className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-prodmast-primary hover:bg-prodmast-primary hover:text-white transition-all"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => addToCart(product, 1)}
                                            className="w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 bg-prodmast-primary text-white hover:bg-prodmast-dark hover:scale-[1.02] shadow-lg shadow-prodmast-primary/20"
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

            {/* Sticky Checkout Bar */}
            {totalItems > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl animate-in slide-in-from-bottom-10 h-fit">
                    <div className="glass-card-dark p-4 md:p-6 flex items-center justify-between gap-6 border-prodmast-accent/30 bg-prodmast-primary/90">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="w-14 h-14 bg-prodmast-accent/20 rounded-2xl flex items-center justify-center border border-prodmast-accent/30">
                                    <ShoppingBag className="w-7 h-7 text-prodmast-accent" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-7 h-7 bg-white text-prodmast-primary rounded-full flex items-center justify-center text-xs font-black shadow-xl ring-4 ring-prodmast-primary">
                                    {totalItems}
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-[10px] font-black text-prodmast-accent uppercase tracking-widest mb-1">Cart Subtotal</p>
                                <p className="text-2xl font-black text-white tracking-tighter">₹{totalPrice.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right sm:hidden">
                                <p className="text-xl font-black text-white tracking-tighter">₹{totalPrice.toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => setIsCheckoutOpen(true)}
                                className="px-8 py-4 bg-prodmast-accent text-prodmast-primary font-black rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-prodmast-accent/20 uppercase text-xs tracking-widest italic"
                            >
                                Checkout Now
                                <ArrowRight className="w-4 h-4" />
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
