import React from 'react';
import { X, Cloud, CloudOff, RefreshCw, Home, List, Smartphone } from 'lucide-react';
import { BankAccount } from '../types';
import { formatCurrency } from '../utils/financeUtils';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: BankAccount[];
    syncStatus: 'online' | 'offline' | 'syncing';
    onSync: () => void;
    currentView: 'home' | 'transactions' | 'statistics' | 'settlements';
    onNavigate: (view: 'home' | 'transactions' | 'statistics' | 'settlements') => void;
    onInstall: () => void;
    canInstall: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, accounts, syncStatus, onSync, currentView, onNavigate, onInstall, canInstall }) => {
    const format = (v: number) => formatCurrency(v);
    const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

    const handleNav = (view: 'home' | 'transactions' | 'statistics' | 'settlements') => {
        onNavigate(view);
        onClose();
    };

    const getNavClass = (view: string) => {
        const isActive = currentView === view;
        return `flex items-center gap-3 w-full p-3 rounded-2xl transition-all font-black text-sm ${
            isActive 
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`;
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity duration-500 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={onClose}
            ></div>
            <div className={`fixed top-0 left-0 w-[85%] max-w-xs h-full bg-white z-[51] shadow-2xl transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-dashed border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Finanças<span className="text-teal-600">.AI</span></h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-8">
                    {/* Navigation Section */}
                    <section>
                         <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Menu Principal</h3>
                         <div className="flex flex-col gap-2">
                            <button onClick={() => handleNav('home')} className={getNavClass('home')}>
                                <Home size={22} strokeWidth={3} /> Visão Geral
                            </button>
                            <button onClick={() => handleNav('transactions')} className={getNavClass('transactions')}>
                                <List size={22} strokeWidth={3} /> Extrato Detalhado
                            </button>
                            <button onClick={() => handleNav('settlements')} className={getNavClass('settlements')}>
                                <RefreshCw size={22} strokeWidth={3} /> Quitações
                            </button>
                            <button onClick={() => handleNav('statistics')} className={getNavClass('statistics')}>
                                <RefreshCw size={22} strokeWidth={3} /> Estatísticas
                            </button>
                            {canInstall && (
                               <button 
                                   onClick={() => { onInstall(); onClose(); }} 
                                   className="flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all font-black text-sm bg-teal-600 text-white shadow-lg shadow-teal-900/20 mt-4 animate-pulse"
                               >
                                    <Smartphone size={22} strokeWidth={3} /> Instalar Aplicativo
                               </button>
                            )}

                         </div>
                    </section>

                    <section>
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-3xl border border-emerald-100 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-base font-black text-emerald-900">
                                {syncStatus === 'online' ? <Cloud size={18} strokeWidth={3} className="text-emerald-600"/> : <CloudOff size={18} strokeWidth={3} className="text-slate-400"/>}
                                <span>Status: <span className={syncStatus === 'online' ? 'text-emerald-600' : 'text-slate-500'}>
                                    {syncStatus === 'online' ? 'Conectado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}
                                </span></span>
                            </div>
                            <button 
                                onClick={onSync}
                                className="w-full py-3.5 flex items-center justify-center gap-2 text-base font-black text-emerald-600 bg-white rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all"
                            >
                                <RefreshCw size={16} strokeWidth={4} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                                Sincronizar Agora
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
};

export default Sidebar;