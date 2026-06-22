import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  StaffUser, Device, Customer, Subscription, MenuItem, GameSession, Transaction, 
  Role, PRESET_DEVICES, PRESET_MENU_ITEMS, PRESET_SUB_PLANS, SubscriptionPlan, OrderItem,
  ActivityLog
} from '../types';
import { playBuzzerSound } from '../utils/audio';

// Firestore imports
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, getDoc, getDocs
} from 'firebase/firestore';
import { 
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

// Hardcoded staff accounts with custom profiles
export const LOUNGE_STAFF_ACCOUNTS: StaffUser[] = [
  { uid: 'u-owner', name: 'أبو أحمد (المالك)', email: 'owner@lounge.com', role: 'owner', createdAt: '2026-01-01T00:00:00Z' },
  { uid: 'u-cashier', name: 'سامر (الكاشير)', email: 'cashier@lounge.com', role: 'cashier', createdAt: '2026-01-01T00:00:00Z' },
  { uid: 'u-captain', name: 'علي (كابتن الصالة)', email: 'captain@lounge.com', role: 'captain', createdAt: '2026-01-01T00:00:00Z' },
];

interface AppContextType {
  currentUser: StaffUser | null;
  login: (email: string, role: string) => boolean;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  devices: Device[];
  customers: Customer[];
  subscriptions: Subscription[];
  menuItems: MenuItem[];
  sessions: GameSession[];
  transactions: Transaction[];
  subscriptionPlans: SubscriptionPlan[];
  
  // Handlers
  addCustomer: (name: string, phone: string, notes?: string) => Customer;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  
  startSession: (deviceId: string, customerId: string, sessionType: 'open' | 'fixed', playType: 'single' | 'multi', fixedDuration?: number) => void;
  addOrderToSession: (sessionId: string, itemId: string, quantity: number) => void;
  removeOrderFromSession: (sessionId: string, orderItemId: string) => void;
  checkoutSession: (sessionId: string, discount: number, paymentMethod: 'cash' | 'card' | 'subscription', useLoyaltyReward?: boolean) => void;
  cancelSession: (sessionId: string) => void;
  
  addSubscription: (customerId: string, planId: string) => Subscription | undefined;
  cancelSubscription: (subId: string) => void;
  
  // Cafe
  addMenuItem: (name: string, price: number, category: 'drinks' | 'snacks' | 'meals', stock: number, purchaseCost?: number) => void;
  updateMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;

  // Devices Control
  addDevice: (name: string, type: string, section: 'standard' | 'vip' | 'billiards', hourlyRateSingle: number, hourlyRateMulti: number) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  deleteDevice: (id: string) => void;
  
  // Transactions
  addExpense: (amount: number, description: string, paymentMethod: 'cash' | 'card') => void;
  addDirectSale: (customerName: string, cartItems: { item: MenuItem; quantity: number }[], paymentMethod: 'cash' | 'card') => Promise<GameSession>;
  
  // Staff management
  staffUsers: StaffUser[];
  addStaffUser: (name: string, email: string, role: Role) => void;
  updateStaffUser: (uid: string, updates: Partial<StaffUser>) => void;
  deleteStaffUser: (uid: string) => void;

  // Helpers
  calculateRuntimePlayAmount: (session: GameSession) => number;
  alertedSessions: string[];
  clearAllTestData: () => Promise<void>;
  clearActivityLogs: () => Promise<void>;

  // Activity Log
  activityLogs: ActivityLog[];
  addLog: (type: ActivityLog['type'], action: string, details: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const stored = localStorage.getItem('ps_current_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [dbReady, setDbReady] = useState(false);

  // Local storage state fallbacks
  const [devices, setDevices] = useState<Device[]>(PRESET_DEVICES);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(PRESET_MENU_ITEMS);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptionPlans] = useState<SubscriptionPlan[]>(PRESET_SUB_PLANS);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(() => {
    const stored = localStorage.getItem('ps_staff_users');
    return stored ? JSON.parse(stored) : LOUNGE_STAFF_ACCOUNTS;
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Mode detection: if Firebase is logged in, we sync with Firestore
  const isLocalStorageMode = !auth.currentUser;

  // React to auth changes to fetch user details and sync state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const profile = userSnap.data() as StaffUser;
            setCurrentUser(profile);
            localStorage.setItem('ps_current_user', JSON.stringify(profile));
          } else {
            // New Google signup - check if preauthorized by owner in 'users' collection
            const usersRef = collection(db, 'users');
            const usersSnap = await getDocs(usersRef);
            const existingPreAuth = usersSnap.docs.find(
              doc => {
                const data = doc.data();
                return data.email && data.email.toLowerCase() === (user.email || '').toLowerCase();
              }
            );

            let role: Role = user.email === 'mero7.rap7@gmail.com' ? 'owner' : 'cashier';
            let name = user.displayName || user.email?.split('@')[0] || 'كاشير الصالة';

            if (existingPreAuth) {
              const data = existingPreAuth.data() as StaffUser;
              role = data.role;
              name = data.name;
              // Clean up the temporary pre-auth document if its ID is different from user.uid
              if (existingPreAuth.id !== user.uid) {
                await deleteDoc(doc(db, 'users', existingPreAuth.id)).catch(err => console.error("Could not delete legacy pre-auth doc", err));
              }
            }

            const userDoc: StaffUser = {
              uid: user.uid,
              name,
              email: user.email || '',
              role,
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), userDoc);
            setCurrentUser(userDoc);
            localStorage.setItem('ps_current_user', JSON.stringify(userDoc));
          }
        } catch (e) {
          console.error("Failed to fetch or create user profile from Firestore:", e);
        }
      } else {
        // Fallback local storage profile if not logged in with firebase
        const stored = localStorage.getItem('ps_current_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.uid && parsed.uid.startsWith('u-')) {
            setCurrentUser(parsed);
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
    });
    return () => unsub();
  }, []);

  // Sync state between tabs elements when in local storage mode
  useEffect(() => {
    if (!isLocalStorageMode) return;

    // Load initial states from LocalStorage for local testing
    const storedDevices = localStorage.getItem('ps_devices');
    if (storedDevices) setDevices(JSON.parse(storedDevices));

    const storedCustomers = localStorage.getItem('ps_customers');
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    } else {
      const defaultCust: Customer[] = [
        { id: 'c1', name: 'أحمد محمود (شطب)', phone: '0599111222', notes: 'زبون دائم يفضل ذراع تحكم زرقاء', subscriptionId: 'sub-demo-1', createdAt: '2026-05-10T12:00:00Z', visitsCount: 14, loyaltyPoints: 4, unclaimedRewards: 1 },
        { id: 'c2', name: 'يوسف العتيبي', phone: '0555444333', notes: 'يلعب في أوقات المساء فقط', subscriptionId: null, createdAt: '2026-06-01T14:30:00Z', visitsCount: 8, loyaltyPoints: 3, unclaimedRewards: 0 },
        { id: 'c3', name: 'خالد العنزي', phone: '0500112233', notes: '', subscriptionId: null, createdAt: '2026-06-05T18:00:00Z', visitsCount: 2, loyaltyPoints: 2, unclaimedRewards: 0 }
      ];
      setCustomers(defaultCust);
    }

    const storedSubs = localStorage.getItem('ps_subscriptions');
    if (storedSubs) {
      setSubscriptions(JSON.parse(storedSubs));
    } else {
      const defaultSubs: Subscription[] = [
        {
          id: 'sub-demo-1',
          customerId: 'c1',
          customerName: 'أحمد محمود',
          planName: 'الاشتراك الفضي (10 ساعات)',
          type: 'hours',
          totalHours: 10,
          remainingHours: 7.5,
          pricePaid: 250,
          startDate: '2026-06-01T10:00:00Z',
          endDate: '2026-07-01T10:00:00Z',
          status: 'active'
        }
      ];
      setSubscriptions(defaultSubs);
    }

    const storedMenu = localStorage.getItem('ps_menu_items');
    if (storedMenu) setMenuItems(JSON.parse(storedMenu));

    const storedSessions = localStorage.getItem('ps_sessions');
    if (storedSessions) setSessions(JSON.parse(storedSessions));

    const storedTx = localStorage.getItem('ps_transactions');
    if (storedTx) {
      setTransactions(JSON.parse(storedTx));
    } else {
      const defaultTransactions: Transaction[] = [
        { id: 'tx-1', sessionId: null, type: 'subscription_payment', amount: 250, description: 'بيع اشتراك شهري: أحمد محمود', paymentMethod: 'cash', timestamp: '2026-06-01T10:05:00Z', staffName: 'سامر (الكاشير)' }
      ];
      setTransactions(defaultTransactions);
    }

    const storedLogs = localStorage.getItem('ps_activity_logs');
    if (storedLogs) {
      setActivityLogs(JSON.parse(storedLogs));
    } else {
      setActivityLogs([]);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === 'ps_devices') setDevices(e.newValue ? JSON.parse(e.newValue) : PRESET_DEVICES);
      else if (e.key === 'ps_customers') setCustomers(e.newValue ? JSON.parse(e.newValue) : []);
      else if (e.key === 'ps_subscriptions') setSubscriptions(e.newValue ? JSON.parse(e.newValue) : []);
      else if (e.key === 'ps_menu_items') setMenuItems(e.newValue ? JSON.parse(e.newValue) : PRESET_MENU_ITEMS);
      else if (e.key === 'ps_sessions') setSessions(e.newValue ? JSON.parse(e.newValue) : []);
      else if (e.key === 'ps_transactions') setTransactions(e.newValue ? JSON.parse(e.newValue) : []);
      else if (e.key === 'ps_current_user') setCurrentUser(e.newValue ? JSON.parse(e.newValue) : null);
      else if (e.key === 'ps_staff_users') setStaffUsers(e.newValue ? JSON.parse(e.newValue) : LOUNGE_STAFF_ACCOUNTS);
      else if (e.key === 'ps_activity_logs') setActivityLogs(e.newValue ? JSON.parse(e.newValue) : []);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isLocalStorageMode]);

  // Real-time Firestore Sync Listeners (Enabled strictly when logged into Firebase)
  useEffect(() => {
    if (isLocalStorageMode) {
      setDbReady(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // 1. Sync Devices
    const pathDevices = 'devices';
    const unsubDevices = onSnapshot(collection(db, pathDevices), (snapshot) => {
      if (snapshot.empty) {
        // Safe database seeding
        PRESET_DEVICES.forEach((d) => {
          setDoc(doc(db, pathDevices, d.id), d)
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `${pathDevices}/${d.id}`));
        });
      } else {
        const items = snapshot.docs.map(doc => ({ ...doc.data() } as Device));
        setDevices(items.sort((a, b) => a.id.localeCompare(b.id)));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathDevices);
    });
    unsubscribers.push(unsubDevices);

    // 2. Sync Menu Items
    const pathMenu = 'menuItems';
    const unsubMenu = onSnapshot(collection(db, pathMenu), (snapshot) => {
      if (snapshot.empty) {
        // Safe database seeding
        PRESET_MENU_ITEMS.forEach((m) => {
          setDoc(doc(db, pathMenu, m.id), m)
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `${pathMenu}/${m.id}`));
        });
      } else {
        const items = snapshot.docs.map(doc => ({ ...doc.data() } as MenuItem));
        setMenuItems(items);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathMenu);
    });
    unsubscribers.push(unsubMenu);

    // 3. Sync Customers
    const pathCust = 'customers';
    const unsubCust = onSnapshot(collection(db, pathCust), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data() } as Customer));
      setCustomers(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathCust);
    });
    unsubscribers.push(unsubCust);

    // 4. Sync Subscriptions
    const pathSub = 'subscriptions';
    const unsubSub = onSnapshot(collection(db, pathSub), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data() } as Subscription));
      setSubscriptions(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathSub);
    });
    unsubscribers.push(unsubSub);

    // 5. Sync Sessions
    const pathSess = 'sessions';
    const unsubSess = onSnapshot(collection(db, pathSess), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data() } as GameSession));
      setSessions(items.sort((a, b) => b.startTime.localeCompare(a.startTime)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathSess);
    });
    unsubscribers.push(unsubSess);

    // 6. Sync Transactions
    const pathTx = 'transactions';
    const unsubTx = onSnapshot(collection(db, pathTx), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data() } as Transaction));
      setTransactions(items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathTx);
    });
    unsubscribers.push(unsubTx);

    // 7. Sync Staff Users
    const pathUsers = 'users';
    const unsubUsers = onSnapshot(collection(db, pathUsers), (snapshot) => {
      if (snapshot.empty) {
        LOUNGE_STAFF_ACCOUNTS.forEach((u) => {
          setDoc(doc(db, pathUsers, u.uid), u)
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `${pathUsers}/${u.uid}`));
        });
      } else {
        const items = snapshot.docs.map(doc => ({ ...doc.data() } as StaffUser));
        setStaffUsers(items);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathUsers);
    });
    unsubscribers.push(unsubUsers);

    // 8. Sync Activity Logs (Read strictly for Owner, handles permission gracefully otherwise)
    const pathLogs = 'activityLogs';
    const unsubLogs = onSnapshot(collection(db, pathLogs), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data() } as ActivityLog));
      setActivityLogs(items.sort((a, b) => {
        const timeA = a.timestamp || '';
        const timeB = b.timestamp || '';
        return timeB.localeCompare(timeA);
      }));
    }, (error) => {
      console.warn("Activity logs read skipped or unauthorized: ", error);
    });
    unsubscribers.push(unsubLogs);

    setDbReady(true);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [isLocalStorageMode, currentUser?.uid]);

  // Save state helper for local storage sync mode
  const saveState = (key: string, data: any, setter: Function) => {
    localStorage.setItem(key, JSON.stringify(data));
    setter(data);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(data) }));
  };

  // Add Log function to capture system events
  const addLog = (type: ActivityLog['type'], action: string, details: string) => {
    const id = 'log-' + Math.random().toString(36).substring(2, 11);
    const newLog: ActivityLog = {
      id,
      type,
      action,
      details,
      staffName: currentUser?.name || 'مدير النظام',
      staffRole: currentUser?.role || 'owner',
      timestamp: new Date().toISOString()
    };

    if (isLocalStorageMode) {
      const stored = localStorage.getItem('ps_activity_logs');
      const currentLogs: ActivityLog[] = stored ? JSON.parse(stored) : [];
      const updated = [newLog, ...currentLogs].slice(0, 5000);
      saveState('ps_activity_logs', updated, setActivityLogs);
    } else {
      setDoc(doc(db, 'activityLogs', id), newLog)
        .catch(err => {
          console.error("Failed to commit activity log to Firestore:", err);
        });
    }
  };

  // State Tick Refresher for Play session counters
  const [alertedSessions, setAlertedSessions] = useState<string[]>([]);
  const [triggerTick, setTriggerTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTriggerTick(prev => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Compute live billing costs
  const calculateRuntimePlayAmount = (session: GameSession): number => {
    if (session.status !== 'active') return session.totalPlayAmount;
    
    const start = new Date(session.startTime).getTime();
    const now = Date.now();
    const elapsedMinutes = Math.max(0, (now - start) / (1000 * 60));

    if (session.sessionType === 'fixed' && session.fixedDuration) {
      const minutesRatio = session.fixedDuration / 60;
      return +(minutesRatio * session.hourlyRate).toFixed(2);
    } else {
      const hours = elapsedMinutes / 60;
      return +(hours * session.hourlyRate).toFixed(2);
    }
  };

  // Sound buzzers for alerts
  useEffect(() => {
    const activeSessions = sessions.filter(s => s.status === 'active' && s.sessionType === 'fixed' && s.fixedDuration);
    
    activeSessions.forEach(session => {
      const start = new Date(session.startTime).getTime();
      const allocatedMs = (session.fixedDuration || 0) * 60 * 1005;
      const end = start + allocatedMs;
      const now = Date.now();

      if (now >= end && !alertedSessions.includes(session.id)) {
        playBuzzerSound();
        setAlertedSessions(prev => [...prev, session.id]);
      }
    });

    setAlertedSessions(prev => prev.filter(id => sessions.some(s => s.id === id && s.status === 'active')));
  }, [sessions, triggerTick]);

  // Authentication controllers
  const login = (email: string, role: string): boolean => {
    const matched = staffUsers.find(
      s => s.email.toLowerCase() === email.toLowerCase() && s.role === role
    );
    if (matched) {
      saveState('ps_current_user', matched, setCurrentUser);
      return true;
    }
    return false;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const role: Role = user.email === 'mero7.rap7@gmail.com' ? 'owner' : 'cashier';
      const userDoc: StaffUser = {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'كاشير الصالة',
        email: user.email || '',
        role,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userDoc);
      setCurrentUser(userDoc);
      localStorage.setItem('ps_current_user', JSON.stringify(userDoc));
      return true;
    } catch (e) {
      console.error("Google sign-in error", e);
      return false;
    }
  };

  const logout = () => {
    if (auth.currentUser) {
      signOut(auth).catch(console.error);
    }
    saveState('ps_current_user', null, setCurrentUser);
  };

  // Handlers - Customer Database
  const addCustomer = (name: string, phone: string, notes: string = ''): Customer => {
    const id = 'cust-' + Math.random().toString(36).substr(2, 9);
    const newCust: Customer = {
      id,
      name,
      phone,
      notes,
      subscriptionId: null,
      createdAt: new Date().toISOString(),
      visitsCount: 0,
      loyaltyPoints: 0,
      unclaimedRewards: 0
    };

    if (isLocalStorageMode) {
      const updated = [newCust, ...customers];
      saveState('ps_customers', updated, setCustomers);
    } else {
      setDoc(doc(db, 'customers', id), newCust)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `customers/${id}`));
    }
    addLog('customer', 'إضافة زبون جديد', `تم تسجيل زبون جديد باسم: ${name} وهاتف: ${phone}`);
    return newCust;
  };

  const updateCustomer = (updatedCust: Customer) => {
    if (isLocalStorageMode) {
      const updated = customers.map(c => c.id === updatedCust.id ? updatedCust : c);
      saveState('ps_customers', updated, setCustomers);
    } else {
      setDoc(doc(db, 'customers', updatedCust.id), updatedCust)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `customers/${updatedCust.id}`));
    }
    const oldCust = customers.find(c => c.id === updatedCust.id);
    const oldNotes = oldCust?.notes || '';
    const newNotes = updatedCust.notes || '';
    const notesDetail = oldNotes !== newNotes ? ` (ملاحظات: ${newNotes})` : '';
    addLog('customer', 'تعديل بيانات زبون', `تم تحديث بيانات الزبون: ${updatedCust.name}${notesDetail}`);
  };

  const deleteCustomer = (id: string) => {
    const cust = customers.find(c => c.id === id);
    const custName = cust ? cust.name : id;
    if (isLocalStorageMode) {
      const updated = customers.filter(c => c.id !== id);
      saveState('ps_customers', updated, setCustomers);
    } else {
      deleteDoc(doc(db, 'customers', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `customers/${id}`));
    }
    addLog('customer', 'حذف زبون', `تم إزالة الزبون: ${custName}`);
  };

  // Handlers - Play Session Control Actions
  const startSession = (
    deviceId: string, 
    customerId: string, 
    sessionType: 'open' | 'fixed', 
    playType: 'single' | 'multi', 
    fixedDuration?: number
  ) => {
    const device = devices.find(d => d.id === deviceId);
    const hasActiveSession = sessions.some(s => s.deviceId === deviceId && s.status === 'active');
    if (!device || hasActiveSession) return;

    const matchedCust = customers.find(c => c.id === customerId);
    const customerName = matchedCust ? matchedCust.name : 'زبون عابر (ضيف)';
    
    const rate = playType === 'single' ? device.hourlyRateSingle : device.hourlyRateMulti;
    const sessionId = 'sess-' + Math.random().toString(36).substr(2, 9);
    
    const newSession: GameSession = {
      id: sessionId,
      deviceId,
      deviceName: device.name,
      customerId,
      customerName,
      startTime: new Date().toISOString(),
      endTime: sessionType === 'fixed' && fixedDuration ? new Date(Date.now() + fixedDuration * 60000).toISOString() : null,
      sessionType,
      playType,
      fixedDuration: fixedDuration || null,
      hourlyRate: rate,
      status: 'active',
      orders: [],
      totalPlayAmount: 0,
      totalOrdersAmount: 0,
      discountAmount: 0,
      finalAmount: 0,
      paymentMethod: null
    };

    if (isLocalStorageMode) {
      const updatedDevices = devices.map(d => d.id === deviceId ? { ...d, status: 'busy' as const, currentSessionId: sessionId } : d);
      saveState('ps_devices', updatedDevices, setDevices);

      const updatedSessions = [newSession, ...sessions];
      saveState('ps_sessions', updatedSessions, setSessions);
    } else {
      // Optimistic client-side updates for instantaneous UI response
      const updatedDevices = devices.map(d => d.id === deviceId ? { ...d, status: 'busy' as const, currentSessionId: sessionId } : d);
      setDevices(updatedDevices);
      setSessions([newSession, ...sessions]);

      // Save database files
      const devDoc = { ...device, status: 'busy' as const, currentSessionId: sessionId };
      setDoc(doc(db, 'devices', deviceId), devDoc)
        .then(() => {
          setDoc(doc(db, 'sessions', sessionId), newSession);
        })
        .catch(err => {
          // Revert optimistic updates on failure
          setDevices(devices);
          setSessions(sessions);
          handleFirestoreError(err, OperationType.WRITE, `sessions/${sessionId}`);
        });
    }

    const playTypeStr = playType === 'single' ? 'منفرد' : 'مزدوج';
    const durationStr = sessionType === 'fixed' ? `لوقت محدد (${fixedDuration} دقيقة)` : 'لوقت مفتوح';
    addLog('session', 'بدء جلسة لعب', `تم بدء جلسة لعب للجهاز (${device.name}) للزبون (${customerName}) - نوع اللعب (${playTypeStr}) ${durationStr}`);
  };

  // Handlers - Cafeteria Orders on Active Sessions
  const addOrderToSession = (sessionId: string, itemId: string, quantity: number) => {
    const item = menuItems.find(m => m.id === itemId);
    if (!item) return;

    if (isLocalStorageMode) {
      const updatedSessions = sessions.map(s => {
        if (s.id !== sessionId) return s;

        const existingOrderIndex = s.orders.findIndex(o => o.id === itemId);
        let updatedOrders = [...s.orders];

        if (existingOrderIndex >= 0) {
          updatedOrders[existingOrderIndex] = {
            ...updatedOrders[existingOrderIndex],
            quantity: updatedOrders[existingOrderIndex].quantity + quantity
          };
        } else {
          updatedOrders.push({
            id: item.id,
            name: item.name,
            quantity,
            price: item.price,
            purchaseCost: item.purchaseCost || 0,
            timestamp: new Date().toISOString()
          });
        }

        const totalOrdersAmount = updatedOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
        return { ...s, orders: updatedOrders, totalOrdersAmount };
      });

      const updatedMenu = menuItems.map(m => m.id === itemId ? { ...m, stock: Math.max(0, m.stock - quantity) } : m);
      saveState('ps_menu_items', updatedMenu, setMenuItems);
      saveState('ps_sessions', updatedSessions, setSessions);
    } else {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const existingOrderIndex = session.orders.findIndex(o => o.id === itemId);
      let updatedOrders = [...session.orders];

      if (existingOrderIndex >= 0) {
        updatedOrders[existingOrderIndex] = {
          ...updatedOrders[existingOrderIndex],
          quantity: updatedOrders[existingOrderIndex].quantity + quantity
        };
      } else {
        updatedOrders.push({
          id: item.id,
          name: item.name,
          quantity,
          price: item.price,
          purchaseCost: item.purchaseCost || 0,
          timestamp: new Date().toISOString()
        });
      }

      const totalOrdersAmount = updatedOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
      
      // Update session & menu stock in Firebase
      setDoc(doc(db, 'sessions', sessionId), {
        ...session,
        orders: updatedOrders,
        totalOrdersAmount
      }).then(() => {
        setDoc(doc(db, 'menuItems', itemId), {
          ...item,
          stock: Math.max(0, item.stock - quantity)
        });
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `sessions/${sessionId}`));
    }

    const session = sessions.find(s => s.id === sessionId);
    const sessionName = session ? `للجهاز ${session.deviceName} / ${session.customerName}` : sessionId;
    addLog('session', 'إضافة طلب مقهى للجلسة', `تم إضافة طلب (${item.name} عدد ${quantity}) بقيمة (${item.price * quantity}) ر.س ${sessionName}`);
  };

  const removeOrderFromSession = (sessionId: string, orderItemId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const matchedOrder = session?.orders.find(o => o.id === orderItemId);
    if (matchedOrder) {
      const sessionName = session ? `للجهاز ${session.deviceName} / ${session.customerName}` : sessionId;
      addLog('session', 'إزالة طلب مقهى من الجلسة', `تم إزالة طلب (${matchedOrder.name} عدد ${matchedOrder.quantity}) من المبيعات ${sessionName}`);
    }

    if (isLocalStorageMode) {
      const updatedSessions = sessions.map(s => {
        if (s.id !== sessionId) return s;

        const matchedOrderLocal = s.orders.find(o => o.id === orderItemId);
        if (!matchedOrderLocal) return s;

        const updatedOrders = s.orders.filter(o => o.id !== orderItemId);
        const totalOrdersAmount = updatedOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);

        const updatedMenu = menuItems.map(m => m.id === orderItemId ? { ...m, stock: m.stock + matchedOrderLocal.quantity } : m);
        saveState('ps_menu_items', updatedMenu, setMenuItems);

        return { ...s, orders: updatedOrders, totalOrdersAmount };
      });
      saveState('ps_sessions', updatedSessions, setSessions);
    } else {
      const item = menuItems.find(m => m.id === orderItemId);
      if (!session) return;

      const matchedOrderRemote = session.orders.find(o => o.id === orderItemId);
      if (!matchedOrderRemote) return;

      const updatedOrders = session.orders.filter(o => o.id !== orderItemId);
      const totalOrdersAmount = updatedOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);

      setDoc(doc(db, 'sessions', sessionId), {
        ...session,
        orders: updatedOrders,
        totalOrdersAmount
      }).then(() => {
        if (item) {
          setDoc(doc(db, 'menuItems', orderItemId), {
            ...item,
            stock: item.stock + matchedOrderRemote.quantity
          });
        }
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `sessions/${sessionId}`));
    }
  };

  // Handlers - Close session & bill 
  const checkoutSession = (
    sessionId: string, 
    discount: number = 0, 
    paymentMethod: 'cash' | 'card' | 'subscription',
    useLoyaltyReward: boolean = false
  ) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== 'active') return;

    const playAmt = calculateRuntimePlayAmount(session);
    let finalPlayAmt = playAmt;

    const device = devices.find(d => d.id === session.deviceId);
    const isSubPayment = paymentMethod === 'subscription' && session.customerId !== 'guest';

    if (isSubPayment) {
      const customer = customers.find(c => c.id === session.customerId);
      const sub = customer && customer.subscriptionId ? subscriptions.find(s => s.id === customer.subscriptionId) : null;
      
      let elapsedHours = 0;
      if (session.sessionType === 'fixed' && session.fixedDuration) {
        elapsedHours = session.fixedDuration / 60;
      } else {
        const start = new Date(session.startTime).getTime();
        elapsedHours = Math.max(0.01, (Date.now() - start) / (1000 * 3600));
      }

      if (sub) {
        if (sub.type === 'unlimited') {
          let extraMultiCharge = 0;
          if (session.playType === 'multi' && device) {
            extraMultiCharge = +(elapsedHours * (device.hourlyRateMulti - device.hourlyRateSingle)).toFixed(2);
          }
          finalPlayAmt = extraMultiCharge;
        } else if (sub.type === 'hours') {
          const remainingHours = sub.remainingHours;
          const hoursCovered = Math.min(elapsedHours, remainingHours);
          const extraHours = Math.max(0, elapsedHours - remainingHours);
          
          let extraMultiCharge = 0;
          if (session.playType === 'multi' && device) {
            extraMultiCharge = +(hoursCovered * (device.hourlyRateMulti - device.hourlyRateSingle)).toFixed(2);
          }
          
          const extraHoursCost = extraHours * session.hourlyRate;
          finalPlayAmt = +(extraHoursCost + extraMultiCharge).toFixed(2);
        }
      } else {
        finalPlayAmt = playAmt;
      }
    }

    const subTotal = finalPlayAmt + session.totalOrdersAmount;
    const finalAmount = Math.max(0, subTotal - discount);

    const checkEndTime = new Date().toISOString();
    const checkClosedAt = new Date().toISOString();
    const checkedBy = currentUser?.name || 'قائد الوردية';

    const updatedSession: GameSession = {
      ...session,
      status: 'completed' as const,
      endTime: checkEndTime,
      totalPlayAmount: finalPlayAmt,
      discountAmount: discount,
      finalAmount,
      paymentMethod,
      closedAt: checkClosedAt,
      endedBy: checkedBy
    };

    const newTxId = 'tx-' + Math.random().toString(36).substr(2, 9);
    const newTx: Transaction = {
      id: newTxId,
      sessionId,
      type: 'session_payment',
      amount: finalAmount,
      description: `تسوية جلسة ${session.deviceName} - ${session.customerName}` + (isSubPayment && session.playType === 'multi' ? ' (فرق لعب زوجي)' : ''),
      paymentMethod: paymentMethod === 'subscription' ? 'cash' : paymentMethod,
      timestamp: new Date().toISOString(),
      staffName: currentUser?.name || 'كاشير الصالة'
    };

    // Calculate updated customer loyalty data
    let updatedCustomerObj: Customer | null = null;
    if (session.customerId !== 'guest') {
      const customer = customers.find(c => c.id === session.customerId);
      if (customer) {
        const currentVisits = (customer.visitsCount || 0) + 1;
        let currentPoints = (customer.loyaltyPoints || 0) + 1;
        let currentUnclaimed = customer.unclaimedRewards || 0;

        if (useLoyaltyReward && currentUnclaimed > 0) {
          currentUnclaimed -= 1;
        }

        if (currentPoints >= 5) {
          const earned = Math.floor(currentPoints / 5);
          currentUnclaimed += earned;
          currentPoints = currentPoints % 5;
        }

        updatedCustomerObj = {
          ...customer,
          visitsCount: currentVisits,
          loyaltyPoints: currentPoints,
          unclaimedRewards: currentUnclaimed
        };
      }
    }

    if (isLocalStorageMode) {
      const updatedSessions = sessions.map(s => s.id === sessionId ? updatedSession : s);
      const updatedDevices = devices.map(d => d.currentSessionId === sessionId ? { ...d, status: 'available' as const, currentSessionId: null } : d);
      saveState('ps_devices', updatedDevices, setDevices);

      if (paymentMethod === 'subscription' && session.customerId !== 'guest') {
        let elapsedHours = 0;
        if (session.sessionType === 'fixed' && session.fixedDuration) {
          elapsedHours = session.fixedDuration / 60;
        } else {
          const start = new Date(session.startTime).getTime();
          elapsedHours = Math.max(0.01, (Date.now() - start) / (1000 * 3600));
        }
        
        const customer = customers.find(c => c.id === session.customerId);
        if (customer && customer.subscriptionId) {
          const updatedSubs = subscriptions.map(sub => {
            if (sub.id === customer.subscriptionId && sub.type === 'hours') {
              const hoursDeducted = Math.min(elapsedHours, sub.remainingHours);
              return { ...sub, remainingHours: Math.max(0, +(sub.remainingHours - hoursDeducted).toFixed(2)) };
            }
            return sub;
          });
          saveState('ps_subscriptions', updatedSubs, setSubscriptions);
        }
      }

      if (updatedCustomerObj) {
        const updatedCusts = customers.map(c => c.id === updatedCustomerObj!.id ? updatedCustomerObj! : c);
        saveState('ps_customers', updatedCusts, setCustomers);
      }

      saveState('ps_transactions', [newTx, ...transactions], setTransactions);
      saveState('ps_sessions', updatedSessions, setSessions);
    } else {
      const device = devices.find(d => d.id === session.deviceId);
      
      const p1 = device 
         ? setDoc(doc(db, 'devices', session.deviceId), { ...device, status: 'available' as const, currentSessionId: null })
         : Promise.resolve();

      const p2 = setDoc(doc(db, 'sessions', sessionId), updatedSession);
      const p3 = setDoc(doc(db, 'transactions', newTxId), newTx);

      let p4 = Promise.resolve();
      if (paymentMethod === 'subscription' && session.customerId !== 'guest') {
        let elapsedHours = 0;
        if (session.sessionType === 'fixed' && session.fixedDuration) {
          elapsedHours = session.fixedDuration / 60;
        } else {
          const start = new Date(session.startTime).getTime();
          elapsedHours = Math.max(0.01, (Date.now() - start) / (1000 * 3600));
        }
        
        const customer = customers.find(c => c.id === session.customerId);
        if (customer && customer.subscriptionId) {
          const sub = subscriptions.find(s => s.id === customer.subscriptionId);
          if (sub && sub.type === 'hours') {
            const hoursDeducted = Math.min(elapsedHours, sub.remainingHours);
            p4 = setDoc(doc(db, 'subscriptions', sub.id), {
              ...sub,
              remainingHours: Math.max(0, +(sub.remainingHours - hoursDeducted).toFixed(2))
            });
          }
        }
      }

      const pLoyalty = updatedCustomerObj 
        ? setDoc(doc(db, 'customers', updatedCustomerObj.id), updatedCustomerObj) 
        : Promise.resolve();

      Promise.all([p1, p2, p3, p4, pLoyalty]).catch(err => handleFirestoreError(err, OperationType.WRITE, `checkout/${sessionId}`));
    }
    const methodStr = paymentMethod === 'cash' ? 'نقداً' : paymentMethod === 'card' ? 'شبكة (بطاقة)' : 'من رصيد العضوية';
    const discountStr = discount > 0 ? ` (خصم بقيمة ${discount} ر.س)` : '';
    const totalPlayCalculated = calculateRuntimePlayAmount(session);
    const finalBillTotal = Math.max(0, totalPlayCalculated + session.totalOrdersAmount - discount);
    addLog('session', 'إنهاء الفاتورة والجلسة', `تم إغلاق جلسة (${session.deviceName}) للزبون (${session.customerName}) بمبلغ إجمالي (${finalBillTotal}) ر.س الدفع: [${methodStr}]${discountStr}`);
  };

  const cancelSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    if (isLocalStorageMode) {
      const updatedDevices = devices.map(d => d.currentSessionId === sessionId ? { ...d, status: 'available' as const, currentSessionId: null } : d);
      saveState('ps_devices', updatedDevices, setDevices);

      const updatedSessions = sessions.map(s => s.id === sessionId ? { ...s, status: 'cancelled' as const, closedAt: new Date().toISOString() } : s);
      saveState('ps_sessions', updatedSessions, setSessions);
    } else {
      const device = devices.find(d => d.id === session.deviceId);
      const p1 = device 
        ? setDoc(doc(db, 'devices', session.deviceId), { ...device, status: 'available' as const, currentSessionId: null })
        : Promise.resolve();

      const p2 = setDoc(doc(db, 'sessions', sessionId), {
        ...session,
        status: 'cancelled' as const,
        closedAt: new Date().toISOString()
      });

      Promise.all([p1, p2]).catch(err => handleFirestoreError(err, OperationType.WRITE, `sessions/${sessionId}`));
    }
    addLog('session', 'إلغاء جلسة لعب', `تم إلغاء الجلسة للجهاز (${session.deviceName}) والزبون (${session.customerName}) دون تحصيل مبالغ`);
  };

  // Handlers - Subscriptions
  const addSubscription = (customerId: string, planId: string): Subscription | undefined => {
    const customer = customers.find(c => c.id === customerId);
    const plan = subscriptionPlans.find(p => p.id === planId);
    if (!customer || !plan) return undefined;

    const subId = 'sub-' + Math.random().toString(36).substr(2, 9);
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + plan.durationDays);

    const newSub: Subscription = {
      id: subId,
      customerId,
      customerName: customer.name,
      planName: plan.name,
      type: plan.type,
      totalHours: plan.hours,
      remainingHours: plan.type === 'unlimited' ? 9999 : plan.hours,
      pricePaid: plan.price,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: 'active'
    };

    const newTxId = 'tx-' + Math.random().toString(36).substr(2, 9);
    const newTx: Transaction = {
      id: newTxId,
      sessionId: null,
      type: 'subscription_payment',
      amount: plan.price,
      description: `اشتراك جديد (${plan.name}): ${customer.name}`,
      paymentMethod: 'cash',
      timestamp: new Date().toISOString(),
      staffName: currentUser?.name || 'مدير النظام'
    };

    if (isLocalStorageMode) {
      const updatedCustomers = customers.map(c => c.id === customerId ? { ...c, subscriptionId: subId } : c);
      saveState('ps_customers', updatedCustomers, setCustomers);

      const updatedSubs = [newSub, ...subscriptions];
      saveState('ps_subscriptions', updatedSubs, setSubscriptions);

      saveState('ps_transactions', [newTx, ...transactions], setTransactions);
    } else {
      const p1 = setDoc(doc(db, 'customers', customerId), { ...customer, subscriptionId: subId });
      const p2 = setDoc(doc(db, 'subscriptions', subId), newSub);
      const p3 = setDoc(doc(db, 'transactions', newTxId), newTx);

      Promise.all([p1, p2, p3]).catch(err => handleFirestoreError(err, OperationType.WRITE, `subscriptions/${subId}`));
    }
    addLog('subscription', 'إضافة اشتراك لزبون', `تم تفعيل باقة اشتراك (${plan.name}) للزبون (${customer.name}) بقيمة (${plan.price}) ر.س`);
    return newSub;
  };

  const cancelSubscription = (subId: string) => {
    const sub = subscriptions.find(s => s.id === subId);
    if (!sub) return;

    if (isLocalStorageMode) {
      const updatedSubs = subscriptions.map(s => s.id === subId ? { ...s, status: 'expired' as const } : s);
      saveState('ps_subscriptions', updatedSubs, setSubscriptions);

      const updatedCustomers = customers.map(c => c.subscriptionId === subId ? { ...c, subscriptionId: null } : c);
      saveState('ps_customers', updatedCustomers, setCustomers);
    } else {
      const p1 = setDoc(doc(db, 'subscriptions', subId), { ...sub, status: 'expired' as const });
      const customer = customers.find(c => c.subscriptionId === subId);
      const p2 = customer 
        ? setDoc(doc(db, 'customers', customer.id), { ...customer, subscriptionId: null })
        : Promise.resolve();

      Promise.all([p1, p2]).catch(err => handleFirestoreError(err, OperationType.WRITE, `subscriptions/${subId}`));
    }
    addLog('subscription', 'إلغاء اشتراك زبون', `تم إلغاء/إنهاء باقة اشتراك الزبون (${sub.customerName}) لنوع الباقة (${sub.planName})`);
  };

  // Handlers - Cafe Menu
  const addMenuItem = (name: string, price: number, category: 'drinks' | 'snacks' | 'meals', stock: number, purchaseCost?: number) => {
    const id = 'm-' + Math.random().toString(36).substr(2, 9);
    const newItem: MenuItem = { id, name, price, purchaseCost: purchaseCost || 0, category, stock };

    if (isLocalStorageMode) {
      const updated = [...menuItems, newItem];
      saveState('ps_menu_items', updated, setMenuItems);
    } else {
      setDoc(doc(db, 'menuItems', id), newItem)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `menuItems/${id}`));
    }
    addLog('menu', 'إضافة مادة للمقهى', `تم إضافة مادة (${name}) بسعر بيع (${price}) وقيمة تكلفة (${purchaseCost || 0}) والمخزون الحالي (${stock})`);
  };

  const updateMenuItem = (item: MenuItem) => {
    if (isLocalStorageMode) {
      const updated = menuItems.map(m => m.id === item.id ? item : m);
      saveState('ps_menu_items', updated, setMenuItems);
    } else {
      setDoc(doc(db, 'menuItems', item.id), item)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `menuItems/${item.id}`));
    }
    addLog('menu', 'تعديل مادة المقهى', `تم تحديث المادة (${item.name}) بسعر بيع جديد (${item.price}) والمخزون (${item.stock})`);
  };

  const deleteMenuItem = (id: string) => {
    const item = menuItems.find(m => m.id === id);
    const itemName = item ? item.name : id;

    if (isLocalStorageMode) {
      const updated = menuItems.filter(m => m.id !== id);
      saveState('ps_menu_items', updated, setMenuItems);
    } else {
      deleteDoc(doc(db, 'menuItems', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `menuItems/${id}`));
    }
    addLog('menu', 'حذف مادة المقهى', `تم إزالة المادة (${itemName}) نهائياً من المنيو`);
  };

  // Devices Controllers
  const addDevice = (
    name: string,
    type: string,
    section: 'standard' | 'vip' | 'billiards',
    hourlyRateSingle: number,
    hourlyRateMulti: number
  ) => {
    const numIds = devices.map(d => parseInt(d.id, 10)).filter(id => !isNaN(id));
    const nextId = numIds.length > 0 ? (Math.max(...numIds) + 1).toString() : 'dev-' + Math.random().toString(36).substr(2, 5);

    const newDevice: Device = {
      id: nextId,
      name,
      type,
      section,
      status: 'available',
      currentSessionId: null,
      hourlyRateSingle,
      hourlyRateMulti
    };

    if (isLocalStorageMode) {
      const updatedDevices = [...devices, newDevice];
      saveState('ps_devices', updatedDevices, setDevices);
    } else {
      setDoc(doc(db, 'devices', nextId), newDevice)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `devices/${nextId}`));
    }
    addLog('device', 'إضافة جهاز جديد', `تم إضافة جهاز جديد باسم (${name}) ونوع (${type}) في قسم (${section === 'standard' ? 'العادي' : section === 'vip' ? 'VIP' : 'البليارد'})`);
  };

  const updateDevice = (id: string, updates: Partial<Device>) => {
    const dev = devices.find(d => d.id === id);
    if (!dev) return;

    if (isLocalStorageMode) {
      const updatedDevices = devices.map(d => d.id === id ? { ...d, ...updates } : d);
      saveState('ps_devices', updatedDevices, setDevices);
    } else {
      const updated = { ...dev, ...updates };
      setDoc(doc(db, 'devices', id), updated)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `devices/${id}`));
    }

    if (updates.status !== undefined && updates.status !== dev.status) {
      if (updates.status === 'maintenance') {
        addLog('device', 'صيانة جهاز', `تم تحويل جهاز (${dev.name}) إلى وضع الصيانة`);
      } else if (updates.status === 'available' && dev.status === 'maintenance') {
        addLog('device', 'إنهاء صيانة جهاز', `تم إنهاء صيانة جهاز (${dev.name}) وإعادته للتشغيل المتاح`);
      }
    } else if (updates.name !== undefined || updates.hourlyRateSingle !== undefined || updates.hourlyRateMulti !== undefined) {
      addLog('device', 'تعديل جهاز', `تم تعديل إعدادات أو تسعيرة جهاز (${dev.name})`);
    }
  };

  const deleteDevice = (id: string) => {
    const dev = devices.find(d => d.id === id);
    const devName = dev ? dev.name : id;

    if (isLocalStorageMode) {
      const updatedDevices = devices.filter(d => d.id !== id);
      saveState('ps_devices', updatedDevices, setDevices);
    } else {
      deleteDoc(doc(db, 'devices', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `devices/${id}`));
    }
    addLog('device', 'حذف جهاز', `تم إزالة الجهاز (${devName}) بشكل نهائي من النظام`);
  };

  // Handlers - Expenses
  const addExpense = (amount: number, description: string, paymentMethod: 'cash' | 'card') => {
    const id = 'tx-' + Math.random().toString(36).substr(2, 9);
    const newTx: Transaction = {
      id,
      sessionId: null,
      type: 'expense',
      amount: amount,
      description: `صروفات: ${description}`,
      paymentMethod,
      timestamp: new Date().toISOString(),
      staffName: currentUser?.name || 'المالك'
    };

    if (isLocalStorageMode) {
      saveState('ps_transactions', [newTx, ...transactions], setTransactions);
    } else {
      setDoc(doc(db, 'transactions', id), newTx)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `transactions/${id}`));
    }
    addLog('transaction', 'تسجيل مصروفات', `تم إخراج مبلغ صروفات بقيمة (${amount}) ر.س - البيان: ${description}`);
  };

  // Direct Cafeteria Sale
  const addDirectSale = async (
    customerName: string,
    cartItems: { item: MenuItem; quantity: number }[],
    paymentMethod: 'cash' | 'card'
  ): Promise<GameSession> => {
    const finalAmount = cartItems.reduce((sum, itemExt) => sum + (itemExt.item.price * itemExt.quantity), 0);
    const sessId = 'ds-' + Math.random().toString(36).substr(2, 9);
    
    const orders: OrderItem[] = cartItems.map(itemExt => ({
      id: itemExt.item.id,
      name: itemExt.item.name,
      price: itemExt.item.price,
      purchaseCost: itemExt.item.purchaseCost || 0,
      quantity: itemExt.quantity,
      timestamp: new Date().toISOString()
    }));

    const directSession: GameSession = {
      id: sessId,
      deviceId: 'direct_sale',
      deviceName: 'كافتيريا (بيع مباشر)',
      customerName: customerName.trim() || 'زبون كافتيريا مباشر',
      customerId: 'guest',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      sessionType: 'fixed',
      playType: 'single',
      fixedDuration: 0,
      hourlyRate: 0,
      status: 'completed',
      orders,
      totalPlayAmount: 0,
      totalOrdersAmount: finalAmount,
      discountAmount: 0,
      finalAmount: finalAmount,
      paymentMethod,
      closedAt: new Date().toISOString()
    };

    const newTxId = 'tx-' + Math.random().toString(36).substr(2, 9);
    const newTx: Transaction = {
      id: newTxId,
      sessionId: sessId,
      type: 'session_payment',
      amount: finalAmount,
      description: `بيع كافتيريا مباشر: ${orders.map(o => `${o.name} (${o.quantity})`).join(', ')}`,
      paymentMethod,
      timestamp: new Date().toISOString(),
      staffName: currentUser?.name || 'الكاشير'
    };

    if (isLocalStorageMode) {
      const updatedMenu = menuItems.map(m => {
        const cartMatch = cartItems.find(ci => ci.item.id === m.id);
        if (cartMatch) {
          return { ...m, stock: Math.max(0, m.stock - cartMatch.quantity) };
        }
        return m;
      });
      saveState('ps_menu_items', updatedMenu, setMenuItems);
      saveState('ps_sessions', [directSession, ...sessions], setSessions);
      saveState('ps_transactions', [newTx, ...transactions], setTransactions);
    } else {
      try {
        const sessionRef = doc(db, 'sessions', sessId);
        const txRef = doc(db, 'transactions', newTxId);
        
        await setDoc(sessionRef, directSession);
        await setDoc(txRef, newTx);
        
        for (const cartMatch of cartItems) {
          const itemRef = doc(db, 'menuItems', cartMatch.item.id);
          await setDoc(itemRef, {
            ...cartMatch.item,
            stock: Math.max(0, cartMatch.item.stock - cartMatch.quantity)
          });
        }
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `sessions/${sessId}`);
      }
    }
    const soldItemsSummary = orders.map(o => `${o.name} (عدد ${o.quantity})`).join(', ');
    addLog('transaction', 'بيع مباشر من المقهى', `تم إجراء بيع مباشر بقيمة (${finalAmount}) ر.س لصالح (${customerName.trim() || 'زبون كافتيريا مباشر'}) - المبيعات: ${soldItemsSummary}`);
    return directSession;
  };

  // Staff Management Handlers
  const addStaffUser = (name: string, email: string, role: Role) => {
    const uid = 'u-staff-' + Math.random().toString(36).substr(2, 9);
    const newStaff: StaffUser = {
      uid,
      name,
      email,
      role,
      createdAt: new Date().toISOString()
    };

    if (isLocalStorageMode) {
      const updated = [...staffUsers, newStaff];
      saveState('ps_staff_users', updated, setStaffUsers);
    } else {
      setDoc(doc(db, 'users', uid), newStaff)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${uid}`));
    }
    addLog('staff', 'إضافة موظف جديد', `تم إضافة موظف جديد باسم (${name}) وبريد (${email}) وبصلاحية (${role === 'owner' ? 'المالك' : role === 'cashier' ? 'الكاشير' : 'كابتن صالة'})`);
  };

  const updateStaffUser = (uid: string, updates: Partial<StaffUser>) => {
    const staff = staffUsers.find(u => u.uid === uid);
    const staffName = staff ? staff.name : uid;

    if (isLocalStorageMode) {
      const updated = staffUsers.map(u => u.uid === uid ? { ...u, ...updates } : u);
      saveState('ps_staff_users', updated, setStaffUsers);
      if (currentUser?.uid === uid) {
        const refreshed = updated.find(u => u.uid === uid);
        if (refreshed) {
          saveState('ps_current_user', refreshed, setCurrentUser);
        }
      }
    } else {
      const existingUser = staffUsers.find(u => u.uid === uid);
      if (!existingUser) return;
      const updated = { ...existingUser, ...updates };
      setDoc(doc(db, 'users', uid), updated)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${uid}`));
    }
    addLog('staff', 'تعديل بيانات موظف', `تم تعديل الصلاحيات أو البيانات للحساب (${staffName})`);
  };

  const deleteStaffUser = (uid: string) => {
    const staff = staffUsers.find(u => u.uid === uid);
    const staffName = staff ? staff.name : uid;

    if (isLocalStorageMode) {
      const updated = staffUsers.filter(u => u.uid !== uid);
      saveState('ps_staff_users', updated, setStaffUsers);
    } else {
      deleteDoc(doc(db, 'users', uid))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${uid}`));
    }
    addLog('staff', 'حذف موظف', `تم إزالة حساب الموظف (${staffName}) نهائياً من النظام`);
  };

  const clearAllTestData = async () => {
    if (isLocalStorageMode) {
      saveState('ps_sessions', [], setSessions);
      saveState('ps_transactions', [], setTransactions);
      const resetDevices = devices.map(d => ({ ...d, status: 'available' as const }));
      saveState('ps_devices', resetDevices, setDevices);
    } else {
      for (const s of sessions) {
        await deleteDoc(doc(db, 'sessions', s.id)).catch(err => {
          console.error("Error deleting session doc:", err);
        });
      }
      for (const t of transactions) {
        await deleteDoc(doc(db, 'transactions', t.id)).catch(err => {
          console.error("Error deleting transaction doc:", err);
        });
      }
      for (const d of devices) {
        if (d.status !== 'available') {
          await setDoc(doc(db, 'devices', d.id), { ...d, status: 'available' })
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `devices/${d.id}`));
        }
      }
    }
  };

  const clearActivityLogs = async () => {
    if (isLocalStorageMode) {
      saveState('ps_activity_logs', [], setActivityLogs);
    } else {
      for (const log of activityLogs) {
        await deleteDoc(doc(db, 'activityLogs', log.id)).catch(err => {
          console.error("Error deleting activity log doc:", err);
        });
      }
      setActivityLogs([]);
    }
    addLog('staff', 'مسح سجل النشاط', 'تم تفريغ كافة سجلات الأحداث والأنشطة الإدارية بالكامل من النظام');
  };

  return (
    <AppContext.Provider value={{
      currentUser, login, loginWithGoogle, logout,
      devices, customers, subscriptions, menuItems, sessions, transactions, subscriptionPlans,
      addCustomer, updateCustomer, deleteCustomer,
      startSession, addOrderToSession, removeOrderFromSession, checkoutSession, cancelSession,
      addSubscription, cancelSubscription,
      addMenuItem, updateMenuItem, deleteMenuItem,
      addDevice, updateDevice, deleteDevice,
      addExpense, addDirectSale,
      staffUsers, addStaffUser, updateStaffUser, deleteStaffUser,
      calculateRuntimePlayAmount, alertedSessions, clearAllTestData, clearActivityLogs,
      activityLogs, addLog
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
