import { Transaction, MonthData } from '../types';

export const getInstallmentInfo = (startYear: number, startMonth: number, total: number, curYear: number, curMonth: number) => {
    const startIdx = (startYear * 12) + (startMonth - 1);
    const curIdx = (curYear * 12) + (curMonth - 1);
    const diff = curIdx - startIdx;
    
    if (diff >= 0 && diff < total) {
        return { current: diff + 1, total };
    }
    return null;
};

export const getDefaultData = (year: number, month: number): MonthData => {
    const data: MonthData = {
        income: [],
        expenses: [],
        avulsosItems: []
    };

    // 1. FIXED INCOME
    data.income.push({
        id: `salario_andre_${year}_${month}`,
        description: "SALÁRIO ANDRÉ",
        amount: 3200,
        category: "Salário",
        paid: true,
        dueDate: `${year}-${String(month).padStart(2, '0')}-05`,
        type: 'income'
    });

    // 2. FIXED EXPENSES
    const fixedExpenses = [
        { desc: "ALUGUEL", amount: 1350, cat: "Moradia", day: 1 },
        { desc: "INTERNET DA CASA", amount: 100, cat: "Moradia", day: 18 },
        { desc: "PSICÓLOGA DA MARCELLA", amount: 300, cat: "Saúde", day: 10 },
        { desc: "CARTÃO DO ITAÚ DA MARCELLA", amount: 0, cat: "Moradia", day: 24 },
        { desc: "CARTÃO DO ITAÚ DO ANDRÉ", amount: 0, cat: "Moradia", day: 24 },
        { desc: "CARTÃO DA CAIXA DA MARCELLA", amount: 0, cat: "Moradia", day: 14 },
    ];

    fixedExpenses.forEach(e => {
        data.expenses.push({
            id: `fixed_${e.desc.toLowerCase()}_${year}_${month}`,
            description: e.desc,
            amount: e.amount,
            category: e.cat,
            paid: false,
            dueDate: `${year}-${String(month).padStart(2, '0')}-${String(e.day).padStart(2, '0')}`
        });
    });

    // 3. INSTALLMENT EXPENSES
    const finiteConfig = [
        { desc: "GUARDA ROUPAS", totalAmount: 914.48, cat: "Moradia", day: 12, installments: 5, sY: 2026, sM: 2, group: 'MARCIA BRITO' },
        { desc: "REFORMA DO SOFÁ", totalAmount: 850, cat: "Moradia", day: 15, installments: 4, sY: 2026, sM: 3 },
        { desc: "IPVA MOTO", totalAmount: 480, cat: "Transporte", day: 20, installments: 3, sY: 2026, sM: 2 },
        { desc: "CURSO ESPECIALIZAÇÃO", totalAmount: 1200, cat: "Educação", day: 5, installments: 6, sY: 2026, sM: 1 },
        { desc: "EMPRÉSTIMO COM MARCIA BISPO", totalAmount: 1100, cat: "Dívidas", day: 15, installments: 4, sY: 2026, sM: 6, group: 'MARCIA BISPO' },
        { desc: "REMÉDIOS (MARCIA BRITO)", totalAmount: 246.09, cat: "Saúde", day: 28, installments: 3, sY: 2026, sM: 5, group: 'MARCIA BRITO' }
    ];

    finiteConfig.forEach(f => {
        const inst = getInstallmentInfo(f.sY, f.sM, f.installments, year, month);
        if (inst) {
            data.expenses.push({
                id: `finite_${f.desc.toLowerCase()}_${year}_${month}`,
                description: `${f.desc} (${inst.current}/${inst.total})`,
                amount: f.totalAmount / f.installments,
                category: f.cat,
                paid: false,
                dueDate: `${year}-${String(month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`,
                installments: inst,
                group: f.group
            });
        }
    });

    // 4. CUSTOM LOGIC FOR SPECIFIC MONTHS
    
    // 4.1 Carrefour Andre logic
    if (year === 2026 && month === 5) {
        data.expenses.push({
            id: `carrefour_andre_last`,
            description: "CARREFOUR ANDRÉ (PARCELA FINAL)",
            amount: 275.00,
            category: "Dívidas",
            paid: false,
            dueDate: "2026-05-15"
        });
    }

    // 4.2 Marcia Bispo correction for May 2026 (Parcel 0/4)
    if (year === 2026 && month === 5) {
        const descBispo = "EMPRÉSTIMO COM MARCIA BISPO";
        // Remove the one added by installments if it was added for May mistakenly
        data.expenses = data.expenses.filter(e => !e.description.includes(descBispo));
        
        data.expenses.push({
            id: `manual_marcia_bispo_may`,
            description: descBispo,
            amount: 0,
            category: "Dívidas",
            group: "MARCIA BISPO",
            paid: false,
            dueDate: "2026-05-15",
            installments: { current: 0, total: 4 }
        });
    }

    // 5. AVULSOS LOGIC
    if (year === 2026 && month === 4) {
        data.avulsosItems.push(
            { id: `avulso_apr_iago`, description: 'Compras (IAGO)', amount: 782, paid: true, category: 'Alimentação', dueDate: '2026-04-07', group: 'IAGO' },
            { id: `avulso_apr_proprio`, description: 'Compras (Dinheiro Próprio)', amount: 242, paid: true, category: 'Alimentação', dueDate: '2026-04-01', group: 'COMPRAS ABRIL' }
        );
    }
    
    if (year === 2026 && month === 5) {
        data.avulsosItems.push(
            { id: `avulso_may_iago`, description: 'Compras', amount: 1300, paid: false, category: 'Alimentação', dueDate: '2026-05-07', group: 'IAGO' },
            // Requested explicit dates for 29 and 30 April shown in May
            { id: `avulso_combustivel_may`, description: "COMBUSTÍVEL (30/04)", amount: 50.00, category: "Transporte", paid: true, dueDate: "2026-04-30", date: "2026-04-30" },
            { id: `avulso_mercado_may`, description: "MERCADO (29/04)", amount: 187.28, category: "Alimentação", paid: true, dueDate: "2026-04-29", date: "2026-04-29" },
            { id: `avulso_agua_may`, description: "COMPRA DA ÁGUA (29/04)", amount: 10.00, category: "Alimentação", paid: true, dueDate: "2026-04-29", date: "2026-04-29" }
        );
    }

    return data;
};
