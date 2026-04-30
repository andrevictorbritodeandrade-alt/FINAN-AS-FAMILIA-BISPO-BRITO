import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User } from 'lucide-react';
import { getFinancialAdvice } from '../services/geminiService';
import { MonthData, FinancialProjection } from '../types';

interface AiChatProps {
    isOpen: boolean;
    onClose: () => void;
    currentMonthData: MonthData;
    projections: FinancialProjection[];
    initialMessage?: string;
}

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
}

const AiChat: React.FC<AiChatProps> = ({ isOpen, onClose, currentMonthData, projections, initialMessage }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 'welcome', role: 'ai', content: 'Olá! Analisei suas finanças. **Posso calcular se aquela viagem cabe no bolso.** O que deseja saber?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasTriggeredInitial = useRef(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen && initialMessage && !hasTriggeredInitial.current) {
            hasTriggeredInitial.current = true;
            triggerMessage(initialMessage);
        }
        if (!isOpen) {
            hasTriggeredInitial.current = false; // Reset for next open
        }
    }, [isOpen, initialMessage]);

    const triggerMessage = async (text: string) => {
        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        const responseText = await getFinancialAdvice(currentMonthData, projections, text);
        
        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: responseText };
        setMessages(prev => [...prev, aiMsg]);
        setLoading(false);
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;
        
        const text = input;
        setInput('');
        await triggerMessage(text);
    };

    return (
        <div className={`fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
            <div 
                className={`bg-white w-full max-w-lg sm:rounded-2xl h-[85vh] sm:h-[650px] flex flex-col shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full sm:translate-y-10'}`}
            >
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600">
                            <Bot size={24} strokeWidth={2.5} />
                        </div>
                        <h2 className="font-black text-xl text-gray-900">IA Financeira</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <X size={24} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-base font-medium leading-relaxed ${
                                msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-white text-gray-800 border border-gray-200'
                            }`}>
                                <div dangerouslySetInnerHTML={{ 
                                    __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') 
                                }} />
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                             <div className="bg-white text-gray-500 border border-gray-200 rounded-2xl p-4 shadow-sm text-sm flex gap-2 items-center">
                                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                             </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white flex gap-3">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pergunte sobre suas finanças..."
                        className="flex-1 bg-gray-100 border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-teal-500 outline-none text-base font-medium text-gray-800"
                    />
                    <button 
                        type="submit" 
                        disabled={loading || !input.trim()}
                        className="p-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={24} strokeWidth={2.5} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AiChat;