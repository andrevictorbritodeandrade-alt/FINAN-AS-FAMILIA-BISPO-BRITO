import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Flame, CheckCircle2, ShieldAlert, Plus, Trash2, ArrowLeft, PiggyBank, HandCoins } from 'lucide-react';
import { MonthData, DebtSettlement } from '../types';
import { formatCurrency } from '../utils/financeUtils';

interface SettlementsProps {
  monthData: MonthData;
  onUpdateSettlements: (settlements: DebtSettlement[]) => void;
  onBack: () => void;
}

const Settlements: React.FC<SettlementsProps> = ({ monthData, onUpdateSettlements, onBack }) => {
  const settlements = monthData.debtSettlements || [];
  
  const totalNeeded = settlements.filter(s => !s.isPaid).reduce((sum, s) => sum + s.amount, 0);
  const paidCount = settlements.filter(s => s.isPaid).length;

  const handleTogglePaid = (id: string) => {
    const newSettlements = settlements.map(s => 
      s.id === id ? { ...s, isPaid: !s.isPaid } : s
    );
    onUpdateSettlements(newSettlements);
  };

  const handleAddSettlement = () => {
    const description = prompt('Descrição da dívida (ex: Acordo Nubank):');
    if (!description) return;
    
    const amountStr = prompt('Valor do acordo (R$):');
    const amount = parseFloat(amountStr || '0');
    if (isNaN(amount) || amount <= 0) return;

    const newSettlement: DebtSettlement = {
      id: `set_${Date.now()}`,
      description,
      amount,
      priority: settlements.length + 1,
      isPaid: false
    };
    onUpdateSettlements([...settlements, newSettlement]);
  };

  const handleDeleteSettlement = (id: string) => {
    if (!confirm('Deseja remover esta meta de quitação?')) return;
    onUpdateSettlements(settlements.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-10 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
           <button 
                onClick={onBack}
                className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors w-fit mb-2"
            >
                <ArrowLeft size={14} /> Voltar ao Dashboard
            </button>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20">
                        <Flame size={24} strokeWidth={3} />
                    </div>
                    <div>
                        <h1 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tighter">Gestão de Quitações</h1>
                        <p className="text-sm lg:text-base font-medium text-slate-400">Planeje o fim das dívidas à vista (PIX)</p>
                    </div>
                </div>
                <button 
                    onClick={handleAddSettlement}
                    className="p-3 lg:p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-black text-sm"
                >
                    <Plus size={20} strokeWidth={3} /> <span className="hidden sm:inline">Novo Acordo</span>
                </button>
            </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                   <Target size={64} />
               </div>
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Total Pendente</span>
               <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalNeeded)}</span>
                   <span className="text-sm font-black text-orange-500 uppercase">Faltam {settlements.length - paidCount}</span>
               </div>
          </div>

          <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                   <CheckCircle2 size={64} />
               </div>
               <span className="text-[10px] font-black uppercase text-white/60 tracking-widest mb-1 block">Já Quitadas</span>
               <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-black text-white tracking-tighter">{paidCount}</span>
                   <span className="text-xs font-black text-emerald-200 uppercase tracking-widest">Sendo R$ {formatCurrency(settlements.filter(s => s.isPaid).reduce((acc, s) => acc + s.amount, 0))}</span>
               </div>
          </div>

          <div className="bg-orange-500 rounded-3xl p-6 text-white shadow-xl shadow-orange-900/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                   <HandCoins size={64} />
               </div>
               <span className="text-[10px] font-black uppercase text-white/60 tracking-widest mb-1 block">Status do Caixa</span>
               <span className="text-xl font-black text-white tracking-tight block">Poupar para Quitar</span>
               <span className="text-[10px] font-bold opacity-80 uppercase leading-tight mt-1">Veja a projeção na aba de Estatísticas</span>
          </div>
      </div>

      {/* Settlements List */}
      <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-6 lg:p-8 border border-white shadow-2xl">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 px-2">LISTAGEM DE ACORDOS</h2>
          
          <div className="flex flex-col gap-4">
              <AnimatePresence mode='popLayout'>
                  {settlements.map((s, idx) => (
                      <motion.div 
                          key={s.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`
                            p-4 lg:p-6 rounded-[2rem] border transition-all flex items-center justify-between group
                            ${s.isPaid 
                                ? 'bg-slate-50 border-slate-100 opacity-60' 
                                : 'bg-white border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1'
                            }
                          `}
                      >
                          <div className="flex items-center gap-4 lg:gap-6">
                              <button 
                                onClick={() => handleTogglePaid(s.id)}
                                className={`
                                    w-10 h-10 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center transition-all shrink-0
                                    ${s.isPaid 
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                        : 'bg-white border-2 border-slate-100 text-slate-200 hover:border-emerald-500 hover:text-emerald-500'
                                    }
                                `}
                              >
                                  <CheckCircle2 size={s.isPaid ? 24 : 20} strokeWidth={3} />
                              </button>
                              <div className="flex flex-col">
                                  <span className={`text-sm lg:text-xl font-black tracking-tight ${s.isPaid ? 'text-slate-400' : 'text-slate-800'}`}>
                                      {s.description}
                                  </span>
                                  {s.notes && <p className="text-[10px] lg:text-xs font-bold text-slate-400">{s.notes}</p>}
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className="px-2 py-0.5 bg-orange-50 text-orange-500 rounded-md text-[8px] lg:text-[10px] font-black uppercase tracking-widest">Prioridade {s.priority}</span>
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] lg:text-[10px] font-black uppercase tracking-widest">PIX</span>
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-4 lg:gap-8">
                               <div className="text-right">
                                   <span className="text-[9px] lg:text-xs font-black text-slate-400 uppercase tracking-widest block opacity-50">VALOR JÁ</span>
                                   <span className={`text-lg lg:text-3xl font-black tracking-tighter ${s.isPaid ? 'text-slate-400' : 'text-orange-500'}`}>
                                       {formatCurrency(s.amount)}
                                   </span>
                               </div>
                               <button 
                                  onClick={() => handleDeleteSettlement(s.id)}
                                  className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                               >
                                   <Trash2 size={20} />
                               </button>
                          </div>
                      </motion.div>
                  ))}
              </AnimatePresence>

              {settlements.length === 0 && (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-300 gap-4">
                      <ShieldAlert size={64} strokeWidth={1} />
                      <div className="flex flex-col items-center">
                        <span className="font-black text-lg">Nenhum acordo cadastrado</span>
                        <p className="text-xs font-medium text-slate-400">Adicione suas dívidas para começar o plano de quitação.</p>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Settlements;
