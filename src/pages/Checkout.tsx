import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Shield, CreditCard, User, Hash, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Settings } from '../types';

export default function Checkout() {
  const [cart, setCart] = useState<any[]>([]);
  const [ign, setIgn] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('vortex_cart') || '[]');
    if (savedCart.length === 0) {
      navigate('/store');
      return;
    }
    const totalQty = savedCart.reduce((acc: number, item: any) => acc + item.quantity, 0);
    if (totalQty > 5) {
      setError('You can only order a maximum of 5 items at once to prevent spam! Please modify your cart.');
    }
    setCart(savedCart);

    // Fetch payment and official settings
    async function fetchSettings() {
      try {
        const { data } = await supabase.from('settings').select('*').eq('id', 'global').maybeSingle();
        if (data) {
          setSettings(data as Settings);
        }
      } catch (err) {
        console.error('Failed to fetch store manual settings:', err);
      }
    }
    fetchSettings();
  }, [navigate]);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
    if (totalQty > 5) {
      setError('Order size exceeded. A maximum of 5 items is allowed per order to prevent spam.');
      setLoading(false);
      return;
    }

    const trimmedTransactionId = transactionId.trim();
    if (!trimmedTransactionId) {
      setError('Transaction ID is required.');
      setLoading(false);
      return;
    }

    try {
      // Check if transaction ID is already used to provide a better error message
      // We check case-insensitively just in case
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .ilike('transaction_id', trimmedTransactionId)
        .maybeSingle();

      const { data: existingPurchase } = await supabase
        .from('purchases')
        .select('id')
        .ilike('trx_id', trimmedTransactionId)
        .maybeSingle();

      if (existingOrder || existingPurchase) {
        throw new Error('This Transaction ID has already been used for another submission. Please check your transaction details or contact support.');
      }

      // Insert into orders
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: 'guest',
          ign,
          payment_method: paymentMethod,
          sender_number: senderNumber,
          transaction_id: trimmedTransactionId,
          status: 'pending',
          total_amount: total,
          items: cart,
        });

      if (orderError) {
        throw orderError;
      }

      // Insert corresponding purchases records for verification
      const purchaseInserts = cart.map((item: any) => ({
        username: ign.trim().toLowerCase(),
        rank_name: item.name,
        amount_paid: item.price * item.quantity,
        sender_number: senderNumber.trim(),
        trx_id: trimmedTransactionId,
        status: 'pending',
        purchase_date: new Date().toISOString()
      }));

      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert(purchaseInserts);

      if (purchaseError) {
        throw purchaseError;
      }

      // Send Discord Webhook
      try {
        const { data: settings } = await supabase.from('settings').select('discord_order_webhook').single();
        if (settings?.discord_order_webhook) {
          const itemsList = cart.map(item => `- ${item.name} x${item.quantity}`).join('\n');
          const embed = {
            title: '🛒 New Order Received!',
            color: 0x9333ea, // Purple
            fields: [
              { name: 'Minecraft IGN', value: ign, inline: true },
              { name: 'Total Amount', value: `${total} BDT`, inline: true },
              { name: 'Payment Method', value: paymentMethod.toUpperCase(), inline: true },
              { name: 'Sender Number', value: senderNumber, inline: true },
              { name: 'Transaction ID', value: trimmedTransactionId, inline: true },
              { name: 'User Email', value: 'Guest Checkout', inline: true },
              { name: 'Items', value: itemsList || 'No items' }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Vortex Store | Order System' }
          };

          await fetch(settings.discord_order_webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
          });
        }
      } catch (webhookErr) {
        console.error('Failed to send Discord webhook:', webhookErr);
        // Don't fail the order if webhook fails
      }

      localStorage.removeItem('vortex_cart');
      window.dispatchEvent(new Event('cart-updated'));
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-8">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/50">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">Order Submitted!</h1>
          <p className="text-slate-400">
            Your order has been received and is currently in the **Verification Queue**. Our staff will verify the transaction and deliver your items shortly.
          </p>
        </div>
        <div className="glass p-6 rounded-2xl text-left space-y-2">
          <p className="text-sm text-slate-500 uppercase font-bold tracking-widest">Transaction ID</p>
          <p className="text-lg font-mono text-white">{transactionId}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-white tracking-tight">MANUAL <span className="text-purple-500">CHECKOUT</span></h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Complete your payment using your preferred method and provide the transaction details below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="glass p-8 rounded-3xl space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <CreditCard className="w-6 h-6 text-purple-500" />
              <span>Payment Details</span>
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Minecraft IGN</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    required
                    type="text"
                    value={ign}
                    onChange={(e) => setIgn(e.target.value)}
                    placeholder="Your In-Game Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Payment Method</label>
                <select
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="">Select Method</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Sender Number</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      required
                      type="text"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Transaction ID</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      required
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="TRX12345678"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cart.reduce((acc, item) => acc + item.quantity, 0) > 5}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition-all neon-glow-purple disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Submit Order (${total} BDT)`}
              </button>
            </form>
          </div>
        </div>

        <aside className="space-y-8">
          <div className="glass p-8 rounded-3xl space-y-6">
            <h2 className="text-xl font-bold text-white">Order Summary</h2>
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-slate-400">{item.name} x{item.quantity}</span>
                  <span className="text-white font-medium">{item.price * item.quantity} BDT</span>
                </div>
              ))}
              <div className="h-px bg-slate-800"></div>
              <div className="flex justify-between text-xl font-bold text-white">
                <span>Total</span>
                <span className="text-purple-400">{total} BDT</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600/10 border border-indigo-600/30 p-8 rounded-3xl space-y-6">
            <h3 className="text-indigo-400 font-bold flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>How To Pay?</span>
            </h3>

            {/* bKash dynamic guide */}
            {paymentMethod === 'bkash' && (
              <div className="space-y-3 bg-pink-500/10 border border-pink-500/30 p-4 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="text-[10px] font-black uppercase text-pink-400 tracking-wider">bKash Account Details</span>
                <p className="text-slate-200 text-sm font-bold flex flex-wrap items-center gap-1">
                  Send Money to: <span className="text-white bg-pink-600/30 px-2 py-0.5 rounded font-mono tracking-wider select-all cursor-pointer hover:bg-pink-600/50 transition-colors" title="Double click to copy">{settings?.payment_number_bkash || '01XXXXXXXXX'}</span>
                </p>
                {settings?.payment_info_bkash ? (
                  <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">{settings.payment_info_bkash}</p>
                ) : (
                  <p className="text-slate-400 text-xs leading-relaxed">Send the exact amount BDT to the personal number above, then copy the Transaction ID.</p>
                )}
              </div>
            )}

            {/* Nagad dynamic guide */}
            {paymentMethod === 'nagad' && (
              <div className="space-y-3 bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">Nagad Account Details</span>
                <p className="text-slate-200 text-sm font-bold flex flex-wrap items-center gap-1">
                  Send Money to: <span className="text-white bg-orange-600/30 px-2 py-0.5 rounded font-mono tracking-wider select-all cursor-pointer hover:bg-orange-600/50 transition-colors" title="Double click to copy">{settings?.payment_number_nagad || '01XXXXXXXXX'}</span>
                </p>
                {settings?.payment_info_nagad ? (
                  <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">{settings.payment_info_nagad}</p>
                ) : (
                  <p className="text-slate-400 text-xs leading-relaxed">Send the exact amount BDT to the personal number above, then copy the Transaction ID.</p>
                )}
              </div>
            )}

            {/* Rocket dynamic guide */}
            {paymentMethod === 'rocket' && (
              <div className="space-y-3 bg-purple-500/10 border border-purple-500/30 p-4 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Rocket Account Details</span>
                <p className="text-slate-200 text-sm font-bold flex flex-wrap items-center gap-1">
                  Send Money to: <span className="text-white bg-purple-600/30 px-2 py-0.5 rounded font-mono tracking-wider select-all cursor-pointer hover:bg-purple-600/50 transition-colors" title="Double click to copy">{settings?.payment_number_rocket || '01XXXXXXXXX'}</span>
                </p>
                {settings?.payment_info_rocket ? (
                  <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">{settings.payment_info_rocket}</p>
                ) : (
                  <p className="text-slate-400 text-xs leading-relaxed">Send the exact amount BDT to the personal number above, then copy the Transaction ID.</p>
                )}
              </div>
            )}

            {/* General display of configured numbers if no method selected */}
            {(!paymentMethod || paymentMethod === 'other') && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Manual Payment Accounts</p>
                <div className="grid grid-cols-1 gap-2.5">
                  {settings?.payment_number_bkash ? (
                    <div className="flex justify-between items-center text-xs bg-slate-950 border border-slate-900 px-3.5 py-2.5 rounded-xl">
                      <span className="text-pink-400 font-bold">bKash (Money Transfer)</span>
                      <span className="font-mono text-white tracking-wide select-all bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded cursor-pointer">{settings.payment_number_bkash}</span>
                    </div>
                  ) : null}
                  {settings?.payment_number_nagad ? (
                    <div className="flex justify-between items-center text-xs bg-slate-950 border border-slate-900 px-3.5 py-2.5 rounded-xl">
                      <span className="text-orange-400 font-bold">Nagad (Money Transfer)</span>
                      <span className="font-mono text-white tracking-wide select-all bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded cursor-pointer">{settings.payment_number_nagad}</span>
                    </div>
                  ) : null}
                  {settings?.payment_number_rocket ? (
                    <div className="flex justify-between items-center text-xs bg-slate-950 border border-slate-900 px-3.5 py-2.5 rounded-xl">
                      <span className="text-purple-400 font-bold">Rocket (Money Transfer)</span>
                      <span className="font-mono text-white tracking-wide select-all bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded cursor-pointer">{settings.payment_number_rocket}</span>
                    </div>
                  ) : null}
                  {!settings?.payment_number_bkash && !settings?.payment_number_nagad && !settings?.payment_number_rocket && (
                    <div className="text-xs text-slate-500 bg-slate-950/50 p-4 border border-dashed border-slate-800 rounded-xl leading-relaxed">
                      Official payment numbers are not set yet by administration. In-game checkout is currently offline-queued. Under normal setup: Send exact amount to 01XXXXXXXXX.
                    </div>
                  )}
                </div>
              </div>
            )}

            {settings?.payment_info_other ? (
              <div className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-4 whitespace-pre-wrap">
                {settings.payment_info_other}
              </div>
            ) : (
              <div className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-4 space-y-1.5">
                <p>1. Transmit the purchase amount total to our official account above.</p>
                <p>2. Complete the transaction securely and copy the Transaction ID prefix.</p>
                <p>3. Populate your Minecraft username (IGN), Sender Phone and transaction code.</p>
                <p>4. Press submit order to send for immediate team confirmation.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
