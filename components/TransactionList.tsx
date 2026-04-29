import React from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { 
    Banknote, CreditCard, Home, ShoppingCart, Car, Heart, GraduationCap, 
    Palmtree, TrendingDown, TrendingUp, Fuel, Gift, Coins, MoreHorizontal, FileWarning,
    Calendar, CheckCircle2
} from 'lucide-react';

interface TransactionListProps {
    transactions: Transaction[];
    onTogglePaid: (id: string, paid: boolean) => void;
    onEdit: (transaction: Transaction) => void;
    onUpdate: (transaction: Transaction) => void;
    compact?: boolean;
}

// Helper para ícones
const getCategoryIcon = (category: string) => {
    const props = { size: 18, strokeWidth: 3 }; // Aumentado strokeWidth
    switch (category) {
        case 'Salário': return <Banknote {...props} />;
        case 'Mumbuca': return <CreditCard {...props} />;
        case 'Moradia': return <Home {...props} />;
        case 'Alimentação': return <ShoppingCart {...props} />;
        case 'Transporte': return <Car {...props} />;
        case 'Saúde': return <Heart {...props} />;
        case 'Educação': return <GraduationCap {...props} />;
        case 'Lazer': return <Palmtree {...props} />;
        case 'Dívidas': return <FileWarning {...props} />;
        case 'Investimento': return <TrendingUp {...props} />;
        case 'Abastecimento': return <Fuel {...props} />;
        case 'Doação': return <Gift {...props} />;
        case 'Renda Extra': return <Coins {...props} />;
        default: return <MoreHorizontal {...props} />;
    }
};

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'Salário': return 'bg-emerald-100/40 text-emerald-700 border-emerald-100';
        case 'Mumbuca': return 'bg-rose-100/40 text-rose-700 border-rose-100';
        case 'Moradia': return 'bg-emerald-50 text-emerald-700 border-emerald-100'; // Cor levemente verde
        case 'Alimentação': return 'bg-orange-100/40 text-orange-700 border-orange-100';
        case 'Lazer': return 'bg-teal-100/40 text-teal-700 border-teal-100';
        case 'Investimento': return 'bg-amber-100/40 text-amber-700 border-amber-100';
        case 'Educação': return 'bg-emerald-100/40 text-emerald-700 border-emerald-100';
        case 'Saúde': return 'bg-red-100/40 text-red-700 border-red-100';
        case 'Transporte': return 'bg-cyan-100/40 text-cyan-700 border-cyan-100';
        case 'Dívidas': return 'bg-slate-100/60 text-slate-700 border-slate-200';
        default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
};

