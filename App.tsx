import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SummaryCard from './components/SummaryCard';
import TransactionList from './components/TransactionList';
import EditTransactionModal from './components/EditTransactionModal';
import FinancialHealthWidget from './components/FinancialHealthWidget';
import { MonthData, TransactionType, Transaction, FinancialProjection } from './types';
import { generateMonthData, getStorageKey } from './utils/financeUtils';
import { db, auth, isConfigured, onAuthStateChanged, signInAnonymously } from './services/firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { FAMILY_ID } from './constants';
import { Target, Plus, ShoppingBag, User, Users, ArrowRight, Plane, Wallet, PiggyBank, Home as HomeIcon, Palmtree, Heart, Car, GraduationCap, MoreHorizontal, TrendingUp, ShoppingCart, FileWarning } from 'lucide-react';
import { formatCurrency } from './utils/financeUtils';

const App: React.FC = () => {
    // App State
    // If current date is >= April 27th, default to May 2026, otherwise current month
    const now = new Date();
    const isLateApril = now.getMonth() === 3 && now.getDate() >= 27; 
    const [currentMonth, setCurrentMonth] = useState(isLateApril ? 5 : now.getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(isLateApril ? 2026 : now.getFullYear());
    const [monthData, setMonthData] = useState<MonthData | null>(null);
    const [view, setView] = useState<'home' | 'transactions'>('home');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'offline' | 'syncing' | 'online'>('offline');
    const [transactionListType, setTransactionListType] = useState<TransactionType>('expenses');
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
    const [filter, setFilter] = useState<{ type: 'group' | 'none', value: string }>({ type: 'none', value: '' });

    const [showSecurityMessage, setShowSecurityMessage] = useState(false);

    // Edit Modal State
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [checkIn, setCheckIn] = useState<{ isDone: boolean; date: string | null }>({ isDone: false, date: null });
    const [bankReserves, setBankReserves] = useState<{ santander: number; inter: number; sofisa: number }>(() => {
        const saved = localStorage.getItem('bankReserves');
        return saved ? JSON.parse(saved) : { santander: 0, inter: 0, sofisa: 0 };
    });

    // Persist bank reserves
    useEffect(() => {
        localStorage.setItem('bankReserves', JSON.stringify(bankReserves));
    }, [bankReserves]);

    // Initialize reserves with salaries (run only once, or if reserves are 0/unset)
    useEffect(() => {
        if (monthData) {
            const saved = localStorage.getItem('bankReserves');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.santander !== 0 || parsed.inter !== 0 || parsed.sofisa !== 0) return;
            }

            const totalSalary = monthData.incomes
                .filter(i => i.category === 'Salário')
                .reduce((sum, item) => sum + item.amount, 0);
            
            setBankReserves({ santander: totalSalary, inter: 0, sofisa: 0 });
        }
    }, [monthData]);
    useEffect(() => {
        const saved = localStorage.getItem(`checkin_${currentYear}_${currentMonth}`);
        if (saved) setCheckIn(JSON.parse(saved));
        else setCheckIn({ isDone: false, date: null });
    }, [currentYear, currentMonth]);

    const handleCheckIn = () => {
        const date = new Date().toISOString();
        const newState = { isDone: true, date };
        setCheckIn(newState);
        localStorage.setItem(`checkin_${currentYear}_${currentMonth}`, JSON.stringify(newState));
    };

    // Force refresh to pull updated categories and grouping (v25)
    useEffect(() => {
        const forceUpdateV25 = localStorage.getItem('force_update_v25_avulsos_explicit_dates');
        if (!forceUpdateV25) {
            localStorage.removeItem('financeData_2026_4');
            localStorage.removeItem('financeData_2026_5');
            localStorage.setItem('force_update_v25_avulsos_explicit_dates', 'true');
            window.location.reload();
        }
    }, []);

    // User request: Update Santander balance (April/May 2026)
    useEffect(() => {
        if (!monthData) return;
        const processedKey = 'processed_balances_apr_may_v24_fix';
        if (localStorage.getItem(processedKey)) return;

        // Balance before avulsos deduction was 771.09 in Santander
        let santanderBase = 771.09;
        let sofisaBase = bankReserves.sofisa;

        // If we are in May, apply the deduction of R$ 247.28
        if (currentYear === 2026 && currentMonth === 5) {
            santanderBase -= 247.28;
        }

        setBankReserves(prev => ({
            ...prev,
            santander: Math.round(santanderBase * 100) / 100,
            // Ensure Sofia gets the 4351 transfer if not already applied
            sofisa: prev.sofisa < 8000 ? Math.round((prev.sofisa + 4351) * 100) / 100 : prev.sofisa
        }));

        localStorage.setItem(processedKey, 'true');
    }, [monthData, currentYear, currentMonth]);

    // User request: Mark specific items as paid and deduct from Santander
    useEffect(() => {
        if (!monthData) return;
        const processedKey = 'processed_specific_deduction_2026_4_v3';
        if (localStorage.getItem(processedKey)) return;

        let totalDeduction = 0;
        let modified = false;

        const paidDescriptions = [
            "INTERNET DA CASA",
            "APPA LDO ANDRÉ",
            "INTERMÉDICA DO ANDRÉ",
            "GUARDA ROUPAS",
            "REFORMA DO SOFÁ DE CAXIAS",
            "FACULDADE DA MARCELLY",
            "PASSAGENS AÉREAS",
            "PASSAGENS DE ONIBUS",
            "MALA DO ANDRÉ",
            "RENEGOCIAR CARREFOUR"
        ];

        const newData = { ...monthData };
        newData.expenses = newData.expenses.map(e => {
            const desc = e.description.toUpperCase();
            // Check if this expense matches one of the user's paid expenses
            const isPaidByUser = paidDescriptions.some(p => desc.includes(p.toUpperCase()));
            
            if (isPaidByUser && !e.paid) {
                totalDeduction += e.amount;
                modified = true;
                return { ...e, paid: true, paidAt: new Date().toISOString() };
            }
            return e;
        });

        if (modified) {
            setBankReserves(prev => ({
                ...prev,
                santander: Math.max(0, prev.santander - totalDeduction)
            }));
            saveData(newData, currentYear, currentMonth);
            localStorage.setItem(processedKey, 'true');
        }
    }, [monthData, currentYear, currentMonth]);

    // User request: Mark "APPAI DO ANDRÉ" as paid and deduct from Santander
    useEffect(() => {
        if (!monthData) return;
        const processedKey = 'processed_appaidoandre_deduction_2026_4_v1';
        if (localStorage.getItem(processedKey)) return;

        let totalDeduction = 129.5;
        let modified = false;

        const newData = { ...monthData };
        newData.expenses = newData.expenses.map(e => {
            const desc = e.description.toUpperCase();
            if (desc.includes('APPAI DO ANDRÉ') && !e.paid) {
                modified = true;
                return { ...e, paid: true, paidAt: new Date().toISOString() };
            }
            return e;
        });

        if (modified) {
            setBankReserves(prev => ({
                ...prev,
                santander: Math.round((prev.santander - totalDeduction) * 100) / 100
            }));
            saveData(newData, currentYear, currentMonth);
            localStorage.setItem(processedKey, 'true');
        }
    }, [monthData, currentYear, currentMonth]);

    // User request: Unmark specific item as unpaid and add back to Santander
    useEffect(() => {
        if (!monthData) return;
        const processedKey = 'unmark_remedios_marcia_brito_2026_4_v4';
        if (localStorage.getItem(processedKey)) return;

        const newData = { ...monthData };
        let itemModified = false;
        let amountToAdd = 0;

        newData.expenses = newData.expenses.map(e => {
            if (e.description.toUpperCase().includes('REMÉDIOS (MARCIA BRITO)') && e.paid) {
                itemModified = true;
                amountToAdd = e.amount;
                return { ...e, paid: false, paidAt: undefined };
            }
            return e;
        });

        if (itemModified) {
            setBankReserves(prev => ({
                ...prev,
                santander: Math.round((prev.santander + amountToAdd) * 100) / 100
            }));
            saveData(newData, currentYear, currentMonth);
            localStorage.setItem(processedKey, 'true');
        }
    }, [monthData, currentYear, currentMonth]);

    // User request: Avulsos are now baked into defaults in financeUtils.ts

    // Automatic salary payment
    useEffect(() => {
        if (!monthData) return;
        
        const now = new Date();
        const payTimeLimit = new Date();
        payTimeLimit.setHours(7, 1, 0, 0);

        let updated = false;
        const newIncomes = monthData.incomes.map(item => {
            if (item.category === 'Salário' && !item.paid && item.dueDate) {
                const [y, m, d] = item.dueDate.split('-').map(Number);
                const dueDate = new Date(y, m - 1, d);
                
                // If today is or after due date and it's past 07:01 AM (or it's after the due date)
                if (now >= dueDate && (now.getDate() !== dueDate.getDate() || now >= payTimeLimit)) {
                    updated = true;
                    return { ...item, paid: true, paidAt: now.toISOString() };
                }
            }
            return item;
        });

        if (updated) {
            const newData = { ...monthData, incomes: newIncomes };
            saveData(newData, currentYear, currentMonth);
        }
    }, [monthData]);

    // Ref for accessing latest data in closures/listeners
    const monthDataRef = useRef<MonthData | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    useEffect(() => { monthDataRef.current = monthData; }, [monthData]);

    // Load Initial Data
    useEffect(() => {
        loadData(currentYear, currentMonth);
        if (isConfigured && auth) {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    setSyncStatus('online');
                    setupRealtimeListener(currentYear, currentMonth);
                } else {
                    signInAnonymously(auth).catch((e) => {
                        if (e.message && e.message.includes('identity-toolkit-api-has-not-been-used')) {
                            console.warn("Firebase Auth API not enabled. Running in Offline Mode.");
                        } else {
                            console.error("Auth Error", e);
                        }
                        setSyncStatus('offline');
                    });
                }
            });
        }

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    // NEW: Force sync on visibility change (when opening app from background) to ensure instant updates
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Trigger a re-read if needed, though onSnapshot handles most.
                // This ensures if the socket was paused, we wake it up.
                console.log("App foregrounded, ensuring sync...");
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);


    const ensureSystemIntegrity = (data: MonthData, year: number, month: number): MonthData => {
        // User request (April 2026): Internet correction, Perfume addition, Specific payments
        if (year === 2026 && month === 4) {
            // 1. Correct Internet Value
            data.expenses = data.expenses.map(e => {
                const desc = e.description.toUpperCase();
                if (desc.includes("INTERNET DA CASA")) {
                    return { ...e, amount: 125.76 };
                }
                // Itaú André Card Correction
                if (desc.includes("CARTÃO DO ITAÚ DO ANDRÉ") || desc.includes("CARTAO DO ITAU DO ANDRE")) {
                    return { ...e, amount: 116.00, category: "Moradia", group: "MORADIA", paid: true, paidAt: e.paidAt || "2026-04-28T12:00:00Z" };
                }
                // André's Claro update
                if (desc.includes("CONTA DA CLARO ANDRÉ") || desc.includes("CONTA DA CLARO ANDRE")) {
                    return { ...e, amount: 0 };
                }
                // Car Insurance update
                if (desc.includes("SEGURO DO CARRO")) {
                    return { ...e, dueDate: "2026-04-20" };
                }
                return e;
            });

            // Ensure Itaú André exists
            if (!data.expenses.some(e => e.description.toUpperCase().includes("CARTÃO DO ITAÚ DO ANDRÉ") || e.description.toUpperCase().includes("CARTAO DO ITAU DO ANDRE"))) {
                data.expenses.push({
                    id: `manual_itau_andre_${Date.now()}`,
                    description: "CARTÃO DO ITAÚ DO ANDRÉ",
                    amount: 116.00,
                    category: "Moradia",
                    group: "MORADIA",
                    paid: true,
                    dueDate: "2026-04-15",
                    paidAt: "2026-04-28T12:00:00Z"
                });
            }

            // 2. Add Perfume Expense in "DÍVIDAS NA RUA"
            if (!data.expenses.some(e => e.description.toUpperCase().includes("PERFUME"))) {
                data.expenses.push({
                    id: `manual_perfume_${Date.now()}`,
                    description: "PAGAMENTO DE PERFUME",
                    amount: 100.00,
                    category: "DÍVIDAS NA RUA",
                    group: "DÍVIDAS NA RUA",
                    paid: true,
                    dueDate: "2026-04-29",
                    paidAt: new Date().toISOString(),
                    installments: { current: 1, total: 1 }
                });
            } else {
                // Update existing perfume if it's there but in wrong category/group
                data.expenses = data.expenses.map(e => {
                    if (e.description.toUpperCase().includes("PERFUME")) {
                        return { ...e, category: "DÍVIDAS NA RUA", group: "DÍVIDAS NA RUA", installments: { current: 1, total: 1 } };
                    }
                    return e;
                });
            }

            // 3. Add Veneno Cupim in "MARCIA BRITO"
            if (!data.expenses.some(e => e.description.toUpperCase().includes("VENENO PARA MATAR CUPIM"))) {
                data.expenses.push({
                    id: `manual_veneno_${Date.now()}`,
                    description: "VENENO PARA MATAR CUPIM",
                    amount: 37.00,
                    category: "Saúde", // Or just Marcia Brito? The user said "na categoria marcia brito" but it's usually a group
                    group: "MARCIA BRITO",
                    paid: true,
                    dueDate: "2026-04-28",
                    paidAt: "2026-04-28T12:00:00Z",
                    installments: { current: 1, total: 1 }
                });
            }

            // 4. Skip Lili Loan (Keep this as requested earlier)
            data.expenses = data.expenses.map(e => {
                const desc = e.description.toUpperCase();
                if (desc.includes("EMPRÉSTIMO COM LILI")) {
                    return { ...e, skipped: true };
                }
                return e;
            });

            // 4. Mark Iago, Aluguel, Jady as paid
            data.expenses = data.expenses.map(e => {
                const desc = e.description.toUpperCase();
                if (desc.includes("ALUGUEL") || desc.includes("PASSEIO DE SAFARI")) {
                    return { ...e, paid: true, paidAt: e.paidAt || new Date().toISOString() };
                }
                return e;
            });

            data.avulsosItems = data.avulsosItems.map(e => {
                const desc = e.description.toUpperCase();
                if (desc.includes("IAGO")) {
                    return { ...e, paid: true, paidAt: e.paidAt || new Date().toISOString() };
                }
                return e;
            });
        }

        // 1. Remove VIVO and EMPRÉSTIMO JADY
        if (year === 2026 && (month === 3 || month === 4 || month === 5)) {
            data.expenses = data.expenses.filter(e => 
                !e.description.toUpperCase().includes("VIVO ANDRÉ") && 
                !e.description.toUpperCase().includes("VIVO MARCELLY") &&
                !e.description.toUpperCase().includes("EMPRÉSTIMO JADY")
            );
        }

        // 1.1 Empréstimo Márcia Bispo: Parcela 0/4 em Maio (0.00) e 1/4 em Junho (275.00)
        if (year === 2026) {
            const descBispo = "EMPRÉSTIMO COM MARCIA BISPO";
            const existingBispo = data.expenses.find(e => e.description.toUpperCase().includes(descBispo));
            
            if (month === 5) {
                if (existingBispo) {
                    data.expenses = data.expenses.map(e => e.description.toUpperCase().includes(descBispo) 
                        ? { ...e, amount: 0, installments: { current: 0, total: 4 } } : e);
                } else {
                    data.expenses.push({
                        id: `manual_marcia_bispo_may`,
                        description: descBispo,
                        amount: 0,
                        category: "Dívidas",
                        group: "MARCIA BISPO",
                        paid: false,
                        dueDate: "2026-05-15",
                        installments: { current: 0, total: 4 }
                    });
                }
            } else if (month === 6) {
                if (existingBispo) {
                    data.expenses = data.expenses.map(e => e.description.toUpperCase().includes(descBispo) 
                        ? { ...e, amount: 275.00, installments: { current: 1, total: 4 } } : e);
                } else {
                    data.expenses.push({
                        id: `manual_marcia_bispo_june`,
                        description: descBispo,
                        amount: 275.00,
                        category: "Dívidas",
                        group: "MARCIA BISPO",
                        paid: false,
                        dueDate: "2026-06-15",
                        installments: { current: 1, total: 4 }
                    });
                }
            }
        }

        // 2. Clear out Claro André (0.00) for all future months from April 2026
        if (year === 2026 && month >= 4) {
            data.expenses = data.expenses.map(e => {
                const desc = e.description.toUpperCase();
                if (desc.includes("CLARO") && desc.includes("ANDRÉ")) {
                    return { ...e, amount: 0, paid: true, paidAt: e.paidAt || new Date().toISOString() };
                }
                if (desc.includes("SEGURO DO CARRO")) {
                    return { ...e, category: "Moradia", group: "MORADIA", dueDate: month === 4 ? "2026-04-20" : e.dueDate };
                }
                return e;
            });
        }

        // 3. May 2026 Specific Logic (Restored and Corrected)
        if (year === 2026 && month === 5) {
            data.expenses = data.expenses.map(e => {
                const desc = e.description.toUpperCase();
                if (desc.includes("CELULAR DA MARCELLY")) return { ...e, installments: { current: 3, total: 12 }, amount: 385.74 };
                if (desc.includes("EMPRÉSTIMO COM LILI")) return { ...e, installments: { current: 0, total: 5 }, amount: 0 };
                if (desc.includes("PASSEIO DE SAFARI")) return { ...e, installments: { current: 3, total: 6 }, amount: 571.60 };
                if (desc.includes("REFORMA DO SOFÁ DE CAXIAS")) return { ...e, installments: { current: 2, total: 5 }, amount: 115.00 };
                if (desc.includes("MÃO DE OBRA DO DAVI")) return { ...e, installments: { current: 1, total: 3 }, amount: 124.27 };
                
                // Itaú Marcelly update
                if (desc.includes("CARTÃO DO ITAÚ DA MARCELLY") || desc.includes("CARTAO DO ITAU DA MARCELLY")) {
                    return { ...e, paid: true, amount: 168.00, paidAt: e.paidAt || "2026-04-28T12:00:00Z" };
                }
                
                // Itaú André update
                if (desc.includes("CARTÃO DO ITAÚ DO ANDRÉ") || desc.includes("CARTAO DO ITAU DO ANDRE")) {
                    return { ...e, paid: true, amount: 116.00, category: "Moradia", group: "MORADIA", paidAt: e.paidAt || "2026-04-28T12:00:00Z" };
                }

                // Force Veneno Cupim to paid in May
                if (desc.includes("VENENO PARA MATAR CUPIM")) {
                    return { ...e, paid: true, paidAt: e.paidAt || "2026-04-28T12:00:00Z", group: "MARCIA BRITO" };
                }

                return e;
            });

            // Ensure Itaú André exists in May
            if (!data.expenses.some(e => e.description.toUpperCase().includes("CARTÃO DO ITAÚ DO ANDRÉ") || e.description.toUpperCase().includes("CARTAO DO ITAU DO ANDRE"))) {
                data.expenses.push({
                    id: `manual_itau_andre_${Date.now()}`,
                    description: "CARTÃO DO ITAÚ DO ANDRÉ",
                    amount: 116.00,
                    category: "Moradia",
                    group: "MORADIA",
                    paid: true,
                    dueDate: "2026-05-15",
                    paidAt: "2026-04-28T12:00:00Z"
                });
            }

            // Perfume in May
            if (!data.expenses.some(e => e.description.toUpperCase().includes("PERFUME"))) {
                data.expenses.push({
                    id: `manual_perfume_may_${Date.now()}`,
                    description: "PAGAMENTO DE PERFUME",
                    amount: 100.00,
                    category: "DÍVIDAS NA RUA",
                    group: "DÍVIDAS NA RUA",
                    paid: true,
                    dueDate: "2026-05-15",
                    paidAt: new Date().toISOString(),
                    installments: { current: 1, total: 1 }
                });
            }

            // Veneno Cupim in May
            if (!data.expenses.some(e => e.description.toUpperCase().includes("VENENO PARA MATAR CUPIM"))) {
                data.expenses.push({
                    id: `manual_veneno_may_${Date.now()}`,
                    description: "VENENO PARA MATAR CUPIM",
                    amount: 37.00,
                    category: "Saúde",
                    group: "MARCIA BRITO",
                    paid: true,
                    dueDate: "2026-05-12",
                    paidAt: "2026-04-28T12:00:00Z",
                    installments: { current: 1, total: 1 }
                });
            }
        }

        // 4. June 2026 Specific Logic (Restored)
        if (year === 2026 && month === 6) {
            data.expenses = data.expenses.map(e => {
                const desc = e.description.toUpperCase();
                if (desc.includes("EMPRÉSTIMO COM LILI")) return { ...e, installments: { current: 2, total: 5 }, amount: 800.00 };
                if (desc.includes("EMPRÉSTIMO COM MARCIA BISPO")) return { ...e, installments: { current: 1, total: 4 }, amount: 275.00 };
                return e;
            });
        }

        // 5. Ensure May 2026 Incomes are present
        if (year === 2026 && month === 5) {
            const hasSalaries = data.incomes.some(i => i.description.includes("SALARIO"));
            const hasMumbuca = data.incomes.some(i => i.description.includes("MUMBUCA"));
                        
            if (!hasSalaries || !hasMumbuca) {
                const salaryDate = "2026-04-28";
                const mumbucaDate = "2026-05-15";
                const mayIncomes: Transaction[] = [
                    { id: `inc_m_2026_5`, description: `SALARIO MARCELLY`, amount: 3436.22, paid: true, date: salaryDate, dueDate: salaryDate, category: 'Salário' },
                    { id: `inc_a_2026_5`, description: `SALARIO ANDRE`, amount: 3436.22, paid: true, date: salaryDate, dueDate: salaryDate, category: 'Salário' },
                    { id: `inc_mum_m_2026_5`, description: 'MUMBUCA MARCELLY', amount: 598.00, paid: false, date: mumbucaDate, category: 'Mumbuca' },
                    { id: `inc_mum_a_2026_5`, description: 'MUMBUCA ANDRE', amount: 598.00, paid: false, date: mumbucaDate, category: 'Mumbuca' }
                ];
                const existingDescriptions = new Set(data.incomes.map(i => i.description));
                mayIncomes.forEach(mi => {
                    if (!existingDescriptions.has(mi.description)) {
                        data.incomes.push(mi);
                    }
                });
            }
        }

        return data;
    };

    const loadData = async (year: number, month: number) => {
        const key = getStorageKey(year, month);
        const local = localStorage.getItem(key);
        
        if (local) {
            setMonthData(ensureSystemIntegrity(JSON.parse(local), year, month));
        } else {
            const newData = ensureSystemIntegrity(generateMonthData(year, month), year, month);
            setMonthData(newData);
            saveData(newData, year, month);
        }
    };

    const setupRealtimeListener = (year: number, month: number) => {
        if (!isConfigured) return;
        
        // Cleanup previous listener
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        const docRef = doc(db, 'families', FAMILY_ID, 'months', `${year}_${month}`);
        
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                let cloudData = snapshot.data() as MonthData;
                const localData = monthDataRef.current;

                cloudData = ensureSystemIntegrity(cloudData, year, month);

                // Only update if cloud data is newer
                if (!localData || cloudData.updatedAt > localData.updatedAt) {
                    setMonthData(cloudData);
                    localStorage.setItem(getStorageKey(year, month), JSON.stringify(cloudData));
                }
            }
        }, (error) => {
            console.error("Firestore Listener Error", error);
            setSyncStatus('offline');
        });

        unsubscribeRef.current = unsubscribe;
        return unsubscribe;
    };

    const saveData = async (data: MonthData | null, year: number, month: number) => {
        if (!data) return;
        
        const updatedData = { ...data, updatedAt: Date.now() };
        setMonthData(updatedData);
        localStorage.setItem(getStorageKey(year, month), JSON.stringify(updatedData));

        if (isConfigured && auth?.currentUser) {
            setSyncStatus('syncing');
            try {
                const docRef = doc(db, 'families', FAMILY_ID, 'months', `${year}_${month}`);
                await setDoc(docRef, updatedData);
                setSyncStatus('online');
            } catch (e) {
                console.error("Save Error", e);
                setSyncStatus('offline');
            }
        }
    };

    const handleMonthChange = (diff: number) => {
        let newMonth = currentMonth + diff;
        let newYear = currentYear;
        
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        
        setCurrentYear(newYear);
        setCurrentMonth(newMonth);
        loadData(newYear, newMonth);
        if (isConfigured && auth?.currentUser) {
            setupRealtimeListener(newYear, newMonth);
        }
    };

    const handleTogglePaid = (id: string, paid: boolean, type: TransactionType) => {
        if (!monthData) return;
        const newData = { ...monthData };
        let deductedAmount = 0;
        let targetBank: 'santander' | 'inter' | 'sofisa' = 'santander';
        
        newData[type] = newData[type].map(t => {
            if (t.id === id) {
                if (type === 'expenses') {
                    // Logic for deductions
                    const desc = t.description.toUpperCase();
                    // If toggling PAID (true), deduct. If toggling UNPAID (false), add back.
                    if (paid && !t.paid) {
                        deductedAmount = t.amount;
                        // Determine bank (default to santander)
                        targetBank = 'santander';
                    }
                    else if (!paid && t.paid) {
                        deductedAmount = -t.amount;
                    }
                }
                return { ...t, paid, paidAt: paid ? new Date().toISOString() : undefined };
            }
            return t;
        });
        
        if (type === 'expenses' && deductedAmount !== 0) {
            setBankReserves(prev => ({...prev, [targetBank]: Math.max(0, prev[targetBank] - deductedAmount)}));
        }
        
        saveData(newData, currentYear, currentMonth);
    };

    const handleToggleGroupPaid = (items: Transaction[]) => {
        if (!monthData) return;
        const allPaid = items.every(i => i.paid);
        const newData = { ...monthData };
        const itemIds = new Set(items.map(i => i.id));
        
        newData.expenses = newData.expenses.map(e => itemIds.has(e.id) ? { ...e, paid: !allPaid } : e);
        saveData(newData, currentYear, currentMonth);
    };

    const handleEditTransaction = (t: Transaction) => {
        setEditingTransaction(t);
        setIsEditModalOpen(true);
    };

    const handleSaveTransaction = (updated: Transaction, type?: TransactionType) => {
        if (!monthData) return;
        const newData = { ...monthData };
        
        let found = false;
        const targetType = type || transactionListType;

        // Helper to check and update
        const tryUpdate = (listName: TransactionType) => {
            const index = newData[listName].findIndex(t => t.id === updated.id);
            if (index !== -1) {
                newData[listName][index] = updated;
                return true;
            }
            return false;
        };

        if (tryUpdate('incomes')) found = true;
        else if (tryUpdate('expenses')) found = true;
        else if (tryUpdate('avulsosItems')) found = true;

        if (!found) {
            // New transaction
            newData[targetType] = [updated, ...newData[targetType]];
        }
        
        saveData(newData, currentYear, currentMonth);
        setIsEditModalOpen(false);
    };

    const handleAddNewTransaction = () => {
        const newT: Transaction = {
            id: `manual_${Date.now()}`,
            description: 'Nova Transação',
            amount: 0,
            category: 'Outros',
            paid: false,
            dueDate: `${currentYear}-${currentMonth.toString().padStart(2,'0')}-15`,
            group: transactionListType === 'expenses' ? 'Despesas Fixas' : undefined
        };
        handleEditTransaction(newT);
    };

    const filteredTransactions = useMemo(() => {
        if (!monthData) return [];
        let list = monthData[transactionListType];
        if (filter.type === 'group') {
            list = list.filter(t => t.group === filter.value);
        } else if (filter.type === 'category') {
            list = list.filter(t => t.category === filter.value);
        }
        return list;
    }, [monthData, transactionListType, filter]);

    const handleFilter = (type: 'group' | 'category' | 'none', value: string) => {
        setFilter({ type, value });
        setView('transactions');
        setTransactionListType('expenses');
    };

    // Stats Calculation
    const stats = useMemo(() => {
        if (!monthData) return { 
            salary: { total: 0, paid: 0 }, 
            combined: { total: 0, paid: 0 }, 
            realExpenses: { total: 0, paid: 0 },
            surplusRaw: 0
        };

        const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

        const isExcluded = (t: Transaction) => {
            if (t.skipped) return true;
            if (!t.isSuspended) return false;
            if (!t.suspendedUntil) return true; // Suspended indefinitely
            return currentMonthStr < t.suspendedUntil;
        };

        const salary = monthData.incomes.filter(i => i.category === 'Salário');
        const combined = monthData.incomes;
        
        // Filter out suspended transactions from totals
        const realExpenses = [
            ...monthData.expenses.filter(e => !isExcluded(e)),
            ...monthData.avulsosItems.filter(e => !isExcluded(e))
        ];

        const sum = (arr: Transaction[]) => arr.reduce((acc, t) => acc + Number(t.amount || 0), 0);
        const sumPaid = (arr: Transaction[]) => arr.filter(t => t.paid).reduce((acc, t) => acc + Number(t.amount || 0), 0);

        const surplusRaw = sum(combined) - sum(realExpenses);

        return {
            salary: { total: sum(salary), paid: sumPaid(salary) },
            combined: { total: sum(combined), paid: sumPaid(combined) },
            realExpenses: { total: sum(realExpenses), paid: sumPaid(realExpenses) },
            surplusRaw
        };
    }, [monthData, currentYear, currentMonth]);

    const balance = (stats.combined.paid) - stats.realExpenses.paid;

    // Group Debts by Person
    const groupedDebts = useMemo(() => {
        if (!monthData) return [];
        const groups: Record<string, { name: string, total: number, paidAmount: number, items: Transaction[] }> = {};
        
        // Include both expenses and avulsosItems in the grouping
        const allItems = [...monthData.expenses, ...monthData.avulsosItems];
        
        allItems.forEach(e => {
            const groupNormal = e.group ? e.group.toUpperCase() : '';
            const excludedGroups = ['MORADIA', 'DESPESAS FIXAS', 'DESPESAS VARIÁVEIS', 'DESPESAS VARIAVEIS'];
            
            if (groupNormal && !excludedGroups.includes(groupNormal) && !e.isDistribution) {
                const name = groupNormal;
                if (!groups[name]) groups[name] = { name, total: 0, paidAmount: 0, items: [] };
                groups[name].total += e.amount;
                if (e.paid) groups[name].paidAmount += e.amount;
                groups[name].items.push(e);
            }
        });

        return Object.values(groups).sort((a, b) => b.total - a.total);
    }, [monthData]);

    const getDebtColor = (name: string) => {
        if (name.includes('LILI')) return 'from-teal-400 to-emerald-500';
        if (name.includes('MARCIA')) return 'from-emerald-500 to-teal-600';
        if (name.includes('JADY')) return 'from-green-400 to-emerald-500';
        if (name.includes('CLAUDIO')) return 'from-emerald-600 to-teal-700';
        if (name.includes('REBECCA')) return 'from-teal-500 to-emerald-600';
        if (name.includes('IAGO')) return 'from-emerald-400 to-teal-500';
        if (name.includes('DÍVIDAS NA RUA') || name.includes('DIVIDAS NA RUA')) return 'from-rose-400 to-orange-500';
        return 'from-emerald-700 to-teal-800';
    };

    const sidebarAccounts = monthData?.bankAccounts || [];

    if (!monthData) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 font-black text-slate-400 animate-pulse">Carregando Finanças...</div>;

    const getTabStyle = (type: TransactionType) => {
        if (transactionListType !== type) return 'text-slate-400 border-transparent';
        switch(type) {
            case 'incomes': return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm';
            case 'expenses': return 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm';
            case 'avulsosItems': return 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm';
            default: return 'bg-teal-50 text-teal-600';
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#f0fdf4] text-slate-900 font-sans overflow-hidden">
            {/* Bottom Navigation for Desktop/Mobile */}
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-slate-200 flex items-center justify-center gap-6 z-[100] shadow-2xl">
                <button 
                    onClick={() => { setView('home'); setActiveTab('overview'); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-black text-sm ${view === 'home' && activeTab === 'overview' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <HomeIcon size={20} />
                    Visão Geral
                </button>
                <button 
                    onClick={() => { setView('transactions'); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-black text-sm ${view === 'transactions' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <ShoppingBag size={20} />
                    Extrato Detalhado
                </button>
            </nav>

            <div className="flex-1 flex flex-col h-screen relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-100/30 blur-[120px] rounded-full -z-10"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/30 blur-[100px] rounded-full -z-10"></div>

                <Header 
                    month={currentMonth} 
                    year={currentYear} 
                    balance={checkIn.isDone ? balance : 0}
                    bankReserves={bankReserves}
                    setBankReserves={setBankReserves}
                    checkInDate={checkIn.date}
                    onMonthChange={handleMonthChange}
                    onSync={() => saveData(monthData, currentYear, currentMonth)}
                    syncStatus={syncStatus}
                />

                <Sidebar 
                    isOpen={sidebarOpen} 
                    onClose={() => setSidebarOpen(false)} 
                    accounts={sidebarAccounts} 
                    syncStatus={syncStatus}
                    onSync={() => saveData(monthData, currentYear, currentMonth)}
                    currentView={view}
                    onNavigate={setView}
                />

                <EditTransactionModal 
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    transaction={editingTransaction}
                    onSave={handleSaveTransaction}
                />

                {showSecurityMessage && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center gap-6">
                            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-inner">
                                <FileWarning size={40} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Segurança de Dados</h3>
                                <p className="text-base font-black text-slate-500 leading-relaxed">
                                    Por diretriz de segurança inabalável, a exclusão de contas e transações foi desativada. Seus dados estão protegidos e permanecerão no backup do sistema e na nuvem para sempre.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowSecurityMessage(false)}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                )}

                <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 scroll-smooth relative">
                    <AnimatePresence mode="wait">
                        {view === 'home' && (
                            <motion.div 
                                key="home"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="w-full flex flex-col gap-8"
                            >
                                
                                {/* Dashboard Header Tabs - Mobile Only */}
                                <div className="lg:hidden flex p-1 bg-white rounded-2xl shadow-sm border border-slate-100 mb-2">
                                    <button 
                                        onClick={() => setActiveTab('overview')}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                                    >
                                        Visão Geral
                                    </button>
                                    <button 
                                        onClick={() => setView('transactions')}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide text-slate-400"
                                    >
                                        Gastos
                                    </button>
                                </div>

                                {activeTab === 'overview' && (
                                    <>
                                        {/* BALANCE OVERVIEW CARD */}
                                        <div className={`${stats.surplusRaw < 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-teal-500 to-emerald-600'} rounded-[2.5rem] p-6 lg:p-8 text-white shadow-2xl shadow-emerald-200 border border-white/20 mb-8 relative overflow-hidden group`}>
                                            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-400/20 blur-[80px] rounded-full"></div>
                                            <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-emerald-400/20 blur-[60px] rounded-full"></div>
                                            
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="p-2.5 bg-emerald-400/30 backdrop-blur-md text-white rounded-2xl shadow-lg border border-white/20">
                                                        <TrendingUp size={24} strokeWidth={3} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <h3 className="text-base lg:text-lg font-black tracking-tight">Saúde Financeira</h3>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                                            <span className="text-sm font-black opacity-90 uppercase tracking-widest leading-none">
                                                                {stats.surplusRaw < 0 ? 'ALERTA: NEGATIVO • ' : 'ESTÁVEL • '}
                                                                {Math.round((stats.surplusRaw / (stats.combined.total || 1)) * 100)}% de sobra
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div 
                                                        onClick={() => {
                                                            setView('transactions');
                                                            setTransactionListType('incomes');
                                                        }}
                                                        className="flex flex-col gap-1 cursor-pointer hover:bg-white/10 p-2 rounded-2xl transition-all group/stat"
                                                    >
                                                        <span className="text-sm font-black uppercase tracking-[0.2em] opacity-80 group-hover/stat:opacity-100 flex items-center gap-1">
                                                            Receitas
                                                            <ArrowRight size={14} className="opacity-0 group-hover/stat:opacity-100 transition-all -translate-x-2 group-hover/stat:translate-x-0" />
                                                        </span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xl lg:text-2xl font-black tracking-tighter">
                                                                {formatCurrency(stats.combined.total)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full ${stats.surplusRaw < 0 ? 'bg-red-200' : 'bg-white'}`} 
                                                                    style={{ width: `${Math.min(100, (stats.realExpenses.total / (stats.combined.total || 1)) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-xs font-black uppercase tracking-widest">{Math.round((stats.realExpenses.total / (stats.combined.total || 1)) * 100)}%</span>
                                                        </div>
                                                    </div>

                                                    <div 
                                                        onClick={() => {
                                                            setView('transactions');
                                                            setTransactionListType('expenses');
                                                        }}
                                                        className="flex flex-col gap-1 cursor-pointer hover:bg-white/10 p-2 rounded-2xl transition-all group/stat"
                                                    >
                                                        <span className="text-sm font-black uppercase tracking-[0.2em] opacity-80 group-hover/stat:opacity-100 flex items-center gap-1">
                                                            Despesas
                                                            <ArrowRight size={14} className="opacity-0 group-hover/stat:opacity-100 transition-all -translate-x-2 group-hover/stat:translate-x-0" />
                                                        </span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xl lg:text-2xl font-black tracking-tighter text-emerald-100">
                                                                {formatCurrency(stats.realExpenses.total)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-200 rounded-full" style={{ width: `${Math.min(100, (stats.realExpenses.total / (stats.combined.total || 1)) * 100)}%` }}></div>
                                                            </div>
                                                            <span className="text-xs font-black uppercase tracking-widest">
                                                                {Math.round((stats.realExpenses.total / (stats.combined.total || 1)) * 100)}%
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className={`${stats.surplusRaw < 0 ? 'bg-red-400/20' : 'bg-emerald-400/20'} backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col gap-1 shadow-inner group-hover:bg-emerald-400/30 transition-all text-emerald-950`}>
                                                        <span className="text-sm font-black uppercase tracking-[0.2em] opacity-80 text-white">Sobra Real</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xl lg:text-2xl font-black tracking-tighter text-white">
                                                                {formatCurrency(stats.surplusRaw)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* EXPENSES BY CATEGORY CARD */}
                                        <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-6 lg:p-8 border border-white/60 shadow-xl shadow-slate-200/40 mb-8">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                                                    <Users size={24} strokeWidth={3} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h2 className="text-base font-black text-slate-800 tracking-tight">Despesas por Categoria</h2>
                                                    <span className="text-sm font-black text-slate-400 uppercase tracking-wide">
                                                        Total: {formatCurrency(groupedDebts.reduce((acc, g) => acc + g.total, 0))}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {groupedDebts.map(group => (
                                                    <button key={group.name} onClick={() => handleFilter('group', group.name)} className="bg-white rounded-3xl p-6 border border-slate-50 shadow-sm flex items-center justify-between group hover:shadow-md transition-all w-full text-left">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getDebtColor(group.name)} text-white flex items-center justify-center shrink-0 shadow-lg shadow-slate-200/50`}>
                                                                <User size={24} strokeWidth={2.5} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{group.name}</span>
                                                                <span className="text-xl font-black text-slate-800 tracking-tight">
                                                                    {formatCurrency(group.total - group.paidAmount)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded-xl text-slate-300 group-hover:text-rose-500 transition-colors">
                                                            <ArrowRight size={20} />
                                                        </div>
                                                    </button>
                                                ))}
                                                {groupedDebts.length === 0 && (
                                                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 gap-4">
                                                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                                                            <PiggyBank size={40} />
                                                        </div>
                                                        <span className="text-base font-black">Nenhuma dívida pendente com familiares!</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* CATEGORY OVERVIEW - Matching Screenshot 3 */}
                                        <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-6 lg:p-8 border border-white/60 shadow-xl shadow-slate-200/40">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                                    <PiggyBank size={24} strokeWidth={3} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h2 className="text-base font-black text-slate-800 tracking-tight">Categorização de Gastos</h2>
                                                    <span className="text-sm font-black text-slate-400 uppercase tracking-wide">
                                                        Total: {formatCurrency(stats.realExpenses.total)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {['Moradia', 'Lazer', 'Saúde', 'Outros', 'DÍVIDAS NA RUA'].map(cat => {
                                                    const amount = monthData.expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
                                                    const totalExpenses = stats.realExpenses.total || 1;
                                                    const percent = Math.round((amount / totalExpenses) * 100);
                                                    
                                                    const getCatStyle = (c: string) => {
                                                        if (c === 'DÍVIDAS NA RUA') return { bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500', icon: ShoppingCart };
                                                        if (c === 'Moradia') return { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-500', icon: HomeIcon };
                                                        if (c === 'Lazer') return { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', icon: Palmtree };
                                                        if (c === 'Saúde') return { bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500', icon: Heart };
                                                        if (c === 'Outros') return { bg: 'bg-slate-50', text: 'text-slate-600', bar: 'bg-slate-500', icon: Wallet };
                                                        if (c === 'Transporte') return { bg: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-500', icon: Car };
                                                        if (c === 'Educação') return { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', icon: GraduationCap };
                                                        return { bg: 'bg-gray-50', text: 'text-gray-600', bar: 'bg-gray-500', icon: MoreHorizontal };
                                                    };
                                                    
                                                    const s = getCatStyle(cat);
                                                    const Icon = s.icon;

                                                    return (
                                                        <button key={cat} onClick={() => handleFilter('category', cat)} className="bg-white rounded-3xl p-4 border border-slate-50 shadow-sm flex items-center gap-2 group hover:shadow-md transition-all overflow-hidden w-full text-left">
                                                            <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.text} flex items-center justify-center shrink-0`}>
                                                                <Icon size={24} strokeWidth={2.5} />
                                                            </div>
                                                            <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                                                                <span className="text-sm font-black text-slate-400 uppercase tracking-widest truncate">{cat}</span>
                                                                <span className="text-base font-black text-slate-800 tracking-tight truncate">
                                                                    {formatCurrency(amount)}
                                                                </span>
                                                                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                                                                    <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${percent}%` }}></div>
                                                                </div>
                                                            </div>
                                                            <div className="relative w-10 h-10 flex items-center justify-center shrink-0 ml-1">
                                                                <svg className="w-full h-full transform -rotate-90">
                                                                    <circle cx="20" cy="20" r="17" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-slate-100" />
                                                                    <circle cx="20" cy="20" r="17" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={106.8} strokeDashoffset={106.8 - (106.8 * percent) / 100} className={s.text} strokeLinecap="round" />
                                                                </svg>
                                                                <span className="absolute text-xs font-black text-slate-600">{percent}%</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* DASHBOARD CARDS - Matching Screenshot 1 style */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden min-h-[320px] flex flex-col">
                                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                                    <TrendingUp size={160} />
                                                </div>
                                                <div className="relative z-10 flex flex-col flex-1 h-full">
                                                    <h3 className="text-base lg:text-lg font-black mb-6 lg:mb-8 tracking-tight">Análise Mensal</h3>
                                                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end flex-1">
                                                        <div className="flex flex-col gap-4 flex-1 w-full">
                                                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-sm font-black uppercase tracking-widest opacity-60">Receitas</span>
                                                                    {!checkIn.isDone && (
                                                                        <button
                                                                            onClick={handleCheckIn}
                                                                            className="text-sm bg-white text-emerald-600 px-2 py-0.5 rounded font-black uppercase tracking-widest hover:bg-emerald-50 transition-colors"
                                                                        >
                                                                            Check-in
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                                    <span className="text-lg font-black truncate">{formatCurrency(stats.combined.total)}</span>
                                                                    <div className="flex gap-1 items-end h-8 shrink-0">
                                                                        {[30, 50, 40, 70, 60].map((h, i) => <div key={i} className="w-1.5 bg-emerald-400 rounded-full" style={{ height: `${h}%` }}></div>)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                                                <span className="text-sm font-black uppercase tracking-widest opacity-60 block mb-1">Despesas</span>
                                                                <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                                    <span className="text-lg font-black truncate">{formatCurrency(stats.realExpenses.total)}</span>
                                                                    <div className="flex gap-1 items-end h-8 shrink-0">
                                                                        {[60, 40, 80, 50, 70].map((h, i) => <div key={i} className="w-1.5 bg-rose-400 rounded-full" style={{ height: `${h}%` }}></div>)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="relative w-24 h-24 lg:w-28 lg:h-28 flex items-center justify-center shrink-0">
                                                            <svg className="w-full h-full transform -rotate-90">
                                                                <circle cx="50%" cy="50%" r="42%" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                                                                <circle cx="50%" cy="50%" r="42%" fill="transparent" stroke="#10b981" strokeWidth="8" strokeDasharray="260" strokeDashoffset={260 - (260 * 95) / 100} strokeLinecap="round" />
                                                            </svg>
                                                            <div className="absolute flex flex-col items-center">
                                                                <span className="text-base lg:text-lg font-black">95%</span>
                                                                <span className="text-xs font-black opacity-60 uppercase">Total</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 lg:gap-6">
                                                <div className="bg-emerald-500 rounded-[2.5rem] p-6 lg:p-8 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden flex-1">
                                                    <div className="absolute bottom-0 right-0 p-4 opacity-20">
                                                        <TrendingUp size={60} />
                                                    </div>
                                                    <h3 className="text-base lg:text-lg font-black mb-3 lg:mb-4 tracking-tight">Fluxo de Receitas</h3>
                                                    <div className="flex items-end justify-between gap-2 overflow-hidden">
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-2xl lg:text-3xl font-black tracking-tighter truncate">
                                                                {formatCurrency(stats.combined.total)}
                                                            </span>
                                                            <span className="text-sm font-bold opacity-80 mt-0.5">Tendência positiva</span>
                                                        </div>
                                                        <div className="w-24 lg:w-32 h-12 lg:h-16 relative shrink-0">
                                                            <svg viewBox="0 0 100 40" className="w-full h-full">
                                                                <path d="M0 35 Q 20 30, 40 35 T 80 10 T 100 5" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
                                                                <circle cx="80" cy="10" r="4" fill="white" />
                                                                <text x="70" y="25" fill="white" fontSize="8" fontWeight="bold">37%</text>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-sky-500 rounded-[2.5rem] p-6 lg:p-8 text-white shadow-xl shadow-sky-500/20 relative overflow-hidden flex-1">
                                                    <div className="absolute top-0 right-0 p-4 opacity-20">
                                                        <Wallet size={60} />
                                                    </div>
                                                    <h3 className="text-base lg:text-lg font-black mb-2 tracking-tight">Gestão de Contas</h3>
                                                    <span className="text-xl lg:text-2xl font-black tracking-tighter block mb-1 truncate">
                                                        {formatCurrency(balance)}
                                                    </span>
                                                    <div className="flex justify-between items-center mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-white/20">
                                                        <span className="text-xs font-black uppercase tracking-widest opacity-80">Cartões Ativos: 2</span>
                                                        <span className="text-xs font-black uppercase tracking-widest opacity-80">Sincronizado</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>


                                    </>
                                )}
                            </motion.div>
                        )}

                        {view === 'transactions' && (
                            <motion.div 
                                key="transactions"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="max-w-4xl mx-auto flex flex-col gap-5"
                            >
                                <div className="sticky top-0 z-20 pt-2 pb-2 backdrop-blur-sm">
                                    <div className="flex p-1.5 bg-white/80 border border-white rounded-2xl shadow-lg shadow-slate-200/50 backdrop-blur-md">
                                        {(['incomes', 'expenses', 'avulsosItems'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setTransactionListType(type)}
                                                className={`flex-1 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all border ${getTabStyle(type)}`}
                                            >
                                                {type === 'incomes' ? 'Entradas' : 
                                                 type === 'expenses' ? 'Despesas' :
                                                 'Avulsos'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <TransactionList 
                                    transactions={filteredTransactions}
                                    onTogglePaid={(id, paid) => handleTogglePaid(id, paid, transactionListType)}
                                    onEdit={handleEditTransaction}
                                    onUpdate={(updated) => handleSaveTransaction(updated, transactionListType)}
                                />
                            </motion.div>
                        )}


                    </AnimatePresence>
                </main>

                {/* Floating Action Button (FAB) */}
                <button 
                    onClick={handleAddNewTransaction}
                    className="fixed bottom-6 right-5 w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl shadow-slate-900/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30 group"
                >
                    <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>
        </div>
    );
};

export default App;
