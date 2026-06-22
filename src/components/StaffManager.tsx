import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StaffUser, Role } from '../types';
import { 
  Users, UserPlus, Mail, ShieldAlert, ShieldCheck, 
  Trash2, Edit2, Shield, Calendar, Plus, Save, X, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StaffManager: React.FC = () => {
  const { currentUser, staffUsers, addStaffUser, updateStaffUser, deleteStaffUser } = useApp();
  
  // State for form controls
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  
  // State for editing mode
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Protect view strictly
  if (!currentUser || currentUser.role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/60 border border-red-500/20 rounded-2xl text-center space-y-4">
        <ShieldAlert className="h-16 w-16 text-red-500 animate-bounce" />
        <h3 className="text-xl font-bold text-white">غير مصرح بدخول هذه الصفحة</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          عذراً، هذه اللوحة مخصصة لمالك الصالة حصرياً لإدارة الموظفين وتعديل حساباتهم وتعيين صلاحيات تشغيل الفروع.
        </p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('فضلاً، أدخل اسم الموظف كاملاً.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('فضلاً، أدخل بريداً إلكترونياً صالحاً لتسجيل الدخول.');
      return;
    }

    // Check duplicate email (excluding the user being edited)
    const normalizedEmail = email.trim().toLowerCase();
    const emailExists = staffUsers.some(
      u => u.uid !== editingUid && u.email.toLowerCase() === normalizedEmail
    );
    if (emailExists) {
      setErrorMsg('هذا البريد الإلكتروني مسجل بالفعل لموظف آخر.');
      return;
    }

    if (editingUid) {
      // Edit mode
      updateStaffUser(editingUid, {
        name: name.trim(),
        email: normalizedEmail,
        role
      });
      setSuccessMsg('تم تحديث بيانات وصلاحيات الموظف بنجاح.');
      setEditingUid(null);
    } else {
      // Add mode
      addStaffUser(name.trim(), normalizedEmail, role);
      setSuccessMsg('تمت إضافة الموظف الجديد بنجاح وتم منحه الصلاحيات.');
    }

    // Reset fields
    setName('');
    setEmail('');
    setRole('cashier');
  };

  const handleEditClick = (staff: StaffUser) => {
    setEditingUid(staff.uid);
    setName(staff.name);
    setEmail(staff.email);
    setRole(staff.role);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleCancelEdit = () => {
    setEditingUid(null);
    setName('');
    setEmail('');
    setRole('cashier');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleDeleteClick = (uid: string) => {
    if (uid === currentUser.uid) {
      setErrorMsg('لا يمكنك حذف حسابك الحالي الذي تستخدم تسجيل الدخول به!');
      return;
    }
    if (window.confirm('هل أنت متأكد من رغبتك في الاستغناء عن هذا الموظف وحذف حسابه نهائياً من الصالة؟')) {
      deleteStaffUser(uid);
      setSuccessMsg('تم حذف الموظف بنجاح وسحب كافة الصلاحيات المرتبطة به.');
    }
  };

  // Filtered staff list
  const filteredStaff = staffUsers.filter(
    u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Intro Header Card */}
      <div className="bg-gradient-to-l from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/15 p-6 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-6">
        <div className="space-y-1.5 matches-intro">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 font-bold px-3 py-1 rounded-full border border-indigo-500/10 text-xs">
            <Users className="h-3.5 w-3.5" />
            <span>نظام التحكم بالصلاحيات والموظفين العامة</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">بطاقات طاقم العمل وتأهيل الدخول</h2>
          <p className="text-xs text-slate-400">
            أضف طاقم العمل، حدد أدوارهم التشغيلية (كاشير، كابتن الصالة)، واجعلهم يسجلون الدخول بالبريد الإلكتروني المعتمد سحابياً.
          </p>
        </div>

        {/* Roles Quick Summary Infographics */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5 max-w-sm">
          <div className="flex items-center gap-1.5 text-[10px] text-yellow-400">
            <Info className="h-3 w-3" />
            <span className="font-bold">دليل سريع للصلاحيات والإثباتات:</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            ⚙️ <strong className="text-slate-200">المالك:</strong> إشراف شامل مع تعديل الصلاحيات المتقدمة.<br />
            💵 <strong className="text-slate-200">الكاشير:</strong> محاسبة، طلب بوفيه، إلغاء وبدء جلسة الشاشات.<br />
            🎮 <strong className="text-slate-200">الكابتن:</strong> تحكّم فوري في بدء الخدمة ومبيعات المقصف فقط.
          </p>
        </div>
      </div>

      {/* Grid of form and lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Form Column */}
        <div className="lg:col-span-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 space-y-5">
          <h3 className="text-md font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            {editingUid ? (
              <>
                <Edit2 className="h-4.5 w-4.5 text-indigo-400" />
                <span>تعديل بيانات الموظف</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4.5 w-4.5 text-indigo-400" />
                <span>إضافة موظف جديد</span>
              </>
            )}
          </h3>

          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl font-bold"
            >
              {errorMsg}
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl font-bold"
            >
              {successMsg}
            </motion.div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Employee Name */}
            <div className="space-y-1">
              <label className="text-xs text-slate-450 font-bold block">اسم الموظف:</label>
              <input 
                type="text" 
                placeholder="مثال: صالح المطيري"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Email for authentication */}
            <div className="space-y-1">
              <label className="text-xs text-slate-455 font-bold block">البريد الإلكتروني المعتمد:</label>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="name@email.com"
                  value={email}
                  disabled={!!(editingUid && editingUid.startsWith('u-') && !editingUid.startsWith('u-staff-'))}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-slate-250 outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left disabled:opacity-50"
                />
                <Mail className="h-4 w-4 text-slate-500 absolute top-3 right-3" />
              </div>
              <p className="text-[9px] text-slate-500">
                * سيسجل الموظف الدخول إلى البرنامج عن طريق هذا البريد تماماً (يدعم Google Auth والسحابي).
              </p>
            </div>

            {/* Role Radio Preset buttons */}
            <div className="space-y-2">
              <label className="text-xs text-slate-450 font-bold block">رتبة وصلاحية التشغيل:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('cashier')}
                  className={`p-2.5 rounded-xl border text-xs font-black text-center transition-all cursor-pointer ${
                    role === 'cashier' 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-705'
                  }`}
                >
                  💵 كاشير الصالة
                </button>
                <button
                  type="button"
                  onClick={() => setRole('captain')}
                  className={`p-2.5 rounded-xl border text-xs font-black text-center transition-all cursor-pointer ${
                    role === 'captain' 
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-705'
                  }`}
                >
                  🎮 كابتن الصالة
                </button>
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={`p-2.5 rounded-xl border text-xs font-black text-center col-span-2 transition-all cursor-pointer ${
                    role === 'owner' 
                      ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400 font-bold' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-705'
                  }`}
                >
                  👑 مالك شريك (كامل الصلاحيات)
                </button>
              </div>
            </div>

            {/* Buttons control */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                className="flex-grow py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {editingUid ? (
                  <>
                    <Save className="h-4 w-4" />
                    <span>حفظ التعديلات</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>تعيين موظف جديد</span>
                  </>
                )}
              </button>

              {editingUid && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="py-3 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Staff cards dashboard list */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* List Search Bar */}
          <div className="flex items-center gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs font-bold text-slate-400 shrink-0">مسح وبحث الموظفين:</span>
            <input 
              type="text"
              placeholder="ابحث بالاسم، البريد أو الفئة التشغيلية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 flex-grow"
            />
          </div>

          {/* Cards collection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff, idx) => (
                  <motion.div
                    key={staff.uid}
                    layoutId={`staff-card-${staff.uid}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className={`p-5 rounded-2xl border relative flex flex-col justify-between h-44 transition-all duration-300 ${
                      staff.uid === editingUid 
                        ? 'bg-indigo-950/20 border-indigo-500 ring-1 ring-indigo-500/20 shadow-lg' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Name & Role Header */}
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <h4 className="font-bold text-white text-sm tracking-tight">{staff.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono select-none block mt-0.5">UID: {staff.uid}</span>
                        </div>

                        {/* Role tag */}
                        {staff.role === 'owner' && (
                          <span className="text-[10px] font-bold text-yellow-500 bg-yellow-400/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1 select-none">
                            <Shield className="h-3 w-3" />
                            <span>المالك</span>
                          </span>
                        )}
                        {staff.role === 'cashier' && (
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/20 flex items-center gap-1 select-none">
                            <ShieldCheck className="h-3 w-3" />
                            <span>الكاشير</span>
                          </span>
                        )}
                        {staff.role === 'captain' && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-405/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20 flex items-center gap-1 select-none">
                            <ShieldCheck className="h-3 w-3" />
                            <span>الكابتن</span>
                          </span>
                        )}
                      </div>

                      {/* Email tag */}
                      <div className="flex items-center gap-2 mt-4 text-xs text-slate-350 bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                        <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="font-mono text-slate-300 select-all overflow-hidden text-ellipsis whitespace-nowrap">{staff.email}</span>
                      </div>
                    </div>

                    {/* Bottom stats & action footer */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800/60">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 select-none">
                        <Calendar className="h-3.5 w-3.5 text-slate-600" />
                        <span>انضم {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' }) : 'يناير ٢٠٢٦'}</span>
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEditClick(staff)}
                          title="تعديل حساب الموظف"
                          className="p-1.5 bg-slate-950 hover:bg-indigo-600/10 border border-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(staff.uid)}
                          disabled={staff.uid === currentUser.uid}
                          title={staff.uid === currentUser.uid ? "لا يمكن حذف الحساب الجاري" : "حذف الموظف نهائياً"}
                          className="p-1.5 bg-slate-950 hover:bg-red-600/10 border border-slate-800 text-red-400 hover:text-red-300 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12 bg-slate-900/40 border border-dashed border-slate-850 rounded-2xl space-y-2">
                  <p className="text-sm text-slate-400">عذراً، لم نجد أي موظف مطابق للبحث!</p>
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="text-xs text-indigo-400 underline font-bold hover:text-indigo-300 cursor-pointer"
                  >
                    إعادة تصفية القائمة
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

    </div>
  );
};
