import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../supabase';
import { Product } from '../types';
import { cn } from '../lib/utils';
import Notification from '../components/Notification';

export default function Cart() {
  const [cart, setCart] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('vortex_cart') || '[]');

    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*');
      if (data) {
        setProducts(data);
        // Sanitize any ranks to quantity 1
        const sanitizedCart = savedCart.map((item: any) => {
          const matchedProd = data.find((p: any) => p.id === item.productId);
          if (matchedProd && matchedProd.product_type === 'rank') {
            return { ...item, quantity: 1 };
          }
          return item;
        });
        setCart(sanitizedCart);
        localStorage.setItem('vortex_cart', JSON.stringify(sanitizedCart));
      } else {
        setCart(savedCart);
      }
    };
    fetchProducts();
  }, []);

  const getCartEntryKey = (item: any) => {
    return item.cartItemId || (item.optionId ? `${item.productId}_${item.optionId}` : item.productId);
  };

  const updateQuantity = (entryKey: string, delta: number) => {
    const targetItem = cart.find(item => getCartEntryKey(item) === entryKey);
    if (!targetItem) return;

    const product = products.find(p => p.id === targetItem.productId);
    if (product && product.product_type === 'rank') return; // Cannot change rank quantity
    
    // Check total if we are increasing quantity
    if (delta > 0) {
      const currentTotal = cart.reduce((acc, item) => acc + item.quantity, 0);
      if (currentTotal >= 5) {
        setNotification({ 
          message: 'Cannot increase quantity. You can only order a maximum of 5 items at once to prevent spam!', 
          type: 'error' 
        });
        return;
      }
    }

    const updatedCart = cart.map(item => {
      if (getCartEntryKey(item) === entryKey) {
        let newQuantity = item.quantity + delta;
        
        // Enforce stock limits
        if (product && product.stock !== -1) {
          newQuantity = Math.min(newQuantity, product.stock);
        }
        
        newQuantity = Math.max(1, newQuantity);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCart(updatedCart);
    localStorage.setItem('vortex_cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const removeItem = (entryKey: string) => {
    const updatedCart = cart.filter(item => getCartEntryKey(item) !== entryKey);
    setCart(updatedCart);
    localStorage.setItem('vortex_cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-8">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
          <ShoppingBag className="w-12 h-12 text-slate-700" />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">Your Cart is Empty</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Looks like you haven't added anything to your cart yet. Head over to the store to find some awesome items!
          </p>
        </div>
        <Link
          to="/store"
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all neon-glow-purple"
        >
          <span>Go to Store</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)}
          duration={3000}
        />
      )}
      <h1 className="text-4xl font-black text-white tracking-tight">SHOPPING <span className="text-purple-500">CART</span></h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item) => (
            <motion.div
              key={getCartEntryKey(item)}
              layout
              className="glass p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6"
            >
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800">
                  <ShoppingCart className="w-8 h-8 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{item.name}</h3>
                  <p className="text-purple-400 font-bold">{item.price} BDT</p>
                </div>
              </div>

              <div className="flex items-center space-x-8">
                <div className="flex flex-col items-center space-y-2">
                  {products.find(p => p.id === item.productId)?.product_type === 'rank' ? (
                    <div className="text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-widest font-sans select-none">
                      Rank (QTY: 1)
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(getCartEntryKey(item), -1)}
                          className="p-2 text-slate-400 hover:text-white transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center text-white font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(getCartEntryKey(item), 1)}
                          disabled={(() => {
                            const product = products.find(p => p.id === item.productId);
                            return product && product.stock !== -1 && item.quantity >= product.stock;
                          })()}
                          className={cn(
                            "p-2 transition-colors",
                            (() => {
                              const product = products.find(p => p.id === item.productId);
                              return product && product.stock !== -1 && item.quantity >= product.stock
                                ? "text-slate-700 cursor-not-allowed"
                                : "text-slate-400 hover:text-white"
                            })()
                          )}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {(() => {
                        const product = products.find(p => p.id === item.productId);
                        if (product && product.stock !== -1 && item.quantity >= product.stock) {
                          return <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Max Stock Reached</span>;
                        }
                        return null;
                      })()}
                    </>
                  )}
                </div>
                <button
                  onClick={() => removeItem(getCartEntryKey(item))}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <aside className="space-y-6">
          <div className="glass p-8 rounded-3xl space-y-8 border-purple-500/30">
            <h2 className="text-xl font-bold text-white">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{total} BDT</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax</span>
                <span>0 BDT</span>
              </div>
              <div className="h-px bg-slate-800"></div>
              <div className="flex justify-between text-xl font-bold text-white">
                <span>Total</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{total} BDT</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition-all neon-glow-purple"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <p className="text-center text-xs text-slate-500">
              By proceeding, you agree to our Terms of Service and Refund Policy.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
