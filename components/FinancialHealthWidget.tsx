import React from 'react';
import { ShieldCheck, ShieldAlert, TrendingUp, Zap, Activity } from 'lucide-react';
import { formatCurrency } from '../utils/financeUtils';

interface FinancialHealthWidgetProps {
    income: number;
    expenses: number;
    surplus: number;
}

const FinancialHealthWidget: React.FC<FinancialHealthWidgetProps> = ({ income, expenses, surplus }) => {
    // Evita divisão por zero
    const safeIncome = income || 1;
    
    // Taxa de Poupança (Savings Rate)
    const savingsRate = (surplus / safeIncome) * 100;
    
    // Algoritmo de Score "XP Style" (0 a 1000)
    let score = 500;
    
    if (surplus >= 0) {
        score += Math.min(500, (savingsRate * 16.6)); 
    } else {
        const lossRate = Math.abs(savingsRate);
        score -= Math.min(500, (lossRate * 20));
    }

    score = Math.round(Math.max(0, Math.min(1000, score)));

    // Determina Nível e Cor
    let status = { text: '', color: '', icon: Activity, gradient: '' };
    if (score >= 850) {
        status = { text: 'EXCELÊNCIA', color: 'text-emerald-400', icon: Zap, gradient: 'from-emerald-400 to-teal-300' };
    } else if (score >= 700) {
        status = { text: 'ALTA SOLIDEZ', color: 'text-cyan-400', icon: ShieldCheck, gradient: 'from-cyan-400 to-blue-400' };
    } else if (score >= 500) {
        status = { text: 'EQUILÍBRIO', color: 'text-emerald-500', icon: TrendingUp, gradient: 'from-emerald-500 to-teal-400' };
    } else if (score >= 300) {
        status = { text: 'ATENÇÃO', color: 'text-amber-400', icon: Activity, gradient: 'from-amber-400 to-orange-400' };
    } else {
        status = { text: 'RISCO CRÍTICO', color: 'text-rose-500', icon: ShieldAlert, gradient: 'from-rose-500 to-red-600' };
    }

    const Icon = status.icon;

    // SVG Circle Calculations
    // Usamos um viewBox de 128x128. Centro em 64,64.
    const radius = 56; // Levemente menor que 58 para garantir margem dentro do viewBox
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((score / 1000) * circumference);

    return (
        <div className="relative w-full bg-slate-900 rounded-[2rem] p-5 shadow-2xl shadow-slate-900/20 overflow-hidden group border border-slate-800">
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${status.gradient} opacity-10 blur-[80px] rounded-full transform translate-x-1/3 -translate-y-1/3`}></div>

            <div className="relative z-10 flex flex-row items-center justify-between gap-2">
                
                {/* Left Side: Text Info */}
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${status.color}`}>
                            <Icon size={14} strokeWidth={3} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 truncate">FinScore AI</span>
                    </div>
                    
                    <h3 className={`text-xl sm:text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r ${status.gradient} drop-shadow-sm truncate`}>
                        {status.text}
                    </h3>
                    
                    <p className="text-sm sm:text-xs font-bold text-slate-400 leading-relaxed mt-1 max-w-[200px]">
                        {score >= 700 
                            ? "Aporte acima da média. Potencial alto."
                            : score >= 500 
                            ? "Contas em dia. Aumente liquidez."
                            : "Alerta. Revise custos fixos."}
                    </p>
                </div>

                {/* Right Side: Radial Chart */}
                {/* Reduzido para w-28 (112px) para caber melhor em telas pequenas */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                    {/* SVG Circle with viewBox for scaling */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                        {/* Background Circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="10"
                            fill="transparent"
                            className="text-slate-800"
                        />
                        {/* Progress Circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="10"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className={`${status.color} transition-all duration-1000 ease-out`}
                            style={{ filter: 'drop-shadow(0 0 6px rgba(currentColor, 0.5))' }}
                        />
                    </svg>
                    
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-black uppercase text-slate-500">Score</span>
                        <span className={`text-2xl font-black tracking-tighter ${status.color}`}>
                            {score}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Bar: Stats */}
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-sm font-black uppercase text-slate-500 tracking-wider">Margem</span>
                    <span className={`text-xs font-black ${surplus >= 0 ? 'text-white' : 'text-rose-400'}`}>
                        {surplus >= 0 ? '+' : ''}{Math.round(savingsRate)}%
                    </span>
                </div>
                <div className="h-4 w-px bg-white/10 mx-2"></div>
                <div className="flex flex-col text-right">
                    <span className="text-sm font-black uppercase text-slate-500 tracking-wider">Poder</span>
                    <span className="text-xs font-black text-white">
                        {formatCurrency(surplus, true)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FinancialHealthWidget;