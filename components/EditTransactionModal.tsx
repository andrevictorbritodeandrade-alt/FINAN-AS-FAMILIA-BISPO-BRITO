import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { X, Save, Calendar, Tag, DollarSign, Type, Check, ChevronDown, ArrowUpCircle, ArrowDownCircle, Layers, Hash } from 'lucide-react';
import { 
    Banknote, CreditCard, Home, ShoppingCart, Car, Heart, GraduationCap, 
    Palmtree, TrendingDown, TrendingUp, Fuel, Gift, Coins, MoreHorizontal, FileWarning 
} from 'lucide-react';

interface EditTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    onSave: (updatedTransaction: Transaction, type: TransactionType) => void;
}

const getCategoryIcon = (category: string) => {
    const props = { size: 16, strokeWidth: 3 };
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

const CATEGORIES = [
    'Salário', 'Mumbuca', 'Moradia', 'Alimentação', 'Transporte', 'Saúde', 
    'Educação', 'Lazer', 'Dívidas', 'Investimento', 'Abastecimento', 
    'Doação', 'Renda Extra', 'Outros'
];

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ isOpen, onClose, transaction, onSave }) => {
    const [formData, setFormData] = useState<Transaction | null>(null);
    const [transactionType, setTransactionType] = useState<TransactionType>('expenses');
    
    // New States for enhanced control
    const [groupType, setGroupType] = useState<string>('Despesas Variáveis');
    const [isInstallment, setIsInstallment] = useState(false);
    const [isSuspended, setIsSuspended] = useState(false);
    const [suspendedUntil, setSuspendedUntil] = useState('');
    const [currentInst, setCurrentInst] = useState(1);
    const [totalInst, setTotalInst] = useState(1);

    useEffect(() => {
        if (isOpen) {
            if (transaction) {
                // Editing existing
                setFormData({ ...transaction });
                
                // Set Transaction Type (Income/Expense)
                const isIncome = ['Salário', 'Mumbuca', 'Renda Extra', 'Doação'].includes(transaction.category);
                setTransactionType(isIncome ? 'incomes' : 'expenses');

                // Set Group Type (Fixed/Variable)
                setGroupType(transaction.group || 'Despesas Variáveis');

                // Set Suspension
                setIsSuspended(transaction.isSuspended || false);
                setSuspendedUntil(transaction.suspendedUntil || '');

                // Set Installments
                if (transaction.installments) {
                    setIsInstallment(true);
                    setCurrentInst(transaction.installments.current);
                    setTotalInst(transaction.installments.total);
                } else {
                    setIsInstallment(false);
                    setCurrentInst(1);
                    setTotalInst(1);
                }
            } else {
                // Creating new
                setFormData({
                    id: `new_${Date.now()}`,
                    description: '',
                    amount: 0,
                    category: 'Outros',
                    paid: false,
                    date: new Date().toISOString().split('T')[0],
                    dueDate: new Date().toISOString().split('T')[0],
                });
                setTransactionType('expenses');
                setGroupType('Despesas Variáveis');
                setIsInstallment(false);
                setIsSuspended(false);
                setSuspendedUntil('');
                setCurrentInst(1);
                setTotalInst(2);
            }
        }
    }, [isOpen, transaction]);

    if (!isOpen || !formData) return null;

    const handleChange = (field: keyof Transaction, value: any) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            // Prepare final object
            const finalTransaction = { ...formData };
            
            // Apply Group
            finalTransaction.group = groupType;

            // Apply Suspension
            finalTransaction.isSuspended = isSuspended;
            finalTransaction.suspendedUntil = isSuspended ? suspendedUntil : '';

            // Apply Installments
            if (isInstallment && transactionType === 'expenses') {
                finalTransaction.installments = {
                    current: currentInst,
                    total: totalInst
                };
            } else {
                delete finalTransaction.installments;
            }

            onSave(finalTransaction, transactionType);
            onClose();
        }
    };

    const dateField = formData.dueDate ? 'dueDate' : 'date';
    const currentDateValue = formData.dueDate || formData.date || '';

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div>
                        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">
                            {transaction ? 'Editar' : 'Nova'}
                        </span>
                        <h2 className="text-2xl font-black text-slate-900">
                            {transaction ? 'Detalhes da Conta' : 'Adicionar Conta'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-800 transition-colors">
                        <X size={28} strokeWidth={3} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto bg-slate-50/50">
                    
                    {/* Transaction Type Toggle */}
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTransactionType('incomes')}
                            className={`flex-1 py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-all ${
                                transactionType === 'incomes' 
                                ? 'bg-emerald-100 text-emerald-700 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <ArrowUpCircle size={22} strokeWidth={3} /> Receita
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransactionType('expenses')}
                            className={`flex-1 py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-all ${
                                transactionType === 'expenses' 
                                ? 'bg-rose-100 text-rose-700 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <ArrowDownCircle size={22} strokeWidth={3} /> Despesa
                        </button>
                    </div>

                    {/* Expense Group Selector (Fixed vs Variable) - Only for Expenses */}
                    {transactionType === 'expenses' && (
                        <div className="space-y-2">
                             <label className="text-base font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                                <Layers size={18} strokeWidth={3} /> Classificação
                            </label>
                            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setGroupType('Despesas Fixas')}
                                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                                        groupType === 'Despesas Fixas' 
                                        ? 'bg-teal-100 text-teal-700 shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Fixa / Recorrente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGroupType('Despesas Variáveis')}
                                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                                        groupType === 'Despesas Variáveis' 
                                        ? 'bg-emerald-100 text-emerald-700 shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Variável / Pontual
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-base font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                            <Type size={18} strokeWidth={3} /> Descrição
                        </label>
                        <input 
                            type="text" 
                            required
                            placeholder="Ex: Supermercado, Aluguel..."
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-black text-lg focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all shadow-sm placeholder:font-normal placeholder:opacity-50"
                        />
                    </div>

                    {/* Amount & Paid Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-base font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                                <DollarSign size={18} strokeWidth={3} /> Valor
                            </label>
                            <input 
                                type="number" 
                                step="0.01"
                                required
                                value={formData.amount || ''}
                                onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-black text-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                             <label className="text-base font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                                Status
                            </label>
                            <button
                                type="button"
                                onClick={() => handleChange('paid', !formData.paid)}
                                className={`w-full h-[64px] rounded-2xl font-black text-lg flex items-center justify-center gap-2 border transition-all shadow-sm ${
                                    formData.paid 
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-gray-50'
                                }`}
                            >
                                {formData.paid ? <Check size={20} strokeWidth={4} /> : null}
                                {formData.paid ? 'PAGO' : 'PENDENTE'}
                            </button>
                        </div>
                    </div>

                    {/* Installments Logic (Only for Expenses) */}
                    {transactionType === 'expenses' && (
                        <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-base font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                    <Hash size={18} strokeWidth={3} /> É Parcelado?
                                </label>
                                <div 
                                    onClick={() => setIsInstallment(!isInstallment)}
                                    className={`w-14 h-8 rounded-full flex items-center px-1 cursor-pointer transition-colors ${isInstallment ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isInstallment ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                            
                            {isInstallment && (
                                <div className="grid grid-cols-2 gap-4 pt-2 animate-fadeIn">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase">Parcela Atual</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={currentInst}
                                            onChange={(e) => setCurrentInst(parseInt(e.target.value) || 1)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-black outline-none focus:border-emerald-500 text-center text-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase">Total Parcelas</label>
                                        <input 
                                            type="number" 
                                            min="2"
                                            value={totalInst}
                                            onChange={(e) => setTotalInst(parseInt(e.target.value) || 2)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-black outline-none focus:border-emerald-500 text-center text-lg"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Suspension Logic */}
                    <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-base font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                <FileWarning size={18} strokeWidth={3} /> Suspender Conta?
                            </label>
                            <div 
                                onClick={() => setIsSuspended(!isSuspended)}
                                className={`w-14 h-8 rounded-full flex items-center px-1 cursor-pointer transition-colors ${isSuspended ? 'bg-rose-500' : 'bg-slate-200'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isSuspended ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                        
                        {isSuspended && (
                            <div className="pt-2 animate-fadeIn space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase">Suspender até (Mês/Ano)</label>
                                <input 
                                    type="month" 
                                    value={suspendedUntil}
                                    onChange={(e) => setSuspendedUntil(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-black outline-none focus:border-rose-500 text-lg"
                                />
                                <p className="text-sm text-slate-400 font-black italic">Deixe em branco para suspensão por tempo indeterminado.</p>
                            </div>
                        )}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-base font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                            <Tag size={18} strokeWidth={3} /> Categoria
                        </label>
                        <div className="relative">
                            <select 
                                value={formData.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                                style={{ paddingLeft: '48px' }}
                                className="w-full appearance-none bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-black text-lg focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all shadow-sm"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown size={24} strokeWidth={3} />
                            </div>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                                {getCategoryIcon(formData.category)}
                            </div>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-base font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                            <Calendar size={18} strokeWidth={3} /> Data / Vencimento
                        </label>
                        <input 
                            type="date" 
                            value={currentDateValue}
                            onChange={(e) => handleChange(dateField, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-black text-lg focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all shadow-sm"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 flex gap-3 pb-4">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-5 rounded-2xl font-black text-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-[2] py-5 rounded-2xl font-black text-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transform"
                        >
                            <Save size={22} strokeWidth={3} /> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTransactionModal;