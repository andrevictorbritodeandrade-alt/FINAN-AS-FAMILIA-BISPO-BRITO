import { GoogleGenAI } from "@google/genai";
import { FinancialProjection } from '../types';
import { MonthData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
Você é um consultor financeiro pessoal sênior, especialista em finanças domésticas.
Seu objetivo é analisar os dados financeiros fornecidos e responder às dúvidas do usuário com precisão matemática e conselhos práticos.

Regras Específicas para Viagem de Férias 2027 (Cálculo Flexível):
1. O usuário quer viajar em Janeiro de 2027.
2. NÃO sugira um valor fixo mensal se a margem do usuário variar.
3. Analise a 'margin' (sobra) de CADA mês listado na "PROJEÇÃO DE FLUXO DE CAIXA".
4. Para cada mês futuro, sugira um aporte específico baseado no que sobra naquele mês.
   - Exemplo: "Em Fevereiro sobra R$ 2.000, guarde R$ 1.000. Em Março sobra R$ 500, guarde R$ 100."
5. Lembre-se que ele precisa de dinheiro para passar o mês (Mumbuca/Alimentação), então nunca sugira guardar 100% da margem. Deixe uma gordura.
6. Some os valores sugeridos mês a mês e projete o total acumulado até Jan/2027.
7. Considere que em Jan/2027 ele terá parte do salário de Dez/2026.

Regras Gerais:
1. Analise a 'margin' (Margem Livre) de cada mês projetado.
2. Se a margem for negativa em algum mês, alerte e sugira não guardar nada naquele mês específico.
3. Seja direto, use listas e negrito para valores importantes.
4. Responda em formato de plano de ação mês a mês.
`;

export const getFinancialAdvice = async (currentMonthData: MonthData, projections: FinancialProjection[], userMessage: string): Promise<string> => {
    try {
        const prompt = `
            DADOS FINANCEIROS DO USUÁRIO:
            
            MÊS ATUAL:
            Entradas Totais (Salário Líquido): ${currentMonthData.incomes.filter(i => ['Salário', 'Doação', 'Renda Extra'].includes(i.category)).reduce((s,i) => s + i.amount, 0)}
            Despesas Totais: ${currentMonthData.expenses.reduce((s,i) => s + i.amount, 0)}
            
            PROJEÇÃO DE FLUXO DE CAIXA (PRÓXIMOS MESES COM VALORES VARIÁVEIS):
            ${JSON.stringify(projections)}

            PERGUNTA DO USUÁRIO:
            "${userMessage}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
            }
        });

        return response.text || "Desculpe, não consegui analisar os dados no momento.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Ocorreu um erro ao consultar a IA. Tente novamente mais tarde.";
    }
};