const getCardBgColor = (category: string) => {
    switch (category) {
        case 'Moradia': return 'bg-emerald-50/70 border-emerald-100/50'; // Verde leve solicitado
        case 'Alimentação': return 'bg-orange-50/70 border-orange-100/50';
        case 'Saúde': return 'bg-rose-50/70 border-rose-100/50';
        case 'Educacao':
        case 'Educação': return 'bg-emerald-50/70 border-emerald-100/50';
        case 'Lazer': return 'bg-teal-50/70 border-teal-100/50';
        case 'Transporte': return 'bg-cyan-50/70 border-cyan-100/50';
        case 'Dívidas': return 'bg-slate-100/50 border-slate-200/50';
        case 'Investimento': return 'bg-amber-50/70 border-amber-100/50';
        case 'Mumbuca': return 'bg-rose-50/70 border-rose-100/50';
        case 'Salário': return 'bg-emerald-50/70 border-emerald-100/50';
        default: return 'bg-white border-white';
    }
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onTogglePaid, onEdit, onUpdate, compact = false }) => {
    const format = (v: number) => formatCurrency(v);

    // Grouping Logic
    const grouped = transactions.reduce((groups, transaction) => {
        const key = transaction.group || transaction.dueDate || transaction.date || 'Sem Data';
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(transaction);
        return groups;
    }, {} as Record<string, Transaction[]>);

    // Sorting Keys
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const priority = [
            'Distribuição de Sobras (Planejamento)',
            'MORADIA',
            'MARCIA BRITO',
            'MARCIA BISPO',
            'LILI TORRES',
            'REBECCA BRITO',
            'JADY',
            'IAGO',
            'DÍVIDAS NA RUA'
        ];
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return b.localeCompare(a);
    });

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-20 h-20 bg-gradient-to-tr from-gray-50 to-white rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <Calendar size={32} className="opacity-50" strokeWidth={2.5} />
                </div>
                <p className="text-base font-black text-gray-400 uppercase tracking-widest">Nenhuma movimentação</p>
            </div>
        );
    }

    const formatDateHeader = (key: string) => {
        if (key.includes('Distribuição') || key === 'MORADIA' || key === 'MARCIA BRITO' || key === 'MARCIA BISPO' || key === 'LILI TORRES' || key === 'REBECCA BRITO' || key === 'JADY' || key === 'IAGO' || key === 'DÍVIDAS NA RUA' || key === 'Sem Data') return key;
        const [year, month, day] = key.split('-');
        if (!year || !month || !day) return key;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const today = new Date();
        today.setHours(0,0,0,0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        if (transactionDate.getTime() === today.getTime()) return 'Hoje';
        if (transactionDate.getTime() === yesterday.getTime()) return 'Ontem';

        return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', weekday: 'short' }).format(date);
    };

    const getHeaderStyle = (key: string) => {
        if (key.includes('Distribuição')) return 'text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-700';
        if (key === 'MORADIA') return 'text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-700';
        if (key === 'MARCIA BRITO') return 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-700';
        if (key === 'MARCIA BISPO') return 'text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-red-700';
        if (key === 'LILI TORRES') return 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-700';
        if (key === 'REBECCA BRITO') return 'text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-pink-700';
        if (key === 'JADY') return 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-amber-700';
        if (key === 'IAGO') return 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500';
        if (key === 'DÍVIDAS NA RUA') return 'text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-600';
        return 'text-gray-600';
    };

    if (compact) {
        const sortedList = transactions.filter(t => !t.isSuspended).sort((a, b) => (b.dueDate || b.date || '').localeCompare(a.dueDate || a.date || '')).slice(0, 5);
        return (
            <div className="flex flex-col gap-2">
                {sortedList.map(item => (
                    <div key={item.id} className={`flex items-center justify-between py-4 px-4 rounded-xl shadow-sm border transition-all cursor-pointer ${getCardBgColor(item.category)} hover:shadow-md`} onClick={() => onEdit(item)}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColor(item.category)} shrink-0`}>
                                {getCategoryIcon(item.category)}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className={`text-base font-black truncate ${item.paid ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {item.description}
                                </span>
                                <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                                    {item.category}
                                </span>
                            </div>
                        </div>
                        <span className={`text-base font-black whitespace-nowrap ${item.paid ? 'text-gray-400' : 'text-gray-900'}`}>
                            {format(item.amount)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col pb-24">
            {sortedKeys.map(key => (
                <div key={key} className="mb-6 animate-fadeIn">
                    <div className="sticky top-0 z-10 backdrop-blur-md bg-slate-50/80 py-3 mb-2 px-1 rounded-lg">
                        <h3 className={`text-sm font-black uppercase tracking-widest ${getHeaderStyle(key)}`}>
                            {formatDateHeader(key)}
                        </h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        {grouped[key].map(item => {
                            const isAllocation = key.includes('Distribuição');
                            return (
                                <div 
                                    key={item.id} 
                                    className={`relative group rounded-2xl p-5 flex items-center gap-4 border transition-all duration-300 active:scale-[0.98] cursor-pointer overflow-hidden
                                        ${isAllocation 
                                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-100 shadow-sm' 
                                            : `${getCardBgColor(item.category)} shadow-[0_4px_20px_-12px_rgba(0,0,0,0.08)] hover:shadow-lg`
                                        }
                                        ${item.paid ? 'opacity-60 grayscale-[0.5]' : (item.skipped || item.isSuspended) ? 'opacity-40 grayscale' : ''}`}
                                    onClick={(e) => {
                                        if (!(e.target as HTMLElement).closest('.toggle-area')) {
                                            onEdit(item);
                                        }
                                    }}
                                >
                                    {/* SWITCH TOGGLE BUTTON - Modernized */}
                                    <div className="toggle-area shrink-0 self-center z-10 flex gap-2">
                                         <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTogglePaid(item.id, !item.paid);
                                            }}
                                            className={`relative w-14 h-8 rounded-full transition-all duration-500 ease-out focus:outline-none ${
                                                item.paid 
                                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                                    : 'bg-gray-200 shadow-inner'
                                            }`}
                                         >
                                            <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) flex items-center justify-center ${
                                                item.paid ? 'translate-x-6' : 'translate-x-0'
                                            }`}>
                                                {item.paid && <CheckCircle2 size={12} className="text-emerald-600" strokeWidth={4} />}
                                            </div>
                                         </button>
                                         
                                         {/* SKIPPED/LOCKED TOGGLE */}
                                         <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdate({...item, skipped: !item.skipped});
                                            }}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${item.skipped ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                         >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                         </button>
                                    </div>

                                    {/* CONTENT */}
                                    <div className="flex-1 flex flex-col gap-1 overflow-hidden z-10 text-lg">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1 flex flex-col">
                                                <input 
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => onUpdate({ ...item, description: e.target.value })}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`flex-1 bg-transparent border-none p-0 focus:ring-0 font-black text-base sm:text-lg leading-tight break-words outline-none ${item.paid || item.skipped || item.isSuspended ? 'text-gray-400 line-through' : isAllocation ? 'text-amber-900' : 'text-slate-800'}`}
                                                />
                                                {item.isSuspended && (
                                                    <span className="text-xs font-black text-rose-500 uppercase tracking-tighter flex items-center gap-1">
                                                        <FileWarning size={10} /> Suspensa {item.suspendedUntil ? `até ${item.suspendedUntil}` : 'indeterminado'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-sm font-black opacity-50 ${item.paid ? 'text-gray-400' : 'text-slate-400'}`}>R$</span>
                                                <input 
                                                    type="number"
                                                    value={item.amount}
                                                    onChange={(e) => onUpdate({ ...item, amount: parseFloat(e.target.value) || 0 })}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`w-20 sm:w-28 bg-transparent border-none p-0 focus:ring-0 font-black text-base sm:text-lg text-right outline-none tracking-tight ${item.paid ? 'text-gray-400' : isAllocation ? 'text-amber-900' : 'text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide ${getCategoryColor(item.category)} bg-opacity-50`}>
                                                {getCategoryIcon(item.category)}
                                                <span>{item.category}</span>
                                            </div>
                                            
                                            {item.dueDate && (
                                                <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-sm">
                                                    <span className="text-xs font-black tracking-widest uppercase opacity-70">Dia</span>
                                                    <span className="text-sm font-black">{item.dueDate.split('-')[2]}</span>
                                                </div>
                                            )}
                                            {item.installments && (
                                                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                                                    <span className="text-xs font-black tracking-widest uppercase opacity-70">Parc.</span>
                                                    <span className="text-sm font-black">{item.installments.current === 0 ? 'Ñ' : item.installments.current}/{item.installments.total}</span>
                                                </div>
                                            )}
                                            {item.paidAt && (
                                                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                                                    <span className="text-xs font-black tracking-widest uppercase opacity-70">Pago em</span>
                                                    <span className="text-xs font-black">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(item.paidAt))}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TransactionList;