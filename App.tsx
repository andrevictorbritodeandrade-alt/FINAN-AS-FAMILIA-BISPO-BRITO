import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Tag,
  Calendar,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Smartphone,
  Download
} from 'lucide-react';
import { format, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction, BankReserves, MonthData } from './types';
import { getDefaultData } from './utils/financeUtils';
import { MONTHS, CATEGORIES } from './constants';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 30)); // April 30, 2026
    const [monthData, setMonthData] = useState<MonthData | null>(null);
    const [bankReserves, setBankReserves] = useState<BankReserves>({
        santander: 523.81, 
        inter: 0,
        sofisa: 8702
    });
    const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'avulsos'>('expense');

    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Force update logic (v27)
    useEffect(() => {
        const forceUpdateV27 = localStorage.getItem('force_update_v27_final_responsive');
        if (!forceUpdateV27) {
            localStorage.clear();
            localStorage.setItem('force_update_v27_final_responsive', 'true');
            // Re-initialize starting reserves
            const initialReserves = { santander: 523.81, inter: 0, sofisa: 8702 };
            localStorage.setItem('bankReserves', JSON.stringify(initialReserves));
            window.location.reload();
        }
    }, []);

    // Load data
    useEffect(() => {
        const key = `financeData_${currentYear}_${currentMonth}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            setMonthData(JSON.parse(saved));
        } else {
            const defaults = getDefaultData(currentYear, currentMonth);
            setMonthData(defaults);
            localStorage.setItem(key, JSON.stringify(defaults));
        }

        const savedReserves = localStorage.getItem('bankReserves');
        if (savedReserves) {
            setBankReserves(JSON.parse(savedReserves));
        }
    }, [currentYear, currentMonth]);

    const saveData = (data: MonthData) => {
        const key = `financeData_${currentYear}_${currentMonth}`;
        localStorage.setItem(key, JSON.stringify(data));
        setMonthData(data);
    };

    const saveReserves = (reserves: BankReserves) => {
        localStorage.setItem('bankReserves', JSON.stringify(reserves));
        setBankReserves(reserves);
    };

    const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

    const togglePaid = (id: string, listType: 'income' | 'expenses' | 'avulsosItems') => {
        if (!monthData) return;
        const newData = { ...monthData };
        newData[listType] = newData[listType].map(item => {
            if (item.id === id) {
                const newPaid = !item.paid;
                // Update bank reserves if paying/unpaying from Santander (default)
                if (newPaid) {
                    saveReserves({ ...bankReserves, santander: bankReserves.santander - item.amount });
                } else {
                    saveReserves({ ...bankReserves, santander: bankReserves.santander + item.amount });
                }
                return { ...item, paid: newPaid };
            }
            return item;
        });
        saveData(newData);
    };

    const totals = useMemo(() => {
        if (!monthData) return { income: 0, expenses: 0, avulsos: 0 };
        return {
            income: monthData.income.reduce((acc, i) => acc + i.amount, 0),
            expenses: monthData.expenses.reduce((acc, i) => acc + i.amount, 0),
            avulsos: monthData.avulsosItems.reduce((acc, i) => acc + i.amount, 0)
        };
    }, [monthData]);

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    if (!monthData) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

    const currentList = activeTab === 'income' ? monthData.income : 
                      activeTab === 'expense' ? monthData.expenses : 
                      monthData.avulsosItems;

    // Grouping for better display
    const groupedItems = currentList.reduce((acc: any, item) => {
        const group = item.group || 'OUTROS';
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-[#f0fdfa] pb-24 font-sans text-[#134e4a]">
            {/* Header / Nav */}
            <header className="bg-gradient-to-b from-[#2dd4bf] to-[#0d9488] p-6 text-white shadow-lg sticky top-0 z-50">
                <div className="mx-auto max-w-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xs uppercase font-bold tracking-widest opacity-80">BOM DIA, FAMÍLIA!</h1>
                            <p className="text-sm font-medium">{format(currentDate, "EEEE, dd 'DE' MMMM", { locale: ptBR }).toUpperCase()}</p>
                        </div>
                        <button onClick={() => window.location.reload()} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <RefreshCw size={20} />
                        </button>
                    </div>

                    {/* Month Picker */}
                    <div className="flex items-center justify-center gap-4 bg-white/10 rounded-xl p-2 mb-6 backdrop-blur-sm">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-white/20 rounded-lg"><ChevronLeft /></button>
                        <div className="flex flex-col items-center min-w-32">
                            <span className="text-lg font-bold">{MONTHS[currentMonth-1]}</span>
                            <span className="text-xs opacity-70 leading-none">{currentYear}</span>
                        </div>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-white/20 rounded-lg"><ChevronRight /></button>
                    </div>

                    {/* Bank Cards - Responsive Grid for better visibility */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-2xl shadow-md border border-white/10 flex flex-col justify-between col-span-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">SANTANDER</p>
                            <p className="text-lg font-black break-all leading-tight">{formatCurrency(bankReserves.santander)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-2xl shadow-md border border-white/10 flex flex-col justify-between col-span-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">INTER</p>
                            <p className="text-lg font-black break-all leading-tight">{formatCurrency(bankReserves.inter)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-5 rounded-2xl shadow-md border border-white/10 flex flex-col justify-between col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">SOFISA (RESERVA)</p>
                            <p className="text-2xl font-black">{formatCurrency(bankReserves.sofisa)}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-lg p-4">
                {/* Tabs */}
                <div className="flex p-1 bg-white rounded-2xl shadow-sm border border-teal-100 mb-6">
                    <button 
                        onClick={() => setActiveTab('income')}
                        className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'income' ? 'bg-teal-50 text-teal-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        ENTRADAS
                    </button>
                    <button 
                        onClick={() => setActiveTab('expense')}
                        className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'expense' ? 'bg-teal-50 text-teal-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        DESPESAS
                    </button>
                    <button 
                        onClick={() => setActiveTab('avulsos')}
                        className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'avulsos' ? 'bg-teal-50 text-teal-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        AVULSOS
                    </button>
                </div>

                {/* List of Items */}
                <div className="space-y-8">
                    {Object.entries(groupedItems).map(([group, items]: [string, any]) => (
                        <div key={group} className="space-y-3">
                            <h2 className="text-xs font-black tracking-[0.2em] text-teal-800 opacity-60 px-2 uppercase">{group}</h2>
                            <div className="space-y-3">
                                {items.map((item: Transaction) => (
                                    <motion.div 
                                        layout
                                        key={item.id} 
                                        className={`bg-white p-4 rounded-2xl shadow-sm border border-teal-50 flex items-center gap-4 transition-all ${item.paid ? 'opacity-60' : ''}`}
                                    >
                                        <button 
                                            onClick={() => togglePaid(item.id, activeTab === 'income' ? 'income' : activeTab === 'expense' ? 'expenses' : 'avulsosItems')}
                                            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all ${item.paid ? 'bg-teal-500 text-white shadow-inner' : 'bg-gray-100 text-gray-400'}`}
                                        >
                                            {item.paid ? <CheckCircle2 size={24} /> : <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />}
                                        </button>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                <h3 className={`font-bold text-sm truncate ${item.paid ? 'line-through' : ''}`}>
                                                    {item.description}
                                                </h3>
                                                <span className={`font-black text-sm whitespace-nowrap shrink-0 ${activeTab === 'income' ? 'text-green-600' : 'text-teal-900'}`}>
                                                    {formatCurrency(item.amount)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg flex items-center gap-1 uppercase">
                                                    <Tag size={10} /> {item.category}
                                                </span>
                                                {item.dueDate && (
                                                    <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                                                        DIA {item.dueDate.split('-')[2]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {currentList.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-50 shadow-sm">
                                <Plus className="text-gray-300" />
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhuma movimentação</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Nav / Fixation */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f0fdfa] via-[#f0fdfa] to-transparent pointer-events-none">
                <div className="max-w-lg mx-auto flex items-center justify-center gap-3 pointer-events-auto">
                    <button className="flex-1 bg-[#134e4a] text-white p-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:scale-[0.98] transition-transform">
                        <Smartphone size={20} />
                        <span className="text-sm font-bold uppercase tracking-wider">Instalar App</span>
                    </button>
                </div>
            </div>

            {/* PWA Prompt Mockup (simplified for now) */}
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
};

export default App;
