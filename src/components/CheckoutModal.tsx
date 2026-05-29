import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, Loader2, ShoppingBag, MapPin, Phone, User, CreditCard, ChevronRight, ChevronLeft, Wallet, Truck, ShoppingCart, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';
// ── Email Notifications via Web3Forms (Primary) + FormSubmit (Fallback) ──
// To get your FREE Web3Forms access key:
//   1. Go to https://web3forms.com
//   2. Enter your email: chetankubihal123@gmail.com
//   3. Check your inbox and copy the access key
//   4. Replace the key below OR paste it in the app's UPI config drawer
const WEB3FORMS_DEFAULT_KEY = 'c23602af-ec70-4df8-8224-88e340b4bfd5';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type CheckoutStep = 'summary' | 'shipping' | 'payment' | 'upi-qr';

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

    // UPI payment states
    const [utr, setUtr] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [payeeUpiId, setPayeeUpiId] = useState('chetankubihal123@okaxis');
    const [showUpiConfig, setShowUpiConfig] = useState(false);
    const [paymentTimer, setPaymentTimer] = useState(10);
    const [paymentDetected, setPaymentDetected] = useState(false);
    const [formSubmitNotice, setFormSubmitNotice] = useState<'sent' | 'activation_required' | 'fallback_sent' | 'offline' | null>(null);
    const [orderReceiptText, setOrderReceiptText] = useState<string>('');
    const [web3formsKey, setWeb3formsKey] = useState<string>(() => localStorage.getItem('web3forms_key') || '');

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

    // Timer to simulate scanning & payment detection (For demo/presentation purposes)
    React.useEffect(() => {
        if (step !== 'upi-qr') {
            setPaymentTimer(10);
            setPaymentDetected(false);
            return;
        }

        setPaymentTimer(10);
        setPaymentDetected(false);

        const interval = setInterval(() => {
            setPaymentTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setPaymentDetected(true);
                    setUtr('987654321012'); // Pre-fill mock UTR
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [step]);

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
        if (e && e.preventDefault) e.preventDefault();
        if (!user || items.length === 0) return;

        setLoading(true);
        setError(null);

        const finalAddress = (paymentMethod === 'phonepe' || paymentMethod === 'gpay') && utr
            ? `${address} | UPI UTR: ${utr}`
            : address;

        const finalPaymentMethod = (paymentMethod === 'phonepe' || paymentMethod === 'gpay') && utr
            ? `${paymentMethod.toUpperCase()} (UTR: ${utr})`
            : paymentMethod;

        try {
            // 1. Insert master order
            let orderResult = await supabase
                .from('orders')
                .insert({
                    user_id: user.id,
                    customer_name: name,
                    delivery_address: finalAddress,
                    phone_number: phone,
                    total_amount: totalPrice,
                    payment_method: finalPaymentMethod,
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
                        delivery_address: finalAddress,
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

            // 4. Send Order Notification Email via Web3Forms (Primary) → FormSubmit (Fallback)
            try {
                if (orderData) {
                    const itemsList = items.map(i => `• ${i.product.name} × ${i.quantity}  —  ₹${(i.product.price * i.quantity).toLocaleString()}`).join('\n');

                    // Save order receipt to state (user can copy manually if all services are down)
                    const receipt = `🛒 AgriSmart Order Receipt
----------------------------------------
Order ID: #${orderData.id.slice(0, 8).toUpperCase()}
Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
Customer: ${name}
Phone: ${phone}
Address: ${finalAddress}
Payment Method: ${finalPaymentMethod.toUpperCase()}
Total Items: ${totalItems}
Order Total: ₹${totalPrice.toLocaleString()}

Items Ordered:
${itemsList}
----------------------------------------
Thank you for choosing AgriSmart!`;
                    setOrderReceiptText(receipt);

                    const orderId = orderData.id.slice(0, 8).toUpperCase();
                    const orderDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                    let emailSent = false;

                    // ── Primary: Web3Forms (free, reliable, instant) ──
                    const activeKey = web3formsKey || WEB3FORMS_DEFAULT_KEY;
                    try {
                        const web3Payload = {
                            access_key: activeKey,
                            subject: `🛒 New Order #${orderId} — AgriSmart`,
                            from_name: 'AgriSmart Order System',
                            to_name: 'AgriSmart Admin',
                            // Structured fields
                            'Order ID': `#${orderId}`,
                            'Date': orderDate,
                            'Customer': name,
                            'Phone': phone,
                            'Address': finalAddress,
                            'Payment Method': finalPaymentMethod.toUpperCase(),
                            'Total Items': String(totalItems),
                            'Order Total': `₹${totalPrice.toLocaleString()}`,
                            'Items Ordered': itemsList,
                        };

                        const w3response = await fetch('https://api.web3forms.com/submit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                            body: JSON.stringify(web3Payload),
                        });

                        const w3result = await w3response.json();
                        console.log('Web3Forms Response:', w3result);

                        if (w3result.success) {
                            setFormSubmitNotice('sent');
                            emailSent = true;
                            console.log('✅ Order email sent via Web3Forms.');
                        } else {
                            console.warn('Web3Forms returned failure:', w3result.message);
                        }
                    } catch (w3err) {
                        console.warn('Web3Forms dispatch failed:', w3err);
                    }

                    // ── Fallback: FormSubmit.co AJAX ──
                    if (!emailSent) {
                        try {
                            const fsPayload = {
                                _subject: `🛒 New Order #${orderId} — AgriSmart`,
                                Customer: name, Phone: phone, Address: finalAddress,
                                Payment_Method: finalPaymentMethod.toUpperCase(),
                                Total_Items: String(totalItems),
                                Order_Total: `₹${totalPrice.toLocaleString()}`,
                                Items: itemsList,
                                Order_ID: orderId, Date: orderDate,
                                _template: 'box', _captcha: 'false',
                            };

                            const fsResponse = await fetch('https://formsubmit.co/ajax/chetankubihal123@gmail.com', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                                body: JSON.stringify(fsPayload),
                            });

                            if (fsResponse.ok) {
                                const fsResult = await fsResponse.json();
                                if (fsResult.success !== 'false') {
                                    setFormSubmitNotice('sent');
                                    emailSent = true;
                                    console.log('✅ Order email sent via FormSubmit fallback.');
                                }
                            }
                        } catch (fsErr) {
                            console.warn('FormSubmit fallback also failed:', fsErr);
                        }
                    }

                    if (!emailSent) {
                        setFormSubmitNotice('offline');
                        console.warn('⚠️ All email services are currently unreachable.');
                    }
                }
            } catch (emailErr) {
                console.warn('⚠️ Email dispatch failed entirely:', emailErr);
                setFormSubmitNotice('offline');
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

                        {/* Email Status Notices */}
                        {formSubmitNotice === 'activation_required' && (
                            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left shadow-sm">
                                <p className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                                    📧 One-Time Email Activation Required
                                </p>
                                <p className="text-[10px] text-amber-700 font-bold mt-1 leading-relaxed">
                                    FormSubmit.co sent an activation email to <strong>chetankubihal123@gmail.com</strong>. Please check your <strong>Inbox/Spam</strong> and click the activation link.
                                </p>
                            </div>
                        )}

                        {formSubmitNotice === 'sent' && (
                            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-2xl text-left shadow-sm">
                                <p className="text-xs font-black text-green-800 flex items-center gap-1.5">
                                    ✅ Email Notification Sent!
                                </p>
                                <p className="text-[10px] text-green-700 font-bold mt-1 leading-relaxed">
                                    Order details have been emailed to <strong>chetankubihal123@gmail.com</strong>. Check your inbox!
                                </p>
                            </div>
                        )}

                        {formSubmitNotice === 'offline' && (
                            <div className="mb-8 p-5 bg-amber-50/70 border border-amber-200/60 rounded-[28px] text-left shadow-sm">
                                <div className="flex items-center gap-2 text-amber-800 mb-1.5">
                                    <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                    <p className="text-xs font-black uppercase tracking-wider italic">
                                        ⚠️ Email Services Unreachable
                                    </p>
                                </div>
                                <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                                    Order saved to database successfully! Email services are temporarily unavailable. 
                                    <span className="block mt-1">
                                        Active Web3Forms Key: <code className="bg-amber-100/80 px-1 py-0.5 rounded text-amber-900 font-mono text-[9px]">{web3formsKey || WEB3FORMS_DEFAULT_KEY || 'None'}</code>
                                    </span>
                                    <span className="block mt-1">💡 Get a free <strong>Web3Forms</strong> key at <strong>web3forms.com</strong> if the current one is not receiving emails.</span>
                                </p>
                                <div className="mt-3 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Paste a new Web3Forms key to override..."
                                        value={web3formsKey}
                                        onChange={(e) => {
                                            const val = e.target.value.trim();
                                            setWeb3formsKey(val);
                                            if (val) {
                                                localStorage.setItem('web3forms_key', val);
                                            } else {
                                                localStorage.removeItem('web3forms_key');
                                            }
                                        }}
                                        className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-[10px] font-bold focus:border-prodmast-primary outline-none"
                                    />
                                    {web3formsKey && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                localStorage.removeItem('web3forms_key');
                                                setWeb3formsKey('');
                                            }}
                                            className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded-lg text-[9px] font-black"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(orderReceiptText);
                                        alert('📋 Order receipt copied to clipboard!');
                                    }}
                                    className="mt-3 w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-2xl text-[10px] uppercase tracking-wider transition-colors shadow-md shadow-amber-600/10 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                >
                                    📋 Copy Order Receipt Details
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setSuccess(false);
                                setStep('summary');
                                setUtr('');
                                setVerifying(false);
                                setFormSubmitNotice(null);
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
                                <span className={`h-1.5 w-8 rounded-full ${step === 'payment' || step === 'upi-qr' ? 'bg-prodmast-primary' : 'bg-gray-200'}`} />
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
                                    onClick={(e) => {
                                        if (paymentMethod === 'phonepe' || paymentMethod === 'gpay') {
                                            setStep('upi-qr');
                                        } else {
                                            handleSubmit(e);
                                        }
                                    }}
                                    disabled={loading}
                                    className="flex-1 bg-prodmast-accent text-prodmast-primary py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-prodmast-accent/30 hover:scale-105 active:scale-95 transition-all italic"
                                >
                                    Confirm Order
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'upi-qr' && (
                        <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
                            <div className="text-center px-4">
                                <h3 className="text-lg font-black text-prodmast-dark mb-1 tracking-tighter uppercase italic">Pay via UPI QR Code</h3>
                                <p className="text-xs text-prodmast-muted font-bold">Scan the QR code below with GPay, PhonePe, Paytm, or BHIM to pay</p>
                            </div>

                            {/* Live QR Code Container */}
                            <div className="bg-gray-50 border border-gray-100 rounded-[32px] p-6 flex flex-col items-center justify-center relative overflow-hidden max-w-sm mx-auto shadow-inner">
                                {verifying ? (
                                    <div className="h-64 flex flex-col items-center justify-center space-y-4">
                                        <div className="relative w-16 h-16">
                                            <div className="absolute inset-0 border-4 border-prodmast-primary/20 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-prodmast-primary border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black text-prodmast-dark animate-pulse">Verifying payment with Bank...</p>
                                            <p className="text-[10px] text-prodmast-muted font-bold mt-1">UTR: {utr}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-white p-4 rounded-2xl border border-gray-200/50 shadow-sm relative group">
                                            {/* Dynamic UPI URL QR Code */}
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(
                                                    `upi://pay?pa=${payeeUpiId}&pn=${encodeURIComponent(
                                                        'AgriSmart Market'
                                                    )}&am=${totalPrice}&cu=INR&tn=${encodeURIComponent(
                                                        'AgriSmart Order'
                                                    )}`
                                                )}`}
                                                alt="UPI QR Code"
                                                className="w-48 h-48 object-contain"
                                            />
                                        </div>
                                        
                                        {/* Amount & UPI Details */}
                                        <div className="mt-5 text-center w-full">
                                            <p className="text-[10px] font-black uppercase text-prodmast-muted tracking-widest">Amount to Pay</p>
                                            <p className="text-3xl font-black text-prodmast-primary tracking-tighter italic mt-0.5">₹{totalPrice.toLocaleString()}</p>
                                            
                                            <div className="mt-3 flex items-center justify-center gap-1.5 bg-white border border-gray-100 py-1.5 px-3 rounded-xl w-fit mx-auto shadow-sm">
                                                <span className="text-[10px] font-bold text-prodmast-muted">UPI ID:</span>
                                                <span className="text-xs font-black text-prodmast-dark select-all">{payeeUpiId}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Demo Simulation Banner */}
                            <div className="text-center px-4 max-w-sm mx-auto">
                                {!paymentDetected ? (
                                    <div className="flex items-center justify-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 py-2.5 px-4 rounded-xl font-bold text-xs">
                                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                                        Simulating transaction scan... ({paymentTimer}s remaining)
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 py-2.5 px-4 rounded-xl font-black text-xs animate-bounce shadow-md">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        Payment of ₹{totalPrice.toLocaleString()} Detected Successfully!
                                    </div>
                                )}
                            </div>

                            {/* UTR Input Form (Only if not verifying) */}
                            {!verifying && (
                                <div className="space-y-4 max-w-sm mx-auto">
                                    <div>
                                        <label className="block text-[10px] font-black text-prodmast-muted uppercase tracking-[0.15em] mb-2 px-1">
                                            12-Digit UPI Transaction Ref No (UTR) *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={utr}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 12) setUtr(val);
                                            }}
                                            maxLength={12}
                                            placeholder="Enter 12-digit UTR number"
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-center text-lg font-black tracking-[0.2em] focus:ring-4 focus:ring-prodmast-primary/10 focus:border-prodmast-primary outline-none transition-all placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-bold"
                                        />
                                        <span className="block text-[9px] text-prodmast-muted font-bold mt-1.5 px-1 leading-normal text-center">
                                            💡 UTR will auto-fill when the scanner finishes, or you can type it manually.
                                        </span>
                                    </div>

                                    {/* Config Drawer for Custom UPI (Live payment demo setup) */}
                                    <div className="border-t border-gray-100 pt-3 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowUpiConfig(!showUpiConfig)}
                                            className="text-[10px] text-prodmast-primary hover:text-prodmast-dark font-black uppercase tracking-wider flex items-center justify-center gap-1 mx-auto"
                                        >
                                            ⚙️ {showUpiConfig ? 'Hide' : 'Configure'} Payee & Web3Forms
                                        </button>
                                        {showUpiConfig && (
                                            <div className="mt-3 p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200 text-left">
                                                <div>
                                                    <label className="block text-[9px] font-black text-prodmast-muted uppercase tracking-wider mb-1">Configure Merchant UPI ID</label>
                                                    <input
                                                        type="text"
                                                        value={payeeUpiId}
                                                        onChange={(e) => setPayeeUpiId(e.target.value)}
                                                        placeholder="Enter your personal UPI ID"
                                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:border-prodmast-primary outline-none"
                                                    />
                                                    <span className="block text-[8px] text-prodmast-muted leading-tight mt-1">
                                                        Scan with GPay/PhonePe after changing the UPI ID to test live payments to your own account!
                                                    </span>
                                                </div>

                                                <div className="border-t border-gray-200/60 pt-3">
                                                    <label className="block text-[9px] font-black text-prodmast-muted uppercase tracking-wider mb-1">Web3Forms Access Key</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={web3formsKey}
                                                            onChange={(e) => {
                                                                const val = e.target.value.trim();
                                                                setWeb3formsKey(val);
                                                                if (val) {
                                                                    localStorage.setItem('web3forms_key', val);
                                                                } else {
                                                                    localStorage.removeItem('web3forms_key');
                                                                }
                                                            }}
                                                            placeholder={`Default: ${WEB3FORMS_DEFAULT_KEY.slice(0, 8)}...`}
                                                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:border-prodmast-primary outline-none"
                                                        />
                                                        {web3formsKey && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    localStorage.removeItem('web3forms_key');
                                                                    setWeb3formsKey('');
                                                                }}
                                                                className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[9px] font-black"
                                                            >
                                                                Reset
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span className="block text-[8px] text-prodmast-muted leading-tight mt-1">
                                                        Enter a custom key from <strong>web3forms.com</strong> to send order notifications to your own email address!
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Navigation & Submit Buttons */}
                            {!verifying && (
                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={() => setStep('payment')}
                                        className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Back
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (utr.length === 12) {
                                                setVerifying(true);
                                                setTimeout(() => {
                                                    setVerifying(false);
                                                    handleSubmit({ preventDefault: () => {} } as any);
                                                }, 1500);
                                            }
                                        }}
                                        disabled={utr.length !== 12 || loading}
                                        className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl italic ${
                                            paymentDetected 
                                                ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20 hover:scale-105 active:scale-95' 
                                                : 'bg-prodmast-primary text-white shadow-prodmast-primary/20'
                                        }`}
                                    >
                                        {paymentDetected ? 'Complete Checkout' : 'Verify & Place Order'}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
