import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MenuItem } from '../types';
import { 
  Coffee, Plus, Edit2, Trash2, ArrowUpRight, Search, 
  FolderPlus, DollarSign, Package, UserX, AlertTriangle 
} from 'lucide-react';

export const MenuManager: React.FC = () => {
  const { currentUser, menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'drinks' | 'snacks' | 'meals'>('all');

  // Create / Edit state variables
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(10);
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [category, setCategory] = useState<'drinks' | 'snacks' | 'meals'>('drinks');
  const [stock, setStock] = useState<number>(50);

  const isOwner = currentUser?.role === 'owner';

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItemId) {
      updateMenuItem({
        id: editingItemId,
        name,
        price,
        purchaseCost,
        category,
        stock
      });
    } else {
      addMenuItem(name, price, category, stock, purchaseCost);
    }

    // Reset Form
    setName('');
    setPrice(10);
    setPurchaseCost(0);
    setCategory('drinks');
    setStock(50);
    setEditingItemId(null);
    setIsFormOpen(false);
  };

  const handleTriggerEdit = (item: MenuItem) => {
    setName(item.name);
    setPrice(item.price);
    setPurchaseCost(item.purchaseCost || 0);
    setCategory(item.category);
    setStock(item.stock);
    setEditingItemId(item.id);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 text-right">
      
      {/* Header banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Coffee className="h-5 w-5 text-indigo-400" />
            إدارة البوفيه وقائمة الطلبات (الكافيه)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تهيئة الوجبات الخفيفة والمسليات مع رصد المخازن لتزويد اللاعبين بمشترواتهم وتحصيل تكلفتها على فواتير الجلسات تلقائياً.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => {
              setEditingItemId(null);
              setName('');
              setPrice(10);
              setPurchaseCost(0);
              setCategory('drinks');
              setStock(50);
              setIsFormOpen(true);
            }}
            className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FolderPlus className="h-4 w-4" />
            إضافة منتج بوفيه جديد للقائمة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Cafe Catalogue and Grid list (Cols 12 if no form, else custom grid layout) */}
        <div className={`${isFormOpen ? 'lg:col-span-8' : 'lg:col-span-12'} bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-5`}>
          
          {/* Filters catalog list */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            
            {/* Category selection row */}
            <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs w-full sm:w-auto overflow-x-auto justify-start">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'drinks', label: 'مشروبات' },
                { id: 'snacks', label: 'مسليات ومقرمشات' },
                { id: 'meals', label: 'ساندوتشات ووجبات' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="ابحث عن مشروب أو وجبة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="h-4 w-4 text-slate-500 absolute top-2 right-3" />
            </div>

          </div>

          {/* Catalog grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-slate-800 rounded-3xl text-slate-500">
              <p className="text-xs">لا توجد مأكولات أو مشروبات في هذا التصنيف حالياً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  className={`bg-slate-950/40 p-4 border rounded-2xl flex flex-col justify-between space-y-4 transition-all hover:border-slate-700 ${
                    item.stock === 0 ? 'border-red-500/20 bg-red-950/5' : 'border-slate-850'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-slate-800 text-indigo-400 px-2 py-0.5 rounded font-bold">
                        {item.category === 'drinks' ? 'مشروب' : item.category === 'snacks' ? 'مسليات' : 'وجبة طيبة'}
                      </span>
                      <h4 className="font-bold text-slate-100 text-sm mt-1.5">{item.name}</h4>
                    </div>
                    {item.stock === 0 && (
                      <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
                        نافذ من المخزن
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-900">
                    <div>
                      <span className="text-[9px] text-slate-500 block">سعر البيع</span>
                      <span className="text-emerald-400 font-bold font-mono text-sm">{(item.price || 0).toLocaleString('en-US')} د.ع</span>
                    </div>
                    {isOwner && (
                      <div>
                        <span className="text-[9px] text-slate-400 block">تكلفة الشراء</span>
                        <span className="text-amber-500 font-bold font-mono text-xs">{(item.purchaseCost || 0).toLocaleString('en-US')} د.ع</span>
                      </div>
                    )}
                    <div className="text-left">
                      <span className="text-[9px] text-slate-500 block">المخزون المتوفر</span>
                      <span className={`font-bold font-mono ${item.stock <= 5 ? 'text-amber-500' : 'text-indigo-400'}`}>
                        {item.stock} حـبة
                      </span>
                    </div>
                  </div>

                  {/* Operational controls for owners */}
                  {isOwner && (
                    <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-900">
                      <button
                        onClick={() => handleTriggerEdit(item)}
                        className="py-1 px-2.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        <Edit2 className="h-3 w-3 inline ml-1" />
                        تعديل / تمويل
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`⚠️ تحذير أمني: هل أنت متأكد من حذف الصنف [${item.name}] نهائياً من الصالة؟\n\nهذا الإجراء سيقوم بإزالة العنصر بالكامل ولن تتمكن من استرجاعه.`)) {
                            deleteMenuItem(item.id);
                          }
                        }}
                        className="p-1 px-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg cursor-pointer transition-all duration-200"
                        title="حذف صنف"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Edit / Add Side Panel (Cols 4) */}
        {isFormOpen && isOwner && (
          <div className="lg:col-span-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Coffee className="h-4.5 w-4.5 text-emerald-400" />
                {editingItemId ? 'تعديل وتمويل المنتج' : 'إضافة صنف كافيه جديد'}
              </span>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                إغلاق ×
              </button>
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block font-semibold">اسم الصنف:</label>
                <input
                  type="text"
                  placeholder="مثال: شاي بالنعناع"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 block font-semibold">سعر مبيع القطعة (د.ع):</label>
                    <input
                      type="number"
                      min="1"
                      value={price}
                      onChange={(e) => setPrice(Math.max(1, +e.target.value))}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 text-left font-mono font-bold text-emerald-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 block font-semibold">تكلفة الشراء (د.ع):</label>
                    <input
                      type="number"
                      min="0"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(Math.max(0, +e.target.value))}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 text-left font-mono font-bold text-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block font-semibold">مخزون رصيد السلع (بالقطعة):</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(Math.max(0, +e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 text-left font-mono text-indigo-400 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block font-semibold">فئة المبيعات:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="drinks">مشروب ساخن / بارد</option>
                  <option value="snacks">مسليات وحلويات ومقرمشات</option>
                  <option value="meals">ساندوتشات ووجبات خفيفة</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                حفظ بيانات المنتج
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Security notice for non-owners */}
      {!isOwner && (
        <div className="bg-slate-950/60 p-4 border border-indigo-500/10 text-indigo-400 rounded-xl flex items-center gap-2.5 text-xs text-right mt-4 select-none">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-500 flex-shrink-0" />
          <p>
            * <strong className="text-slate-100">صلاحية كاشير / كابتن:</strong> أنت متاح لديك بيع وإضافة المشروبات على فواتير اللاعبين الجارية مباشرة، ولكن لتغيير أسعار البيع أو إضافة وجبات جديدة أو تعديل جرد المخزن، يرجى مراجعة إدارة قاعة الألعاب (المالك) مخولاً بذلك التعديل المصرح.
          </p>
        </div>
      )}

    </div>
  );
};
