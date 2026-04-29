import React from 'react';
import { Transaction } from '../types';
import { 
    Banknote, CreditCard, Home, ShoppingCart, Car, Heart, GraduationCap, 
    Palmtree, TrendingUp, Fuel, Gift, Coins, MoreHorizontal, FileWarning, PieChart
} from 'lucide-react';

interface ExpenseDistributionProps {
    expenses: Transaction[];
}

// Reuse icon logic locally or import if centralized
import { formatCurrency } from '../utils/financeUtils';
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

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'Moradia': return 'bg-blue-500 text-blue-100';
        case 'Alimentação': return 'bg-orange-500 text-orange-100';
        case 'Transporte': return 'bg-zinc-500 text-zinc-100';
        case 'Saúde': return 'bg-rose-500 text-rose-100';
        case 'Educação': return 'bg-emerald-500 text-emerald-100';
        case 'Lazer': return 'bg-teal-500 text-teal-100';
        case 'Dívidas': return 'bg-red-600 text-red-100';
        case 'Investimento': return 'bg-emerald-500 text-emerald-100';
        default: return 'bg-slate-500 text-slate-100';
    }
};

const ExpenseDistribution: React.FC<ExpenseDistributionProps> = ({ expenses }) => {
    // 1. Group by Category
    const grouped = expenses.reduce((acc, curr) => {
        // Filter out "Distribution" items if you don't want them in the chart
        if (curr.isDistribution) return acc;
        
        const cat = curr.category || 'Outros';
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += curr.amount;
        return acc;
    }, {} as Record<string, number>);

    // 2. Convert to Array and Sort
    const totalExpenses = (Object.values(grouped) as number[]).reduce((a, b) => a + b, 0) || 1;
    const sortedCategories = (Object.entries(grouped) as [string, number][])
        .map(([cat, amount]) => ({
            cat,
            amount,
            percent: (amount / totalExpenses) * 100
        }))
        .sort((a, b) => b.amount - a.amount);

    const format = (v: number) => formatCurrency(v, true);

    if (sortedCategories.length === 0) return null;

    return (
        <div className="w-full bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                    <PieChart size={20} strokeWidth={3} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 leading-none">Distribuição de Gastos</h3>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Onde seu dinheiro está indo</span>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {sortedCategories.map((item, index) => (
                    <div key={item.cat} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${getCategoryColor(item.cat).replace('bg-', 'bg-opacity-20 bg-').replace('text-100', 'text-700')}`}>
                                    {getCategoryIcon(item.cat)}
                                </div>
                                <span className="text-sm font-black text-slate-700">{item.cat}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-black text-slate-900 mr-2">{format(item.amount)}</span>
                                <span className="text-sm font-bold text-slate-400">{Math.round(item.percent)}%</span>
                            </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${getCategoryColor(item.cat)}`} 
                                style={{ width: `${item.percent}%`, transition: 'width 1s ease-out' }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExpenseDistribution;