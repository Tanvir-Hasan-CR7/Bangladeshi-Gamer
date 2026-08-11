import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Product, Category } from '../types';
import { getProductPurchaseOptions, getCleanDescription } from '../lib/productUtils';
import { motion } from 'motion/react';
import { 
  ShoppingCart, 
  Package, 
  ChevronRight, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  ArrowLeft
} from 'lucide-react';
import Notification, { NotificationType } from '../components/Notification';
import { cn } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [quantity, setQuantity] = useState(1);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchProductData = async () => {
      setLoading(true);
      try {
        // Fetch product
        const { data: productData, error: productErr } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (productErr || !productData) {
          console.error('Error fetching product:', productErr);
          setProduct(null);
          setLoading(false);
          return;
        }

        const prod = productData as Product;
        setProduct(prod);

        // Fetch category
        if (prod.category_id) {
          const { data: categoryData } = await supabase
            .from('categories')
            .select('*')
            .eq('id', prod.category_id)
            .single();
          
          if (categoryData) {
            setCategory(categoryData as Category);
          }
        }

      } catch (err) {
        console.error('Error during fetchProductData:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [id]);

  const handleIncrement = () => {
    if (product && product.stock !== -1 && quantity >= product.stock) {
      setNotification({
        message: `Only ${product.stock} items left in stock.`,
        type: 'error'
      });
      return;
    }
    setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  const addToCartAction = (prod: Product, qte: number): boolean => {
    if (prod.stock === 0) return false;

    // Force rank product quantity to be exactly 1
    const finalQuantity = prod.product_type === 'rank' ? 1 : qte;

    const cart = JSON.parse(localStorage.getItem('vortex_cart') || '[]');
    const totalCurrentQuantity = cart.reduce((acc: number, item: any) => acc + item.quantity, 0);
    
    if (totalCurrentQuantity + finalQuantity > 5) {
      setNotification({ 
        message: `Cannot add items. You can only order a maximum of 5 items total in your cart!`, 
        type: 'error' 
      });
      return false;
    }

    const existingItemIndex = cart.findIndex((item: any) => item.productId === prod.id);
    if (existingItemIndex > -1) {
      if (prod.product_type === 'rank') {
        setNotification({
          message: `Rank items are limited to 1 per order! You already have this rank in your cart.`,
          type: 'error'
        });
        return false;
      }

      // Check stock limit for combined item
      const newQuantity = cart[existingItemIndex].quantity + finalQuantity;
      if (prod.stock !== -1 && newQuantity > prod.stock) {
        setNotification({ 
          message: `Cannot add more. Exceeds available stock of ${prod.stock}!`, 
          type: 'error' 
        });
        return false;
      }
      cart[existingItemIndex].quantity = newQuantity;
    } else {
      cart.push({
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        quantity: finalQuantity
      });
    }

    localStorage.setItem('vortex_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    return true;
  };

  const handleAddToCart = () => {
    if (!product) return;
    const qte = product.product_type === 'rank' ? 1 : quantity;
    const success = addToCartAction(product, qte);
    if (success) {
      setNotification({
        message: `Added ${qte}x ${product.name} to your cart successfully!`,
        type: 'success'
      });
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    const qte = product.product_type === 'rank' ? 1 : quantity;
    const success = addToCartAction(product, qte);
    if (success) {
      navigate('/checkout');
    }
  };

  const handleAddOptionToCart = (option: any) => {
    if (!product) return;
    if (product.stock === 0) return;

    const cart = JSON.parse(localStorage.getItem('vortex_cart') || '[]');
    const totalCurrentQuantity = cart.reduce((acc: number, item: any) => acc + item.quantity, 0);
    
    if (totalCurrentQuantity + 1 > 5) {
      setNotification({ 
        message: `Cannot add items. You can only order a maximum of 5 items total in your cart!`, 
        type: 'error' 
      });
      return;
    }

    const cartItemId = `${product.id}_${option.id}`;
    const existingItemIndex = cart.findIndex((item: any) => item.cartItemId === cartItemId || (item.productId === product.id && item.optionId === option.id));
    
    if (existingItemIndex > -1) {
      const newQuantity = cart[existingItemIndex].quantity + 1;
      if (product.stock !== -1 && newQuantity > product.stock) {
        setNotification({ 
          message: `Cannot add more. Exceeds available stock of ${product.stock}!`, 
          type: 'error' 
        });
        return;
      }
      cart[existingItemIndex].quantity = newQuantity;
    } else {
      cart.push({
        cartItemId,
        productId: product.id,
        optionId: option.id,
        name: `${product.name} - ${option.name}`,
        price: option.price,
        quantity: 1
      });
    }

    localStorage.setItem('vortex_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    setNotification({
      message: `Added ${option.name} pack to your cart successfully!`,
      type: 'success'
    });
  };

  const productOptions = product ? getProductPurchaseOptions(product) : [];

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="inline-flex w-16 h-16 bg-red-500/10 text-red-500 rounded-full items-center justify-center">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Product Not Found</h2>
        <p className="text-slate-400">The product you are looking for does not exist or has been removed.</p>
        <Link to="/store" className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all">
          <ArrowLeft className="w-5 h-5 text-yellow-500" />
          <span>Back to Store</span>
        </Link>
      </div>
    );
  }

  // Choose display theme accent
  const primaryAccentHex = settings?.brand_color_1 || '#f59e0b'; // fallbacks to yellow-500/amber-500

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 select-none">
      
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)}
          duration={3000}
        />
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium font-mono">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <Link to="/store" className="hover:text-white transition-colors">Store</Link>
        {category && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-slate-400 capitalize">{category.name}</span>
          </>
        )}
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-yellow-500 truncate">{product.name}</span>
      </div>

      {/* Main Container */}
      <div className="glass rounded-[32px] border-slate-800/80 p-6 md:p-10 transition-all duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14">
          
          {/* Showcase Image Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="aspect-square bg-slate-950 rounded-3xl border border-slate-800/80 flex items-center justify-center p-8 relative overflow-hidden group shadow-2xl">
              {/* Overlay styling */}
              <div className="absolute inset-0 bg-radial from-slate-900/10 via-slate-950 to-slate-950 group-hover:scale-105 transition-transform duration-700 pointer-events-none" />
              
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className={cn(
                    "max-h-full max-w-full object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.7)] group-hover:scale-110 transition-all duration-500",
                    product.stock === 0 && "opacity-40 grayscale"
                  )}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Package className="w-24 h-24 text-slate-800" />
              )}

              {product.stock === 0 && (
                <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
                  <div className="bg-red-500/90 text-white font-black text-sm px-6 py-2 rounded-xl uppercase tracking-widest rotate-[-12deg] shadow-2xl border border-red-400">
                    Sold Out
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details Content Column */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight capitalize leading-tight">
                {product.name}
              </h1>

              {/* Stock Badge */}
              <div>
                {product.stock === 0 ? (
                  <span className="inline-flex items-center text-xs font-black bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full tracking-wider uppercase border border-red-500/10">
                    Out of Stock
                  </span>
                ) : product.stock === -1 ? (
                  <span className="inline-flex items-center text-xs font-black bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full tracking-wider uppercase border border-green-500/10">
                    In Stock (Unlimited)
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-black bg-yellow-500/10 text-yellow-400 px-3 py-1.5 rounded-full tracking-wider uppercase border border-yellow-500/10">
                    In Stock ({product.stock} items remaining)
                  </span>
                )}
              </div>

              {/* Price Display */}
              <div className="pt-2 font-mono">
                <span className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Price</span>
                <span className="text-4xl md:text-5xl font-black text-yellow-500 flex items-baseline">
                  BDT {product.price.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Buying & Quantity Select Block */}
            <div className="space-y-4 pt-4 border-t border-slate-900/60 font-sans">
              {productOptions.length > 0 ? (
                <div className="space-y-3.5">
                  <span className="text-xs text-slate-500 uppercase tracking-widest block mb-1 font-mono">Available purchase packages</span>
                  <div className="grid grid-cols-1 gap-3">
                    {productOptions.map((option) => (
                      <div key={option.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60 hover:border-yellow-500/30 transition-all select-none">
                        <div>
                          <h4 className="font-extrabold text-white text-sm">{option.name}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">Qty: {option.quantity}x {product.name}</p>
                        </div>
                        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="font-extrabold font-mono text-yellow-500 text-sm whitespace-nowrap">{option.price} BDT</span>
                          <button
                            onClick={() => handleAddOptionToCart(option)}
                            disabled={product.stock === 0}
                            className={cn(
                              "font-extrabold text-xs py-2 px-3.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all active:scale-95 duration-200 cursor-pointer",
                              product.stock === 0
                                ? "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed"
                                : "bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold"
                            )}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    
                    {/* Quantity Control Panel - Only render if not rank */}
                    {product.product_type !== 'rank' && (
                      <div className="md:col-span-4 flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-2.5">
                        <button 
                          onClick={handleDecrement}
                          disabled={product.stock === 0}
                          type="button"
                          className="w-10 h-10 flex items-center justify-center text-lg font-black text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          -
                        </button>
                        <span className="text-lg font-bold text-white text-center font-mono">
                          {quantity}
                        </span>
                        <button 
                          onClick={handleIncrement}
                          disabled={product.stock === 0}
                          type="button"
                          className="w-10 h-10 flex items-center justify-center text-lg font-black text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Add to Cart button */}
                    <button 
                      onClick={handleAddToCart}
                      disabled={product.stock === 0}
                      className={cn(
                        product.product_type === 'rank' ? "col-span-12" : "md:col-span-8",
                        "w-full font-black py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-all duration-300 transform active:scale-[0.98] select-none",
                        product.stock === 0 
                          ? "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed" 
                          : "bg-yellow-500 hover:bg-yellow-600 text-slate-950 neon-glow-yellow font-bold"
                      )}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span>Add To Cart</span>
                    </button>

                  </div>

                  {/* Buy It Now Button */}
                  <button 
                    onClick={handleBuyNow}
                    disabled={product.stock === 0}
                    className={cn(
                      "w-full font-black py-4 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all duration-300 border active:scale-[0.98] select-none font-mono tracking-wide uppercase text-sm",
                      product.stock === 0
                        ? "bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed"
                        : "bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 text-white border-slate-800"
                    )}
                  >
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span>Buy It Now</span>
                  </button>
                </>
              )}
            </div>

            {/* Micro value badges */}
            <div className="grid grid-cols-3 gap-2 text-center pt-2 select-none">
              <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-900 flex flex-col justify-center items-center">
                <ShieldCheck className="w-5 h-5 text-yellow-500 mb-1" />
                <span className="text-[10px] font-black text-white uppercase tracking-wider">Secure Payment</span>
                <span className="text-[8px] text-slate-500 mt-0.5">100% Protected</span>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-900 flex flex-col justify-center items-center">
                <Clock className="w-5 h-5 text-yellow-500 mb-1" />
                <span className="text-[10px] font-black text-white uppercase tracking-wider">Instant Access</span>
                <span className="text-[8px] text-slate-500 mt-0.5">Digital Delivery</span>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-900 flex flex-col justify-center items-center">
                <Sparkles className="w-5 h-5 text-yellow-500 mb-1" />
                <span className="text-[10px] font-black text-white uppercase tracking-wider">24/7 Support</span>
                <span className="text-[8px] text-slate-500 mt-0.5">Always Online</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Description Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
          <span className="text-yellow-500 font-bold font-sans text-xl">|</span>
          <span>Description</span>
        </h2>
        <div className="glass rounded-[24px] border-slate-800/80 p-6 md:p-8">
          <p className="text-slate-300 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
            {getCleanDescription(product) || 'No description provided for this product.'}
          </p>
        </div>
      </div>



    </div>
  );
}
