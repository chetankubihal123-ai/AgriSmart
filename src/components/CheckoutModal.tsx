import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, Loader2, ShoppingBag, MapPin, Phone, User, CreditCard, ChevronRight, ChevronLeft, Wallet, Truck, ShoppingCart, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type CheckoutStep = 'summary' | 'shipping' | 'payment';

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
    const { user } = useAuth();
    const { items, totalItems, totalPrice, clearCart } = useCart();

    const [step, setStep] = useState<CheckoutStep>('summary');
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'phonepe' | 'gpay' | 'card' | 'cod'>('cod');
    
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-fill user info
    React.useEffect(() => {
        if (user && isOpen) {
            if (!name) setName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
            if (!phone && user.phone) {
                const cleanPhone = user.phone.replace('+91', '').replace(/\D/g, '').slice(-10);
                setPhone(cleanPhone);
            }
        }
    }, [user, isOpen]);

    const handleUseLiveLocation = () => {
        if (!('geolocation' in navigator)) return;
        
        setFetchingLocation(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                const data = await res.json();
                
                const parts = [
                    data.locality,
                    data.city,
                    data.principalSubdivision,
                    data.postcode
                ].filter(Boolean);
                
                setAddress(parts.join(', '));
            } catch (e) {
                console.error('Geocoding error:', e);
            } finally {
                setFetchingLocation(false);
            }
        }, () => setFetchingLocation(false));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || items.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Insert master order
            let orderResult = await supabase
                .from('orders')
                .insert({
                    user_id: user.id,
                    customer_name: name,
                    delivery_address: address,
                    phone_number: phone,
                    total_amount: totalPrice,
                    payment_method: paymentMethod,
                    status: 'pending'
                })
                .select()
                .single();

            // Fallback: If inserting with payment_method fails (column missing), try without it
            if (orderResult.error && orderResult.error.message.includes('payment_method')) {
                console.warn('Database "payment_method" column missing. Falling back to basic order.');
                orderResult = await supabase
                    .from('orders')
                    .insert({
                        user_id: user.id,
                        customer_name: name,
                        delivery_address: address,
                        phone_number: phone,
                        total_amount: totalPrice,
                        status: 'pending'
                    })
                    .select()
                    .single();
            }

            if (orderResult.error) throw new Error(orderResult.error.message);
            const orderData = orderResult.data;

            // 2. Insert all order items
            const orderItems = items.map(item => ({
                order_id: orderData.id,
                product_id: item.product.id,
                quantity: item.quantity,
                price_at_time: item.product.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) console.error('Order Items insertion failed:', itemsError);

            // 3. Update stock for all products
            for (const item of items) {
                try {
                    const { error: stockError } = await supabase.rpc('decrement_stock', {
                        prod_id: item.product.id,
                        dec_amount: item.quantity
                    });
                    
                    if (stockError) {
                        // Fallback to manual update
                        await supabase
                            .from('products')
                            .update({ stock_quantity: Math.max(0, item.product.stock_quantity - item.quantity) })
                            .eq('id', item.product.id);
                    }
                } catch (err) {
                    console.warn(`Stock update failed for ${item.product.name}:`, err);
                }
            }

            // 4. Send Confirmation Email (Bulletproof Iframe Method)
            try {
                if (orderData) {
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = 'https://formsubmit.co/chetankubihal123@gmail.com';
                    form.target = 'hidden-email-frame';
                    
                    const data: any = {
                        _subject: `New Order from AgriMarket: #${orderData.id.slice(0, 8)}`,
                        Customer: name,
                        Phone: phone,
                        Address: address,
                        Payment_Method: paymentMethod.toUpperCase(),
                        Total_Items: totalItems,
                        Order_Total: `₹${totalPrice.toLocaleString()}`,
                        Items: items.map(i => `${i.product.name} (x${i.quantity})`).join(', '),
                        _template: 'box',
                        _captcha: 'false'
                    };

                    for (const key in data) {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = key;
                        input.value = data[key];
                        form.appendChild(input);
                    }

                    const iframe = document.createElement('iframe');
                    iframe.name = 'hidden-email-frame';
                    iframe.style.display = 'none';
                    document.body.appendChild(iframe);
                    document.body.appendChild(form);
                    form.submit();
                    
                    console.log('✅ Email dispatch initiated via hidden form.');
                    
                    // Cleanup
                    setTimeout(() => {
                        document.body.removeChild(form);
                        document.body.removeChild(iframe);
                    }, 2000);
                }
            } catch (e) {
                console.warn('❌ Email dispatch setup error:', e);
            }

            setSuccess(true);
            clearCart();
        } catch (err: any) {
            console.error('Order Error:', err);
            setError(err.message || "Failed to place order. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    if (success) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <div className="bg-white rounded-[40px] w-full max-w-md p-10 text-center shadow-2xl relative overflow-hidden border border-prodmast-primary/10">
                    {/* Confetti Explosion */}
                    <div className="absolute inset-0 pointer-events-none">
                        {[...Array(30)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ top: '50%', left: '50%', scale: 0 }}
                                animate={{ 
                                    top: `${Math.random() * 100}%`, 
                                    left: `${Math.random() * 100}%`,
                                    scale: [0, 1, 0],
                                    rotate: Math.random() * 360
                                }}
                                transition={{ 
                                    duration: 2 + Math.random() * 2,
                                    repeat: Infinity,
                                    ease: "easeOut"
                                }}
                                className="absolute w-2 h-2 rounded-sm"
                                style={{ 
                                    backgroundColor: ['#142F32', '#E3FFCC', '#FFD700', '#4ade80'][i % 4]
                                }}
                            />
                        ))}
                    </div>

                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", damping: 12 }}
                        className="relative z-10"
                    >
                        <div className="w-24 h-24 bg-green-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner ring-8 ring-green-50/50">
                            <CheckCircle className="w-12 h-12 text-green-500" />
                        </div>
                        
                        <h2 className="text-3xl font-black text-prodmast-dark mb-2 tracking-tighter">Order Success!</h2>
                        
                        {/* Truck Animation */}
                        <div className="flex justify-center mb-6 overflow-hidden w-full h-8 relative">
                            <motion.div
                                animate={{ x: [-100, 400] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="text-prodmast-primary flex items-center gap-2"
                            >
                                <Truck size={24} />
                                <div className="h-0.5 w-12 bg-prodmast-primary/20" />
                            </motion.div>
                        </div>

                        <p className="text-prodmast-muted font-bold text-sm leading-relaxed mb-6 px-4">
                            Your high-quality farming supplies are on the way! Thank you for choosing AgriSmart.
                        </p>
                        
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-10 mx-4">
                            <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Action Required</p>
                            <p className="text-[10px] font-bold text-blue-500 leading-tight">
                                Check your <span className="text-blue-700 underline">Spam Folder</span> for an activation email. You must click 'Activate' once to receive orders.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setSuccess(false);
                                setStep('summary');
                                onClose();
                            }}
                            className="w-full bg-prodmast-primary text-white font-black py-5 rounded-[24px] hover:bg-prodmast-dark transition-all shadow-xl shadow-prodmast-primary/30 uppercase tracking-widest text-xs italic active:scale-95"
                        >
                            Return to Shop
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-white/20">
                
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-prodmast-primary/5">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-prodmast-primary/10 shadow-sm">
                            <ShoppingBag className="w-7 h-7 text-prodmast-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-prodmast-dark tracking-tighter italic">Secure Checkout</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`h-1.5 w-8 rounded-full ${step === 'summary' ? 'bg-prodmast-primary' : 'bg-gray-200'}`} />
                                <span className={`h-1.5 w-8 rounded-full ${step === 'shipping' ? 'bg-prodmast-primary' : 'bg-gray-200'}`} />
                                <span className={`h-1.5 w-8 rounded-full ${step === 'payment' ? 'bg-prodmast-primary' : 'bg-gray-200'}`} />
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white text-gray-400 hover:text-prodmast-dark rounded-xl transition-all shadow-sm border border-gray-100">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl border border-red-100 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            {error}
                        </div>
                    )}

                    {step === 'summary' && (
                        <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black text-prodmast-muted uppercase tracking-widest italic">Order Summary</h3>
                                <span className="text-xs font-bold text-prodmast-primary bg-prodmast-primary/10 px-3 py-1 rounded-full">{totalItems} items</span>
                            </div>
                            <div className="space-y-3">
                                {items.map(item => (
                                    <div key={item.product.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:border-prodmast-primary/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100 p-2 overflow-hidden">
                                                {item.product.image_url ? (
                                                    <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <Truck className="w-6 h-6 text-gray-200" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-prodmast-dark text-sm leading-tight">{item.product.name}</h4>
                                                <p className="text-[10px] font-bold text-prodmast-muted mt-1 uppercase tracking-wider">Qty: {item.quantity}</p>
                                            </div>
                                        </div>
                                        <p className="font-black text-prodmast-primary tracking-tighter italic">₹{(item.product.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 bg-prodmast-primary mt-8 rounded-3xl shadow-xl shadow-prodmast-primary/20 flex items-center justify-between text-white">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Total Payable</p>
                                    <p className="text-3xl font-black tracking-tighter italic">₹{totalPrice.toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={() => setStep('shipping')}
                                    className="bg-white text-prodmast-primary px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-lg"
                                >
                                    Shipping Info
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'shipping' && (
                        <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
                            <h3 className="text-sm font-black text-prodmast-muted uppercase tracking-widest italic px-2">Delivery Details</h3>
                            <div className="grid gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-prodmast-muted uppercase tracking-[0.2em] mb-2 px-1 flex items-center gap-2">
                                        <User className="w-3 h-3" /> Full Name
                                    </label>
                                    <input
                                        type="text" required value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-prodmast-primary/10 focus:border-prodmast-primary outline-none transition-all placeholder:text-gray-300"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-prodmast-muted uppercase tracking-[0.2em] mb-2 px-1 flex items-center gap-2">
                                        <Phone className="w-3 h-3" /> Phone Number
                                    </label>
                                    <input
                                        type="tel" required value={phone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 10) setPhone(val);
                                        }}
                                        maxLength={10}
                                        className={`w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-prodmast-primary/10 focus:border-prodmast-primary outline-none transition-all placeholder:text-gray-300 ${user?.phone ? 'opacity-80' : ''}`}
                                        placeholder="10-digit Mobile Number"
                                        inputMode="numeric"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-prodmast-muted uppercase tracking-[0.2em] mb-2 px-1 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3 h-3" /> Shipping Address
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleUseLiveLocation}
                                            disabled={fetchingLocation}
                                            className="text-[9px] text-prodmast-primary hover:text-prodmast-dark transition-colors flex items-center gap-1 bg-prodmast-primary/5 px-2 py-1 rounded-lg border border-prodmast-primary/10"
                                        >
                                            {fetchingLocation ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Activity className="w-2.5 h-2.5" />}
                                            {fetchingLocation ? 'Fetching...' : 'Use Live Location'}
                                        </button>
                                    </label>
                                    <textarea
                                        required rows={3} value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-prodmast-primary/10 focus:border-prodmast-primary outline-none transition-all placeholder:text-gray-300 resize-none shadow-inner"
                                        placeholder="Complete address with Area and Pin Code"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => setStep('summary')}
                                    className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                                <button
                                    disabled={!name || !phone || !address}
                                    onClick={() => setStep('payment')}
                                    className="flex-1 bg-prodmast-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale transition-all shadow-xl shadow-prodmast-primary/20 italic"
                                >
                                    Proceed to Payment
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'payment' && (
                        <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
                            <h3 className="text-sm font-black text-prodmast-muted uppercase tracking-widest italic px-2">Select Payment Method</h3>
                            <div className="grid gap-4">
                                <button
                                    onClick={() => setPaymentMethod('phonepe')}
                                    className={`p-5 rounded-3xl border-2 flex items-center justify-between transition-all group ${paymentMethod === 'phonepe' ? 'border-prodmast-primary bg-prodmast-primary/5 shadow-lg' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${paymentMethod === 'phonepe' ? 'bg-prodmast-primary text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-prodmast-primary/10 group-hover:text-prodmast-primary'}`}>
                                            <Wallet className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-prodmast-dark text-sm">PhonePe / UPI</p>
                                            <p className="text-[10px] font-bold text-prodmast-muted uppercase tracking-wider">Fast & Secure via BHIM UPI</p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-4 transition-all ${paymentMethod === 'phonepe' ? 'border-prodmast-primary bg-prodmast-primary shadow-[0_0_15px_rgba(20,47,50,0.3)]' : 'border-gray-200'}`} />
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('gpay')}
                                    className={`p-5 rounded-3xl border-2 flex items-center justify-between transition-all group ${paymentMethod === 'gpay' ? 'border-prodmast-primary bg-prodmast-primary/5 shadow-lg' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${paymentMethod === 'gpay' ? 'bg-prodmast-primary text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-prodmast-primary/10 group-hover:text-prodmast-primary'}`}>
                                            <ShoppingCart className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-prodmast-dark text-sm">Google Pay</p>
                                            <p className="text-[10px] font-bold text-prodmast-muted uppercase tracking-wider">Direct Payment via GPay</p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-4 transition-all ${paymentMethod === 'gpay' ? 'border-prodmast-primary bg-prodmast-primary shadow-[0_0_15px_rgba(20,47,50,0.3)]' : 'border-gray-200'}`} />
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={`p-5 rounded-3xl border-2 flex items-center justify-between transition-all group ${paymentMethod === 'card' ? 'border-prodmast-primary bg-prodmast-primary/5 shadow-lg' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${paymentMethod === 'card' ? 'bg-prodmast-primary text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-prodmast-primary/10 group-hover:text-prodmast-primary'}`}>
                                            <CreditCard className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-prodmast-dark text-sm">Credit / Debit Card</p>
                                            <p className="text-[10px] font-bold text-prodmast-muted uppercase tracking-wider">All major cards accepted</p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-4 transition-all ${paymentMethod === 'card' ? 'border-prodmast-primary bg-prodmast-primary shadow-[0_0_15px_rgba(20,47,50,0.3)]' : 'border-gray-200'}`} />
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('cod')}
                                    className={`p-5 rounded-3xl border-2 flex items-center justify-between transition-all group ${paymentMethod === 'cod' ? 'border-prodmast-primary bg-prodmast-primary/5 shadow-lg' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${paymentMethod === 'cod' ? 'bg-prodmast-primary text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-prodmast-primary/10 group-hover:text-prodmast-primary'}`}>
                                            <Truck className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-prodmast-dark text-sm">Cash on Delivery</p>
                                            <p className="text-[10px] font-bold text-prodmast-muted uppercase tracking-wider">Pay when you receive items</p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-4 transition-all ${paymentMethod === 'cod' ? 'border-prodmast-primary bg-prodmast-primary shadow-[0_0_15px_rgba(20,47,50,0.3)]' : 'border-gray-200'}`} />
                                </button>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => setStep('shipping')}
                                    className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 bg-prodmast-accent text-prodmast-primary py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-prodmast-accent/30 hover:scale-105 active:scale-95 transition-all italic"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Confirm Order
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
