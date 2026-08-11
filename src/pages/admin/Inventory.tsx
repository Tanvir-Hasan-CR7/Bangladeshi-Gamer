import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Product, Category, PurchaseOption } from '../../types';
import { getProductPurchaseOptions, getCleanDescription, encodeDescriptionWithOptions } from '../../lib/productUtils';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Filter, 
  Image as ImageIcon,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import Notification, { NotificationType } from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purchaseOptions, setPurchaseOptions] = useState<PurchaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'product' | 'category' } | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    stock: -1,
    category_id: '',
    image_url: '',
    product_type: 'others' as 'rank' | 'others',
    order: 0
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    order: 0,
    image_url: ''
  });

  useEffect(() => {
    fetchData();

    const categoriesChannel = supabase.channel('admin-inventory-categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData).subscribe();
    const productsChannel = supabase.channel('admin-inventory-products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData).subscribe();

    return () => {
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(productsChannel);
    };
  }, []);

  const fetchData = async () => {
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });
    
    if (categoriesData) {
      setCategories(categoriesData as Category[]);
      if (categoriesData.length > 0 && !productForm.category_id) {
        setProductForm(prev => ({ ...prev, category_id: categoriesData[0].id }));
      }
    }

    const { data: productsData } = await supabase
      .from('products')
      .select('*');
    
    if (productsData) {
      // Sort client-side so it never fails even if "order" column is missing in remote DB
      const sorted = [...productsData].sort((a: any, b: any) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });
      setProducts(sorted as Product[]);
    }
    setLoading(false);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const finalDescription = encodeDescriptionWithOptions(productForm.description, purchaseOptions);
    const fullPayload = {
      ...productForm,
      description: finalDescription,
      purchase_options: purchaseOptions
    };

    try {
      if (editingProduct) {
        // Attempt 1: Try with everything
        const result = await supabase
          .from('products')
          .update(fullPayload)
          .eq('id', editingProduct.id);

        if (result.error) {
          const isMsgOrder = result.error.message?.includes('order') || result.error.code === '42703';
          const isMsgOpts = result.error.message?.includes('purchase_options');
          const isPgrst = result.error.code === 'PGRST204';

          if (isMsgOrder || isMsgOpts || isPgrst) {
            // Attempt 2: Strip purchase_options, but keep order
            const { purchase_options, ...payloadWithOrder } = fullPayload as any;
            const result2 = await supabase
              .from('products')
              .update(payloadWithOrder)
              .eq('id', editingProduct.id);

            if (result2.error) {
              const isMsgOrder2 = result2.error.message?.includes('order') || result2.error.code === '42703';
              const isPgrst2 = result2.error.code === 'PGRST204';

              if (isMsgOrder2 || isPgrst2) {
                // Attempt 3: Strip both order and purchase_options
                const { order, purchase_options: _, ...payloadStripped } = fullPayload as any;
                const result3 = await supabase
                  .from('products')
                  .update(payloadStripped)
                  .eq('id', editingProduct.id);

                if (result3.error) throw result3.error;
              } else {
                throw result2.error;
              }
            }
            setNotification({ 
              message: 'Product updated successfully! (Fallback mode: custom parameters stored inside description text).', 
              type: 'info' 
            });
          } else {
            throw result.error;
          }
        } else {
          setNotification({ message: 'Product updated successfully!', type: 'success' });
        }
      } else {
        // Attempt 1: Try with everything
        const result = await supabase
          .from('products')
          .insert(fullPayload);

        if (result.error) {
          const isMsgOrder = result.error.message?.includes('order') || result.error.code === '42703';
          const isMsgOpts = result.error.message?.includes('purchase_options');
          const isPgrst = result.error.code === 'PGRST204';

          if (isMsgOrder || isMsgOpts || isPgrst) {
            // Attempt 2: Strip purchase_options, but keep order
            const { purchase_options, ...payloadWithOrder } = fullPayload as any;
            const result2 = await supabase
              .from('products')
              .insert(payloadWithOrder);

            if (result2.error) {
              const isMsgOrder2 = result2.error.message?.includes('order') || result2.error.code === '42703';
              const isPgrst2 = result2.error.code === 'PGRST204';

              if (isMsgOrder2 || isPgrst2) {
                // Attempt 3: Strip both order and purchase_options
                const { order, purchase_options: _, ...payloadStripped } = fullPayload as any;
                const result3 = await supabase
                  .from('products')
                  .insert(payloadStripped);

                if (result3.error) throw result3.error;
              } else {
                throw result2.error;
              }
            }
            setNotification({ 
              message: 'Product created successfully! (Fallback mode: custom parameters stored inside description text).', 
              type: 'info' 
            });
          } else {
            throw result.error;
          }
        } else {
          setNotification({ message: 'Product created successfully!', type: 'success' });
        }
      }
      await fetchData();
      setIsAddingProduct(false);
      setEditingProduct(null);
      setProductForm({ name: '', description: '', price: 0, stock: -1, category_id: categories[0]?.id || '', image_url: '', product_type: 'others', order: 0 });
      setPurchaseOptions([]);
    } catch (err: any) {
      console.error('Product Save Error:', err);
      alert(`ERROR: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryForm)
          .eq('id', editingCategory.id);
        if (error) throw error;
        setNotification({ message: 'Category updated successfully!', type: 'success' });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(categoryForm);
        if (error) throw error;
        setNotification({ message: 'Category created successfully!', type: 'success' });
      }
      await fetchData();
      setIsAddingCategory(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', order: 0, image_url: '' });
    } catch (err: any) {
      console.error('Category Save Error:', err);
      alert(`ERROR: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setNotification({ message: `Error deleting product: ${error.message}`, type: 'error' });
    } else {
      setNotification({ message: 'Product deleted successfully!', type: 'success' });
      fetchData();
    }
    setItemToDelete(null);
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      setNotification({ message: `Error deleting category: ${error.message}`, type: 'error' });
    } else {
      setNotification({ message: 'Category deleted successfully!', type: 'success' });
      fetchData();
    }
    setItemToDelete(null);
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      <ConfirmDialog
        isOpen={!!itemToDelete}
        title={`Delete ${itemToDelete?.type === 'product' ? 'Product' : 'Category'}`}
        message={`Are you sure you want to delete this ${itemToDelete?.type === 'product' ? 'product' : 'category'}? This action cannot be undone.`}
        confirmText="Delete"
        isDanger={true}
        onConfirm={() => {
          if (itemToDelete?.type === 'product') deleteProduct(itemToDelete.id);
          else if (itemToDelete?.type === 'category') deleteCategory(itemToDelete.id);
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Categories Management */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Categories</h2>
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryForm({ name: '', order: 0, image_url: '' });
              setIsAddingCategory(true);
            }}
            className="flex items-center space-x-2 bg-vortex-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="glass p-4 rounded-2xl border-slate-800/50 flex items-center justify-between group">
              <div>
                <p className="text-white font-bold">{cat.name}</p>
                <p className="text-xs text-slate-500">Order: {cat.order}</p>
              </div>
              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingCategory(cat);
                    setCategoryForm({ name: cat.name, order: cat.order, image_url: cat.image_url || '' });
                    setIsAddingCategory(true);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setItemToDelete({ id: cat.id, type: 'category' })}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Products Management */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Products</h2>
          <button
            onClick={() => {
              setEditingProduct(null);
              setProductForm({
                name: '',
                description: '',
                price: 0,
                stock: -1,
                category_id: categories[0]?.id || '',
                image_url: '',
                product_type: 'others',
                order: 0
              });
              setPurchaseOptions([]);
              setIsAddingProduct(true);
            }}
            className="flex items-center space-x-2 bg-vortex-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>

        <div className="glass rounded-3xl border-slate-800/50 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Price</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Stock</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Order</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-700" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{product.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{product.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
                      {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs font-bold px-2.5 py-1 rounded-full capitalize",
                      product.product_type === 'rank' 
                        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" 
                        : "bg-slate-800 text-slate-400 border border-slate-700/30"
                    )}>
                      {product.product_type || 'others'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{product.price} BDT</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs font-bold",
                      product.stock === -1 ? "text-green-500" : 
                      product.stock === 0 ? "text-red-500" : "text-slate-400"
                    )}>
                      {product.stock === -1 ? 'Unlimited' : product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 font-medium">#{product.order ?? 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setProductForm({
                            name: product.name,
                            description: getCleanDescription(product),
                            price: product.price,
                            stock: product.stock,
                            category_id: product.category_id,
                            image_url: product.image_url || '',
                            product_type: product.product_type || 'others',
                            order: product.order ?? 0
                          });
                          setPurchaseOptions(getProductPurchaseOptions(product));
                          setIsAddingProduct(true);
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setItemToDelete({ id: product.id, type: 'product' })}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Product Modal */}
      {isAddingProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass w-full max-w-2xl rounded-3xl border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Product Name</label>
                  <input
                    required
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category</label>
                  <select
                    required
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Product Type</label>
                  <select
                    required
                    value={productForm.product_type}
                    onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value as 'rank' | 'others' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                  >
                    <option value="others">Others (Normal)</option>
                    <option value="rank">Rank (Limit quantity to 1)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Price (BDT)</label>
                  <input
                    required
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Stock (-1 for Unlimited)</label>
                  <input
                    required
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Display Order</label>
                  <input
                    required
                    type="number"
                    value={productForm.order}
                    onChange={(e) => setProductForm({ ...productForm, order: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Image URL</label>
                <input
                  type="text"
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                  placeholder="https://example.com/image.png"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                />
              </div>

              {/* Purchase Options Section */}
              <div className="space-y-4 pt-4 border-t border-slate-800/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Multiple Purchase Buttons/Options</label>
                  <button
                    type="button"
                    onClick={() => {
                      const id = 'opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
                      setPurchaseOptions([...purchaseOptions, { id, name: '', price: 0, quantity: 1 }]);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500 border border-yellow-500/30 text-yellow-500 hover:text-slate-950 rounded-xl text-xs font-bold transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Button Option</span>
                  </button>
                </div>
                
                {purchaseOptions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No custom bundle/button options configured. This product will render with a single add-to-cart button using the base price and default values.</p>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {purchaseOptions.map((opt, index) => (
                      <div key={opt.id} className="flex gap-2 items-end bg-slate-900/60 p-3 rounded-2xl border border-slate-800/40">
                        <div className="flex-grow space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Button Text / Label</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. 10x Coins Pack"
                            value={opt.name}
                            onChange={(e) => {
                              const updated = [...purchaseOptions];
                              updated[index].name = e.target.value;
                              setPurchaseOptions(updated);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vortex-primary"
                          />
                        </div>
                        <div className="w-[85px] space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Price (BDT)</label>
                          <input
                            required
                            type="number"
                            placeholder="Price"
                            value={opt.price}
                            onChange={(e) => {
                              const updated = [...purchaseOptions];
                              updated[index].price = Number(e.target.value);
                              setPurchaseOptions(updated);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vortex-primary"
                          />
                        </div>
                        <div className="w-[65px] space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Qty (Items)</label>
                          <input
                            required
                            type="number"
                            placeholder="Qty"
                            value={opt.quantity}
                            onChange={(e) => {
                              const updated = [...purchaseOptions];
                              updated[index].quantity = Number(e.target.value);
                              setPurchaseOptions(updated);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vortex-primary"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPurchaseOptions(purchaseOptions.filter((_, idx) => idx !== index));
                          }}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-vortex-primary hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all neon-glow-purple"
              >
                {editingProduct ? 'Update Product' : 'Create Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isAddingCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-3xl border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category Name</label>
                <input
                  required
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Display Order</label>
                <input
                  required
                  type="number"
                  value={categoryForm.order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, order: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category Icon / Image URL</label>
                <input
                  type="text"
                  value={categoryForm.image_url}
                  onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })}
                  placeholder="https://example.com/icon.png"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                />
                <p className="text-[10px] text-slate-500 italic">Provide an icon image URL for this category to render in the Store popup selector.</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-vortex-primary hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all neon-glow-purple"
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
