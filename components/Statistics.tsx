import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, PiggyBank, GraduationCap, Plane, Wallet, ArrowRight, CheckCircle2, AlertCircle, ShoppingCart, Info, BarChart3, Target, Bike, Flame } from 'lucide-react';
import { MonthData, Transaction, DebtSettlement } from '../types';
import { formatCurrency, generateMonthData } from '../utils/financeUtils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, LabelList } from 'recharts';

interface StatisticsProps {
  monthData: MonthData;
  currentMonth: number;
  currentYear: number;
}

const Statistics: React.FC<StatisticsProps> = ({ monthData, currentMonth, currentYear }) => {
  
  const settlements = useMemo(() => monthData.debtSettlements || [], [monthData]);
  
  // Projection Logic: Predict next 12 months
  const projections = useMemo(() => {
    const data = [];
    const monthsToShow = 12;
    
    let year = currentYear;
    let month = currentMonth;

    for (let i = 0; i < monthsToShow; i++) {
        const projData = generateMonthData(year, month);
        
        const totalIncome = projData.incomes.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = projData.expenses.reduce((sum, t) => sum + t.amount, 0);
        const totalAvulsos = projData.avulsosItems.reduce((sum, t) => sum + t.amount, 0);
        
        const surplus = totalIncome - totalExpenses - totalAvulsos;
        
        data.push({
            name: `${month}/${year.toString().slice(2)}`,
            month,
            year,
            income: totalIncome,
            expense: totalExpenses + totalAvulsos,
            surplus: Math.round(surplus * 100) / 100,
            activeDebts: projData.expenses.filter(e => e.installments).length,
            recommendedInvest: surplus > 0 ? Math.round(surplus * (surplus > 3000 ? 0.4 : 0.2)) : 0,
            investPercent: surplus > 0 ? (surplus > 3000 ? '40%' : '20%') : '0%'
        });

        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
    }
    return data;
  }, [currentMonth, currentYear]);

  // Settlement Progress Logic
  const settlementProgress = useMemo(() => {
    const totalIncomes = monthData.incomes.reduce((a, b) => a + b.amount, 0);
    const totalExpenses = monthData.expenses.reduce((a, b) => a + b.amount, 0);
    const totalAvulsos = monthData.avulsosItems.reduce((a, b) => a + b.amount, 0);
    const surplus = totalIncomes - totalExpenses - totalAvulsos;
    
    const needed = settlements.reduce((acc, s) => acc + (s.isPaid ? 0 : s.amount), 0);
    const monthlySaving = surplus > 0 ? Math.round(surplus * 0.3) : 0; 
    const monthsToFinish = (monthlySaving > 0 && needed > 0) ? Math.ceil(needed / monthlySaving) : (needed <= 0 ? 0 : Infinity);

    return { needed, monthlySaving, monthsToFinish, surplus };
  }, [monthData, settlements]);

  // Debt Ending Analysis
  const debtEndings = useMemo(() => {
    const installments = monthData.expenses.filter(e => e.installments);
    const endings: { desc: string, endMonth: string, remainingMonths: number }[] = [];

    installments.forEach(e => {
        if (e.installments) {
            const remaining = e.installments.total - e.installments.current;
            let endMonthNum = currentMonth + remaining;
            let endYearNum = currentYear;
            
            while (endMonthNum > 12) {
                endMonthNum -= 12;
                endYearNum++;
            }
            
            endings.push({
                desc: e.description,
                endMonth: `${endMonthNum.toString().padStart(2, '0')}/${endYearNum}`,
                remainingMonths: remaining
            });
        }
    });

    return endings.sort((a, b) => a.remainingMonths - b.remainingMonths);
  }, [monthData, currentMonth, currentYear]);

  // Investment / Goal Logic
  const investmentAdvice = useMemo(() => {
    const threshold = 1500;
    const goodMonths = projections.filter(p => p.surplus >= threshold);
    const firstGoodMonth = goodMonths.length > 0 ? goodMonths[0] : null;
    
    const minDebts = Math.min(...projections.map(p => p.activeDebts));
    const debtFreeMonth = projections.find(p => p.activeDebts === minDebts);

    return {
        canInvestSoon: !!firstGoodMonth,
        investmentStart: firstGoodMonth?.name,
        canPlanMajorPurchase: !!debtFreeMonth && debtFreeMonth.activeDebts <= 2,
        purchaseStart: debtFreeMonth?.name
    };
  }, [projections]);

  // Simulação Caneta Emagrecedora
  const canetaSim = useMemo(() => {
    const valorCaneta = 999; // Valor máximo estimado entre 849 e 999
    const custoMensalAmortizado = valorCaneta / 2.5; // Duração: ~10 semanas = 2.5 meses 
    
    // Calcula a sobra média projetada dos próximos 12 meses
    const avgSurplus = projections.reduce((s, p) => s + p.surplus, 0) / projections.length;
    const amortizadoPossivel = avgSurplus >= custoMensalAmortizado;

    // Próximo mês é projections[1], se não existir (o que é raro devido ao loop de 12), usamos [0]
    const nextMonth = projections.length > 1 ? projections[1] : projections[0];
    const aVistaPossivel = nextMonth ? nextMonth.surplus >= valorCaneta : false;
    
    // 3 vezes -> próximos 3 meses: index 1, 2, 3
    const parcela = valorCaneta / 3;
    const parcelasStatus = [1, 2, 3].map(i => {
        const p = projections[i] || projections[0];
        return { 
            mes: p.name, 
            surplus: p.surplus, 
            possivel: p.surplus >= parcela 
        };
    });
    const parceladoPossivel = parcelasStatus.every(s => s.possivel);
    
    return {
        valor: valorCaneta,
        custoMensalAmortizado,
        avgSurplus,
        amortizadoPossivel,
        parcela,
        aVistaPossivel,
        nextMonth,
        parceladoPossivel,
        parcelasStatus
    };
  }, [projections]);

  return (
    <div className="flex flex-col gap-4 lg:gap-8 pb-12">
      {/* DEBT SETTLEMENT PLANNER (NEW) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] lg:rounded-[2.5rem] p-5 lg:p-10 text-white shadow-2xl relative overflow-hidden group mb-4">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
              <Flame size={120} className="text-orange-500" />
          </div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
              <div className="flex flex-col gap-6 lg:gap-8">
                  <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl border border-orange-500/20">
                          <Flame size={24} strokeWidth={3} />
                      </div>
                      <div>
                          <h2 className="text-xl lg:text-2xl font-black tracking-tight">Plano de Quitação à Vista</h2>
                          <p className="text-xs lg:text-sm font-bold text-slate-400">Objetivo: Encerrar dívidas sem juros</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-4 lg:p-6 border border-white/10 flex flex-col gap-1">
                          <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400">Total Necessário</span>
                          <span className="text-lg lg:text-3xl font-black text-white">{formatCurrency(settlementProgress.needed)}</span>
                      </div>
                      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-4 lg:p-6 border border-white/10 flex flex-col gap-1">
                          <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400">Sugestão de "Caixa"</span>
                          <span className="text-lg lg:text-3xl font-black text-orange-400">~{formatCurrency(settlementProgress.monthlySaving)}</span>
                          <span className="text-[8px] lg:text-[10px] font-black text-slate-500 uppercase">Por mês (30% da sobra)</span>
                      </div>
                  </div>

                  <div className="flex flex-col gap-4">
                      <h3 className="text-xs lg:text-sm font-black uppercase tracking-widest text-slate-400">Acordos Pendentes</h3>
                      <div className="flex flex-col gap-2">
                        {settlements.map((s, idx) => (
                           <div key={idx} className="flex items-center justify-between p-3 lg:p-4 bg-white/5 rounded-2xl border border-white/10 group/item hover:bg-white/10 transition-all">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${s.isPaid ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
                                <span className={`text-sm lg:text-base font-black ${s.isPaid ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{s.description}</span>
                              </div>
                              <span className="text-sm lg:text-lg font-black text-orange-400">{formatCurrency(s.amount)}</span>
                           </div>
                        ))}
                      </div>
                  </div>
              </div>

              <div className="flex flex-col justify-center gap-6 lg:gap-10">
                  <div className="bg-orange-500/10 rounded-[2rem] p-6 lg:p-10 border border-orange-500/20 flex flex-col items-center text-center gap-4 lg:gap-6 relative overflow-hidden">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5 pointer-events-none">
                         <Target size={200} />
                      </div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs lg:text-sm font-black text-orange-400 uppercase tracking-[0.2em]">Estimativa de Quitação</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl lg:text-7xl font-black text-white tracking-tighter">
                                {settlementProgress.monthsToFinish === Infinity ? '?' : settlementProgress.monthsToFinish}
                            </span>
                            <span className="text-xl lg:text-3xl font-black text-slate-500 uppercase">meses</span>
                        </div>
                      </div>

                      <p className="text-sm lg:text-lg font-medium text-slate-300 leading-relaxed max-w-xs">
                          {settlementProgress.monthsToFinish === Infinity 
                            ? "Ajuste o orçamento para gerar sobra real para o caixa."
                            : `Reservando ${formatCurrency(settlementProgress.monthlySaving)} por mês, você quita tudo em ${settlementProgress.monthsToFinish} meses.`
                          }
                      </p>

                      <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden mt-4">
                         <div className="h-full bg-orange-500 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all duration-1000" style={{ width: '15%' }}></div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Overview Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        <div className="bg-white rounded-3xl lg:rounded-[2rem] p-4 lg:p-6 border border-slate-100 shadow-lg shadow-slate-200/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={48} className="lg:w-16 lg:h-16" />
          </div>
          <div className="flex flex-col gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <h3 className="text-[10px] lg:text-sm font-black text-slate-400 uppercase tracking-widest">Saldo Livre Médio (12m)</h3>
              <p className="text-xl lg:text-3xl font-black text-slate-800 tracking-tighter">
                {formatCurrency(projections.reduce((a, b) => a + b.surplus, 0) / projections.length)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl lg:rounded-[2rem] p-4 lg:p-6 border border-slate-100 shadow-lg shadow-slate-200/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <AlertCircle size={48} className="lg:w-16 lg:h-16" />
          </div>
          <div className="flex flex-col gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <h3 className="text-[10px] lg:text-sm font-black text-slate-400 uppercase tracking-widest">Dívidas Terminando</h3>
              <p className="text-xl lg:text-3xl font-black text-slate-800 tracking-tighter">
                {debtEndings.filter(d => d.remainingMonths <= 3).length}
              </p>
              <span className="text-[9px] lg:text-xs font-black text-slate-400">nos próximos 3 meses</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl lg:rounded-[2rem] p-4 lg:p-6 border border-slate-100 shadow-lg shadow-slate-200/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={48} className="lg:w-16 lg:h-16" />
          </div>
          <div className="flex flex-col gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PiggyBank size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <h3 className="text-[10px] lg:text-sm font-black text-slate-400 uppercase tracking-widest">Saldo Livre (Soma 12m)</h3>
              <p className="text-xl lg:text-3xl font-black text-emerald-600 tracking-tighter">
                {formatCurrency(projections.filter(p => p.surplus > 0).reduce((a, b) => a + b.surplus, 0))}
              </p>
              <span className="text-[9px] lg:text-xs font-black text-slate-400">acumulado em 12 meses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Projections Chart */}
      <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] p-5 lg:p-8 border border-slate-100 shadow-2xl shadow-slate-200/40">
        <div className="flex items-center justify-between mb-4 lg:mb-8">
            <div className="flex items-center gap-2 lg:gap-3">
                <div className="p-2 lg:p-3 bg-teal-50 text-teal-600 rounded-xl lg:rounded-2xl shadow-sm">
                    <TrendingUp size={18} className="lg:w-6 lg:h-6" strokeWidth={3} />
                </div>
                <div>
                    <h2 className="text-base lg:text-xl font-black text-slate-800 tracking-tight">Fôlego Financeiro</h2>
                    <p className="text-[10px] lg:text-sm font-black text-slate-400">Projeção da sobra mensal (12 meses)</p>
                </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Sobra Real</span>
                </div>
            </div>
        </div>
        
        <div className="h-[250px] lg:h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projections} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSurplus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                tickFormatter={(val) => `R$ ${val}`}
              />
              <Tooltip 
                contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    fontWeight: 900,
                    padding: '16px'
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-50 flex flex-col gap-2">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{data.name}</p>
                        <p className="text-lg font-black text-slate-800">Sobra: {formatCurrency(data.surplus)}</p>
                        <div className="h-px bg-slate-100 my-1" />
                        <p className="text-[10px] font-black text-rose-500 uppercase">📉 Dívidas Ativas: {data.activeDebts}</p>
                        <p className="text-[10px] font-black text-emerald-500 uppercase">💰 Inv. Sugerido ({data.investPercent}): {formatCurrency(data.recommendedInvest)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="surplus" 
                stroke="#14b8a6" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorSurplus)" 
                animationDuration={1500}
              >
                <LabelList 
                  dataKey="surplus" 
                  position="top" 
                  offset={15}
                  formatter={(val: number) => val > 0 ? `R$ ${Math.round(val)}` : ''}
                  style={{ fontSize: '10px', fontWeight: '900', fill: '#0f172a' }}
                />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Caneta Emagrecedora Simulator */}
        <div className="bg-gradient-to-tr from-fuchsia-100 to-indigo-50 border border-fuchsia-200 lg:col-span-2 rounded-[2.5rem] p-6 lg:p-10 shadow-xl overflow-hidden relative group">
            <div className="absolute top-[-20%] right-[-5%] w-64 h-64 bg-fuchsia-500/10 blur-[80px] rounded-full"></div>
            
            <div className="relative z-10 flex flex-col gap-6 lg:gap-8">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-fuchsia-500 text-white rounded-2xl shadow-lg shadow-fuchsia-500/30">
                            <ShoppingCart size={24} strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">Simulador: Caneta Emagrecedora</h2>
                            <p className="text-xs lg:text-sm font-black text-fuchsia-600">Considerando R$ {canetaSim.valor.toFixed(2)} a cada 10 semanas (2.5 meses)</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div className={`p-5 rounded-3xl border-2 transition-all ${canetaSim.aVistaPossivel ? 'bg-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/50 border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Comprar à Vista (Próximo Mês)</h3>
                                <p className="text-xs font-bold text-slate-500">
                                    Sobra projetada em {canetaSim.nextMonth.name}: <span className={canetaSim.aVistaPossivel ? "text-emerald-600" : "text-rose-500"}>{formatCurrency(canetaSim.nextMonth.surplus)}</span>
                                </p>
                            </div>
                            {canetaSim.aVistaPossivel ? <CheckCircle2 className="text-emerald-500" size={24} /> : <AlertCircle className="text-slate-400" size={24} />}
                        </div>
                        {canetaSim.aVistaPossivel ? (
                            <p className="text-xs font-black text-emerald-600 bg-emerald-50 p-3 rounded-xl">Sim! A sobra do próximo mês cobrirá com tranquilidade a primeira unidade à vista.</p>
                        ) : (
                            <p className="text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl">Inviável neste cenário. A sobra do próximo mês (Saldo Livre) não será suficiente para cobrir todo o valor de uma vez.</p>
                        )}
                    </div>

                    <div className={`p-5 rounded-3xl border-2 transition-all ${canetaSim.parceladoPossivel ? 'bg-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/50 border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Parcelar em 3x de {formatCurrency(canetaSim.parcela)}</h3>
                                <p className="text-xs font-bold text-slate-500">Comprometimento pros próximos 3 meses</p>
                            </div>
                            {canetaSim.parceladoPossivel ? <CheckCircle2 className="text-emerald-500" size={24} /> : <AlertCircle className="text-slate-400" size={24} />}
                        </div>
                        <div className="flex gap-2">
                            {canetaSim.parcelasStatus.map((p, i) => (
                                <div key={i} className={`flex-1 text-center p-2 rounded-xl ${p.possivel ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                    <span className="block text-[10px] font-black text-slate-500">{p.mes}</span>
                                    <span className={`text-[10px] font-black ${p.possivel ? 'text-emerald-600' : 'text-rose-600'}`}>{p.possivel ? 'OK' : 'Falta Caixa'}</span>
                                </div>
                            ))}
                        </div>
                        {canetaSim.parceladoPossivel ? (
                            <p className="text-xs font-black text-emerald-600 mt-3">Sim! Você tem sobra mensal projetada para assumir as parcelas. Lembre-se: comprando parcelado continuamente, os parcelamentos posteriores poderão se sobrepor às parcelas remanescentes da primeira.</p>
                        ) : (
                            <p className="text-xs font-bold text-rose-500 mt-3">Atenção: Algum dos próximos 3 meses não possui sobra suficiente. Reprograme para não virar dívida ruim.</p>
                        )}
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 bg-white/40 p-5 rounded-3xl border border-fuchsia-200/50">
                       <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2"><Info size={16} className="text-fuchsia-600"/> Sustentabilidade do Tratamento a Longo Prazo</h3>
                       <p className="text-xs lg:text-sm font-medium text-slate-600 mt-2">
                           Considerando o uso contínuo (uma caneta nova a cada 10 semanas), seu custo mensal amortizado será de <span className="font-bold text-slate-900 border-b border-fuchsia-300">{formatCurrency(canetaSim.custoMensalAmortizado)}</span>/mês.
                           Seu <strong>Saldo Livre Médio</strong> dos próximos 12 meses é <span className="font-bold text-slate-900">{formatCurrency(canetaSim.avgSurplus)}</span>.
                       </p>
                       <p className={`text-xs font-black p-3 rounded-xl mt-3 flex items-center gap-2 ${canetaSim.amortizadoPossivel ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                         {canetaSim.amortizadoPossivel 
                         ? <><CheckCircle2 size={16}/> O tratamento é plenamente viável a longo prazo dentro do seu Saldo Livre Médio atual.</>
                         : <><AlertCircle size={16}/> O custo contínuo comprometeria seu Saldo Livre Médio. Você precisará cortar outras despesas correntes mensais.</>}
                       </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Debt Liberation Schedule */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl lg:rounded-[2.5rem] p-5 lg:p-8 border border-white shadow-xl">
            <div className="flex items-center gap-2 lg:gap-3 mb-6 lg:mb-8">
                <div className="p-2 lg:p-3 bg-rose-50 text-rose-600 rounded-xl lg:rounded-2xl shadow-sm">
                    <CheckCircle2 size={18} className="lg:w-6 lg:h-6" strokeWidth={3} />
                </div>
                <div>
                    <h2 className="text-base lg:text-xl font-black text-slate-800 tracking-tight">Calendário de Liberação</h2>
                    <p className="text-[10px] lg:text-sm font-black text-slate-400">Fim de dívidas parceladas</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 lg:gap-4">
                {debtEndings.length > 0 ? (
                    debtEndings.map((d, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-3 lg:p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center gap-3 lg:gap-4">
                                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl ${d.remainingMonths === 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'} flex items-center justify-center shrink-0`}>
                                    {d.remainingMonths === 0 ? <CheckCircle2 size={20} className="lg:w-6 lg:h-6" /> : <div className="text-sm lg:text-lg font-black">{d.remainingMonths}</div>}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-[8px] lg:text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                                        {d.remainingMonths === 0 ? 'FIM NESTE MÊS' : `FALTAM ${d.remainingMonths} PARC.`}
                                    </span>
                                    <span className="text-xs lg:text-base font-black text-slate-800 truncate max-w-[100px] sm:max-w-xs">{d.desc}</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="block text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">FINAL</span>
                                <span className="px-2 py-0.5 lg:px-3 lg:py-1 bg-slate-900 text-white rounded-md lg:rounded-lg text-[9px] lg:text-xs font-black">{d.endMonth}</span>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-300 gap-4">
                        <CheckCircle2 size={48} strokeWidth={1} />
                        <span className="font-black text-center">Nenhuma dívida parcelada ativa no sistema. Parabéns!</span>
                    </div>
                )}
            </div>
        </div>

        {/* Future Goals & Tips */}
        <div className="flex flex-col gap-4 lg:gap-6">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl lg:rounded-[2.5rem] p-5 lg:p-8 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 blur-[80px] rounded-full"></div>
                <div className="relative z-10 flex flex-col gap-4 lg:gap-6">
                    <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-2 lg:p-3 bg-white/20 backdrop-blur-md rounded-xl lg:rounded-2xl border border-white/20">
                            <Target size={18} className="lg:w-6 lg:h-6" strokeWidth={3} />
                        </div>
                        <h2 className="text-base lg:text-xl font-black tracking-tight">Oportunidades</h2>
                    </div>
                    
                    {investmentAdvice.canInvestSoon ? (
                        <div className="flex flex-col gap-3 lg:gap-4">
                            <p className="text-sm lg:text-base font-medium opacity-90">
                                Projeção positiva a partir de <span className="font-black underline">{investmentAdvice.investmentStart}</span> (excessos {'>'} R$ 1.500).
                            </p>
                            <div className="p-3 lg:p-5 bg-white/10 backdrop-blur-md rounded-xl lg:rounded-2xl border border-white/20">
                                <div className="flex items-center gap-2 mb-1 lg:mb-2">
                                    <PiggyBank size={16} className="text-emerald-200 lg:w-5 lg:h-5" />
                                    <span className="text-[10px] lg:text-sm font-black uppercase tracking-widest">DICA</span>
                                </div>
                                <p className="text-[11px] lg:text-sm font-bold opacity-80 leading-snug">
                                    Considere iniciar uma reserva de emergência neste período antes de novas compras.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm lg:text-base font-medium opacity-90">
                            Foque em quitar as parcelas atuais primeiro.
                        </p>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-3xl lg:rounded-[2.5rem] p-5 lg:p-8 border border-slate-100 shadow-xl flex flex-col gap-6 lg:gap-8">
                <div className="flex items-center gap-2 lg:gap-3">
                    <div className="p-2 lg:p-3 bg-slate-900 text-white rounded-xl lg:rounded-2xl shadow-lg shadow-slate-900/20">
                        <Target size={18} className="lg:w-6 lg:h-6" strokeWidth={3} />
                    </div>
                    <h2 className="text-base lg:text-xl font-black text-slate-800 tracking-tight">Momento de Aquisições</h2>
                </div>

                <div className="flex flex-col gap-5 lg:gap-6">
                    <div className="flex items-start gap-3 lg:gap-4">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0 ${investmentAdvice.canPlanMajorPurchase ? 'bg-amber-100 text-amber-600 shadow-inner' : 'bg-slate-50 text-slate-300'}`}>
                            <Bike size={20} className="lg:w-6 lg:h-6" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm lg:text-base font-black text-slate-800">C. de Moto</span>
                            <p className="text-[10px] lg:text-sm font-medium text-slate-400 leading-tight">
                                {investmentAdvice.canPlanMajorPurchase 
                                    ? `Viável em ${investmentAdvice.purchaseStart}.` 
                                    : "Aguardar quitação de Lili/REBECCA."}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 lg:gap-4">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0 ${investmentAdvice.purchaseStart ? 'bg-blue-100 text-blue-600 shadow-inner' : 'bg-slate-50 text-slate-300'}`}>
                            <Plane size={20} className="lg:w-6 lg:h-6" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm lg:text-base font-black text-slate-800">Viagem</span>
                            <p className="text-[10px] lg:text-sm font-medium text-slate-400 leading-tight">
                                Programar para {investmentAdvice.purchaseStart}. Foco em economizar!
                            </p>
                        </div>
                    </div>
                </div>

                <button className="w-full py-3 lg:py-4 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[9px] lg:text-xs transition-all border border-slate-100 flex items-center justify-center gap-1.5 lg:gap-2">
                    Plano Médio Prazo <ArrowRight size={14} className="lg:w-4 lg:h-4" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
