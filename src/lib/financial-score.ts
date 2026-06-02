/**
 * Sistema de Score Financeiro — Quibo
 *
 * Avalia a saúde financeira do usuário com base em entradas, saídas e sobra,
 * retornando um JSON rico com pontuação, cor, nível, dimensões detalhadas
 * e pontos de melhoria acionáveis.
 *
 * Dimensões avaliadas (total 100 pts):
 *   1. Taxa de Poupança         — 30 pts
 *   2. Comprometimento de Renda — 25 pts
 *   3. Liquidez / Sobra Real    — 20 pts
 *   4. Controle de Dívidas      — 15 pts  [opcional]
 *   5. Reserva de Emergência    — 10 pts  [opcional]
 *
 * Quando dados opcionais não são fornecidos, os pontos daquela dimensão são
 * redistribuídos proporcionalmente entre as dimensões disponíveis, garantindo
 * que o score final sempre reflita 0-100 com base nos dados existentes.
 */

// ─── Tipos de entrada ────────────────────────────────────────────────────────

export interface FinancialScoreInput {
  /** Total de entradas no período (receitas recebidas) */
  totalIncome: number;
  /** Total de saídas no período (despesas pagas) */
  totalExpense: number;

  /** Receita fixa mensal (salários, aluguéis recebidos etc.) — opcional */
  fixedIncome?: number;
  /** Custos fixos mensais (contas, aluguel, assinaturas etc.) — opcional */
  fixedExpenses?: number;
  /** Saldo total disponível em contas — opcional */
  totalBalance?: number;
  /** Valor total de dívidas ativas — opcional */
  totalDebt?: number;
  /** Histórico dos últimos meses para análise de tendência — opcional */
  historicalMonths?: Array<{ income: number; expense: number }>;
}

// ─── Tipos de saída ──────────────────────────────────────────────────────────

export type ScoreLevelId =
  | "EXCELLENT"
  | "VERY_GOOD"
  | "GOOD"
  | "REGULAR"
  | "WEAK"
  | "CRITICAL"
  | "EMERGENCY";

export type ScoreTrend = "UP" | "DOWN" | "STABLE" | "UNKNOWN";
export type DataConfidence = "HIGH" | "MEDIUM" | "LOW";
export type DimensionStatus =
  | "GREAT"
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "CRITICAL"
  | "N/A";

export interface ScoreDimension {
  /** Identificador único da dimensão */
  id: string;
  /** Nome legível da dimensão */
  name: string;
  /** Descrição breve do que esta dimensão avalia */
  description: string;
  /** Pontuação obtida nesta dimensão */
  score: number;
  /** Pontuação máxima possível (após redistribuição proporcional) */
  maxScore: number;
  /** Percentual atingido nesta dimensão (0-100) */
  percentage: number;
  /** Status qualitativo desta dimensão */
  status: DimensionStatus;
  /** Valor principal usado no cálculo (ex: "32.5%") */
  displayValue: string;
  /** Detalhe contextual adicional */
  insight: string;
  /** Se esta dimensão usou dados opcionais ou apenas estimativa */
  isEstimated: boolean;
}

export interface ImprovementPoint {
  /** Prioridade: 1 = crítico, 2 = importante, 3 = sugestão */
  priority: 1 | 2 | 3;
  /** Categoria da melhoria */
  category: "SAVINGS" | "EXPENSES" | "DEBT" | "RESERVE" | "INCOME" | "HABIT";
  /** Título curto e direto */
  title: string;
  /** Descrição detalhada com contexto financeiro real */
  description: string;
  /** Impacto estimado no score caso aplicado (+X pts) */
  estimatedScoreImpact: number;
  /** Ação concreta e imediata que o usuário pode tomar */
  action: string;
}

export interface ScoreMetrics {
  /** Percentual de poupança: (income - expense) / income × 100 */
  savingsRate: number;
  /** Percentual de comprometimento: expense / income × 100 */
  expenseRatio: number;
  /** Sobra absoluta: income - expense */
  surplus: number;
  /** Relação dívida/renda anual (se dados disponíveis) */
  debtToIncomeRatio: number | null;
  /** Meses de reserva disponíveis (saldo / custo fixo mensal) */
  emergencyMonths: number | null;
  /** Tendência vs. histórico */
  trend: ScoreTrend;
  /** Variação percentual da sobra vs. média histórica */
  trendDelta: number | null;
}

export interface FinancialScore {
  /** Pontuação final: 0 a 100 */
  score: number;
  /** Nível qualitativo */
  level: ScoreLevelId;
  /** Rótulo em português */
  label: string;
  /**
   * Cor hex no modelo "heat" — do vermelho (crítico) ao verde (excelente).
   * Ideal para uso em badges, indicadores e gráficos.
   */
  heatColor: string;
  /** Emoji representativo do nível */
  emoji: string;
  /** Frase de impacto resumindo a situação financeira */
  headline: string;
  /** Parágrafo explicativo com 2-3 frases de contexto */
  summary: string;
  /** Detalhamento por cada dimensão avaliada */
  dimensions: ScoreDimension[];
  /** Lista de melhorias priorizadas e acionáveis */
  improvementPoints: ImprovementPoint[];
  /** Métricas brutas usadas no cálculo */
  metrics: ScoreMetrics;
  /** Metadados sobre a qualidade e confiabilidade do cálculo */
  metadata: {
    calculatedAt: string;
    hasDebtData: boolean;
    hasBalanceData: boolean;
    hasHistoricalData: boolean;
    hasFixedData: boolean;
    confidence: DataConfidence;
    /** Dimensões efetivamente usadas no cálculo */
    activeDimensions: number;
    totalDimensions: number;
  };
}

// ─── Configuração das dimensões ───────────────────────────────────────────────

interface DimensionConfig {
  id: string;
  name: string;
  description: string;
  baseMaxScore: number;
  requiresOptionalData: boolean;
}

const DIMENSIONS: DimensionConfig[] = [
  {
    id: "savings_rate",
    name: "Taxa de Poupança",
    description: "Percentual da renda que sobra após todas as despesas",
    baseMaxScore: 30,
    requiresOptionalData: false,
  },
  {
    id: "expense_commitment",
    name: "Comprometimento de Renda",
    description: "Quanto da sua renda está sendo consumida por gastos",
    baseMaxScore: 25,
    requiresOptionalData: false,
  },
  {
    id: "liquidity",
    name: "Liquidez e Sobra Real",
    description: "Folga financeira concreta disponível no período",
    baseMaxScore: 20,
    requiresOptionalData: false,
  },
  {
    id: "debt_control",
    name: "Controle de Dívidas",
    description: "Relação entre dívidas ativas e capacidade de pagamento",
    baseMaxScore: 15,
    requiresOptionalData: true,
  },
  {
    id: "emergency_reserve",
    name: "Reserva de Emergência",
    description:
      "Quantos meses o saldo atual consegue cobrir seus custos fixos",
    baseMaxScore: 10,
    requiresOptionalData: true,
  },
];

// ─── Helpers internos ─────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtPct(n: number): string {
  return `${round2(n)}%`;
}

function fmtBrl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dimensionStatus(percentage: number, isNA = false): DimensionStatus {
  if (isNA) return "N/A";
  if (percentage >= 85) return "GREAT";
  if (percentage >= 65) return "GOOD";
  if (percentage >= 45) return "FAIR";
  if (percentage >= 25) return "POOR";
  return "CRITICAL";
}

// ─── Cálculo por dimensão ─────────────────────────────────────────────────────

function calcSavingsRateDimension(
  savingsRate: number,
  maxScore: number,
): Omit<ScoreDimension, "id" | "name" | "description"> {
  let raw: number;
  let insight: string;

  if (savingsRate >= 30) {
    raw = 1.0;
    insight =
      "Parabéns! Você está no nível ideal de poupança, similar ao recomendado pela regra 50/30/20.";
  } else if (savingsRate >= 20) {
    raw = 0.82;
    insight =
      "Ótima taxa de poupança. Com pequenos ajustes você chega ao patamar de excelência.";
  } else if (savingsRate >= 10) {
    raw = 0.62;
    insight =
      "Taxa razoável, mas ainda há espaço para aumentar a poupança reduzindo gastos variáveis.";
  } else if (savingsRate >= 5) {
    raw = 0.38;
    insight =
      "Taxa baixa de poupança. Qualquer imprevisto pode comprometer seu equilíbrio financeiro.";
  } else if (savingsRate > 0) {
    raw = 0.18;
    insight =
      "Poupança quase nula. Você está utilizando praticamente toda a sua renda mensalmente.";
  } else {
    raw = 0;
    insight =
      "Sem poupança: suas despesas superam ou igualam sua renda. Situação de risco imediato.";
  }

  const score = round2(raw * maxScore);
  const percentage = round2(raw * 100);

  return {
    score,
    maxScore,
    percentage,
    status: dimensionStatus(percentage),
    displayValue: fmtPct(savingsRate),
    insight,
    isEstimated: false,
  };
}

function calcExpenseCommitmentDimension(
  expenseRatio: number,
  maxScore: number,
): Omit<ScoreDimension, "id" | "name" | "description"> {
  let raw: number;
  let insight: string;

  if (expenseRatio <= 50) {
    raw = 1.0;
    insight =
      "Excelente controle! Você gasta metade ou menos do que ganha — há grande margem de segurança.";
  } else if (expenseRatio <= 60) {
    raw = 0.88;
    insight =
      "Comprometimento baixo. Sua renda tem boa folga em relação às despesas.";
  } else if (expenseRatio <= 70) {
    raw = 0.72;
    insight =
      "Comprometimento moderado. Ainda saudável, mas atenção para não deixar os gastos crescerem.";
  } else if (expenseRatio <= 80) {
    raw = 0.5;
    insight =
      "Alta parcela da renda comprometida. Reduza gastos variáveis para aumentar sua margem.";
  } else if (expenseRatio <= 90) {
    raw = 0.26;
    insight =
      "Comprometimento elevado. Sobrará pouco para imprevistos ou investimentos.";
  } else if (expenseRatio < 100) {
    raw = 0.1;
    insight =
      "Situação crítica: quase toda sua renda está comprometida com despesas.";
  } else {
    raw = 0;
    insight =
      "Despesas maiores que receitas. Você está consumindo reservas ou se endividando.";
  }

  const score = round2(raw * maxScore);
  const percentage = round2(raw * 100);

  return {
    score,
    maxScore,
    percentage,
    status: dimensionStatus(percentage),
    displayValue: fmtPct(expenseRatio),
    insight,
    isEstimated: false,
  };
}

function calcLiquidityDimension(
  surplus: number,
  income: number,
  maxScore: number,
): Omit<ScoreDimension, "id" | "name" | "description"> {
  const surplusRatio = pct(surplus, income);
  let raw: number;
  let insight: string;

  if (surplus <= 0) {
    raw = 0;
    insight =
      surplus === 0
        ? "Sem sobra: renda e despesas estão empatadas. Qualquer variação causa deficit."
        : `Deficit de ${fmtBrl(Math.abs(surplus))}. Você está gastando mais do que ganha.`;
  } else if (surplusRatio >= 30) {
    raw = 1.0;
    insight = `Sobra de ${fmtBrl(surplus)} — excelente folga para investir, poupar e cobrir imprevistos.`;
  } else if (surplusRatio >= 20) {
    raw = 0.8;
    insight = `Boa sobra de ${fmtBrl(surplus)}. Considere direcionar parte para investimentos recorrentes.`;
  } else if (surplusRatio >= 10) {
    raw = 0.58;
    insight = `Sobra de ${fmtBrl(surplus)}. Suficiente para cobrir imprevistos pequenos, mas limitada para investir.`;
  } else {
    raw = 0.28;
    insight = `Sobra pequena de ${fmtBrl(surplus)}. Pouca margem para imprevistos ou objetivos futuros.`;
  }

  const score = round2(raw * maxScore);
  const percentage = round2(raw * 100);

  return {
    score,
    maxScore,
    percentage,
    status: dimensionStatus(percentage),
    displayValue: fmtBrl(surplus),
    insight,
    isEstimated: false,
  };
}

function calcDebtDimension(
  totalDebt: number,
  monthlyIncome: number,
  maxScore: number,
): Omit<ScoreDimension, "id" | "name" | "description"> {
  const annualIncome = monthlyIncome * 12;
  const debtRatio = pct(totalDebt, annualIncome);
  let raw: number;
  let insight: string;

  if (totalDebt <= 0) {
    raw = 1.0;
    insight =
      "Sem dívidas ativas. Situação excelente — toda a sobra pode ser investida ou poupada.";
  } else if (debtRatio <= 10) {
    raw = 0.82;
    insight = `Dívidas baixas (${fmtPct(debtRatio)} da renda anual). Bem sob controle.`;
  } else if (debtRatio <= 25) {
    raw = 0.6;
    insight = `Dívidas moderadas (${fmtPct(debtRatio)} da renda anual). Fique atento ao crescimento.`;
  } else if (debtRatio <= 50) {
    raw = 0.33;
    insight = `Dívidas relevantes (${fmtPct(debtRatio)} da renda anual). Priorize a quitação antes de novos gastos.`;
  } else {
    raw = 0.1;
    insight = `Dívidas muito altas (${fmtPct(debtRatio)} da renda anual). Recomendamos revisão urgente com plano de quitação.`;
  }

  const score = round2(raw * maxScore);
  const percentage = round2(raw * 100);

  return {
    score,
    maxScore,
    percentage,
    status: dimensionStatus(percentage),
    displayValue: fmtBrl(totalDebt),
    insight,
    isEstimated: false,
  };
}

function calcEmergencyReserveDimension(
  totalBalance: number,
  monthlyReference: number,
  maxScore: number,
): Omit<ScoreDimension, "id" | "name" | "description"> {
  const months = monthlyReference > 0 ? totalBalance / monthlyReference : 0;
  let raw: number;
  let insight: string;

  if (months >= 6) {
    raw = 1.0;
    insight = `${round2(months)} meses de reserva — acima do ideal de 6 meses recomendado por especialistas.`;
  } else if (months >= 4) {
    raw = 0.8;
    insight = `${round2(months)} meses de reserva. Muito bom — próximo do padrão de segurança ideal.`;
  } else if (months >= 2) {
    raw = 0.52;
    insight = `${round2(months)} meses de reserva. Razoável, mas tente atingir 6 meses para maior segurança.`;
  } else if (months >= 1) {
    raw = 0.26;
    insight = `${round2(months)} mês de reserva. Pouco para cobrir imprevistos. Foque em aumentar o saldo.`;
  } else {
    raw = 0;
    insight =
      "Reserva insuficiente. Priorize criar uma reserva de emergência antes de outros objetivos.";
  }

  const score = round2(raw * maxScore);
  const percentage = round2(raw * 100);

  return {
    score,
    maxScore,
    percentage,
    status: dimensionStatus(percentage),
    displayValue: `${round2(months)} ${months === 1 ? "mês" : "meses"}`,
    insight,
    isEstimated: false,
  };
}

// ─── Nível e identidade visual ────────────────────────────────────────────────

interface ScoreLevel {
  id: ScoreLevelId;
  label: string;
  heatColor: string;
  emoji: string;
  minScore: number;
}

const SCORE_LEVELS: ScoreLevel[] = [
  {
    id: "EXCELLENT",
    label: "Excelente",
    heatColor: "#16a34a",
    emoji: "🏆",
    minScore: 88,
  },
  {
    id: "VERY_GOOD",
    label: "Muito Bom",
    heatColor: "#22c55e",
    emoji: "✅",
    minScore: 74,
  },
  { id: "GOOD", label: "Bom", heatColor: "#84cc16", emoji: "👍", minScore: 60 },
  {
    id: "REGULAR",
    label: "Regular",
    heatColor: "#eab308",
    emoji: "⚠️",
    minScore: 45,
  },
  {
    id: "WEAK",
    label: "Fraco",
    heatColor: "#f97316",
    emoji: "📉",
    minScore: 30,
  },
  {
    id: "CRITICAL",
    label: "Crítico",
    heatColor: "#ef4444",
    emoji: "🚨",
    minScore: 15,
  },
  {
    id: "EMERGENCY",
    label: "Emergência",
    heatColor: "#991b1b",
    emoji: "🔴",
    minScore: 0,
  },
];

function resolveLevel(score: number): ScoreLevel {
  return (
    SCORE_LEVELS.find((l) => score >= l.minScore) ??
    SCORE_LEVELS[SCORE_LEVELS.length - 1]
  );
}

// ─── Geração de headline e summary ───────────────────────────────────────────

function buildHeadline(
  level: ScoreLevelId,
  savingsRate: number,
  surplus: number,
): string {
  switch (level) {
    case "EXCELLENT":
      return "Saúde financeira exemplar — você tem controle total sobre seu dinheiro.";
    case "VERY_GOOD":
      return "Finanças bem geridas com boa margem de crescimento e segurança.";
    case "GOOD":
      return "Situação estável, com algumas oportunidades de melhoria na gestão.";
    case "REGULAR":
      return "Finanças no limite: ajustes necessários para evitar desequilíbrio.";
    case "WEAK":
      savingsRate > 0
        ? `Sobra de apenas ${fmtPct(savingsRate)} da renda — margem muito apertada.`
        : "Pouquíssima sobra disponível — risco de endividamento em caso de imprevisto.";
      return `Situação frágil com sobra de ${fmtBrl(surplus)} — disciplina é essencial agora.`;
    case "CRITICAL":
      return "Situação crítica: suas despesas consomem quase toda (ou toda) sua renda.";
    case "EMERGENCY":
      return "Emergência financeira: despesas superam receitas — ação imediata necessária.";
  }
}

function buildSummary(
  level: ScoreLevelId,
  savingsRate: number,
  expenseRatio: number,
  surplus: number,
): string {
  const surplusStr = fmtBrl(surplus);
  const savingsStr = fmtPct(savingsRate);
  const expenseStr = fmtPct(expenseRatio);

  switch (level) {
    case "EXCELLENT":
      return `Você está poupando ${savingsStr} da sua renda e comprometendo apenas ${expenseStr} com despesas. Sua sobra mensal de ${surplusStr} oferece sólida capacidade de investimento e proteção contra imprevistos. Continue mantendo esse padrão e considere diversificar seus investimentos.`;
    case "VERY_GOOD":
      return `Com ${savingsStr} de taxa de poupança e ${expenseStr} de comprometimento de renda, você está acima da média brasileira. A sobra de ${surplusStr} já permite construir reservas e iniciar investimentos. Foque em automatizar a poupança para garantir consistência.`;
    case "GOOD":
      return `Sua taxa de poupança de ${savingsStr} e sobra de ${surplusStr} demonstram um equilíbrio razoável. No entanto, com ${expenseStr} de renda comprometida, há espaço para reduzir gastos variáveis e fortalecer sua reserva de emergência.`;
    case "REGULAR":
      return `${expenseStr} da sua renda está comprometida com despesas, deixando uma sobra pequena de ${surplusStr}. A taxa de poupança de ${savingsStr} precisa crescer. Revise seus gastos mensais e identifique onde cortar para criar mais folga financeira.`;
    case "WEAK":
      return `Com ${expenseStr} da renda em despesas e apenas ${surplusStr} de sobra, sua margem financeira é mínima. Qualquer imprevisto pode gerar dívida. Priorize cortar gastos não essenciais imediatamente e evite novos compromissos financeiros.`;
    case "CRITICAL":
      return `Situação crítica: ${expenseStr} da sua renda vai para despesas, restando apenas ${surplusStr}. Sem uma intervenção rápida — revisão de contratos, corte de gastos e renegociação de dívidas — o risco de endividamento é alto.`;
    case "EMERGENCY":
      return `Suas despesas superam suas receitas em ${fmtBrl(Math.abs(surplus))}. Isso significa que você está usando reservas ou gerando dívidas para cobrir o mês. Busque orientação financeira e corte todos os gastos não essenciais com urgência.`;
  }
}

// ─── Geração de pontos de melhoria ───────────────────────────────────────────

function buildImprovements(
  input: FinancialScoreInput,
  metrics: ScoreMetrics,
  level: ScoreLevelId,
): ImprovementPoint[] {
  const points: ImprovementPoint[] = [];
  const {
    savingsRate,
    expenseRatio,
    surplus,
    emergencyMonths,
    debtToIncomeRatio,
  } = metrics;

  // 1. Deficit / gastos maiores que receita
  if (surplus <= 0) {
    points.push({
      priority: 1,
      category: "EXPENSES",
      title: "Elimine o deficit imediatamente",
      description: `Suas despesas superam ou igualam suas receitas. Você não está construindo patrimônio — está consumindo reservas ou gerando dívida.`,
      estimatedScoreImpact: 18,
      action:
        "Liste todos os gastos do mês e corte ao menos 3 itens não essenciais (streaming, delivery, assinaturas duplicadas).",
    });
  }

  // 2. Taxa de poupança muito baixa
  if (savingsRate < 10 && surplus > 0) {
    points.push({
      priority: 1,
      category: "SAVINGS",
      title: "Aumente sua taxa de poupança",
      description: `Com apenas ${fmtPct(savingsRate)} de poupança, qualquer imprevisto pode desestabilizar suas finanças. O ideal é poupar ao menos 10-20% da renda.`,
      estimatedScoreImpact: 12,
      action: `Configure uma transferência automática de no mínimo ${fmtBrl(input.totalIncome * 0.1)} assim que receber sua renda (pague-se primeiro).`,
    });
  }

  // 3. Alto comprometimento de renda
  if (expenseRatio > 80) {
    points.push({
      priority: expenseRatio > 95 ? 1 : 2,
      category: "EXPENSES",
      title: "Reduza o comprometimento de renda",
      description: `${fmtPct(expenseRatio)} da sua renda está em despesas. Idealmente esse número deve ficar abaixo de 70% para ter segurança financeira real.`,
      estimatedScoreImpact: 10,
      action:
        "Renegocie contratos fixos (plano de celular, internet, seguro) e revise assinaturas mensais — pequenos cortes acumulam grandes resultados.",
    });
  }

  // 4. Sem reserva de emergência
  if (emergencyMonths !== null && emergencyMonths < 2) {
    points.push({
      priority: 2,
      category: "RESERVE",
      title: "Construa sua reserva de emergência",
      description: `Você tem menos de 2 meses de reserva. O ideal são 6 meses de custos fixos guardados em aplicação de liquidez diária.`,
      estimatedScoreImpact: 8,
      action:
        "Abra uma conta de rendimento diário (CDB 100% CDI ou Tesouro Selic) e deposite mensalmente até atingir 6× seus custos fixos.",
    });
  } else if (emergencyMonths !== null && emergencyMonths < 4) {
    points.push({
      priority: 3,
      category: "RESERVE",
      title: "Fortaleça sua reserva de emergência",
      description: `Sua reserva cobre ${round2(emergencyMonths)} meses. Tente chegar a 6 meses para ter segurança máxima contra imprevistos.`,
      estimatedScoreImpact: 5,
      action:
        "Destine parte da sobra mensal exclusivamente para a reserva de emergência até atingir o objetivo de 6 meses.",
    });
  }

  // 5. Dívidas altas
  if (debtToIncomeRatio !== null && debtToIncomeRatio > 25) {
    points.push({
      priority: debtToIncomeRatio > 50 ? 1 : 2,
      category: "DEBT",
      title: "Priorize a quitação de dívidas",
      description: `Suas dívidas representam ${fmtPct(debtToIncomeRatio)} da renda anual. Dívidas caras (juros > 10% a.m.) destroem a capacidade de poupança.`,
      estimatedScoreImpact: debtToIncomeRatio > 50 ? 12 : 8,
      action:
        "Use o método 'avalanche' (quitar as dívidas com maiores juros primeiro) ou renegocie para reduzir taxas. Evite novas dívidas enquanto isso.",
    });
  } else if (debtToIncomeRatio !== null && debtToIncomeRatio > 10) {
    points.push({
      priority: 3,
      category: "DEBT",
      title: "Continue reduzindo as dívidas",
      description: `Dívidas em ${fmtPct(debtToIncomeRatio)} da renda anual. Controlado, mas ainda há custo de juros impactando sua capacidade de poupança.`,
      estimatedScoreImpact: 4,
      action:
        "Adicione aportes extras nas parcelas de maior juros para quitar antes do prazo e economizar nos juros.",
    });
  }

  // 6. Tendência de queda
  if (
    metrics.trend === "DOWN" &&
    metrics.trendDelta !== null &&
    metrics.trendDelta < -10
  ) {
    points.push({
      priority: 2,
      category: "HABIT",
      title: "Reverta a tendência de queda",
      description: `Sua sobra está ${fmtPct(Math.abs(metrics.trendDelta))} abaixo da média histórica. Uma tendência negativa constante pode levá-lo ao deficit.`,
      estimatedScoreImpact: 6,
      action:
        "Compare seus gastos do mês atual com os anteriores e identifique quais categorias cresceram. Estabeleça um teto de gasto mensal por categoria.",
    });
  }

  // 7. Renda diversificada — sugestão de melhoria de renda
  if (savingsRate < 20 && expenseRatio < 85 && level !== "EMERGENCY") {
    points.push({
      priority: 3,
      category: "INCOME",
      title: "Considere fontes de renda complementar",
      description:
        "Aumentar a renda é tão eficaz quanto cortar gastos para melhorar o score financeiro.",
      estimatedScoreImpact: 7,
      action:
        "Explore renda extra com freelance, venda de produtos, renda passiva (dividendos, FIIs) ou monetização de habilidades.",
    });
  }

  // 8. Sobra não aproveitada — sugestão de investimento
  if (savingsRate >= 20 && (emergencyMonths === null || emergencyMonths >= 4)) {
    points.push({
      priority: 3,
      category: "SAVINGS",
      title: "Potencialize sua sobra com investimentos",
      description: `Você já tem boa sobra de ${fmtBrl(surplus)}. Dinheiro parado perde para a inflação — faça ele trabalhar por você.`,
      estimatedScoreImpact: 3,
      action:
        "Avalie Tesouro Direto, CDBs, FIIs ou ações para diversificar e aumentar sua renda passiva ao longo do tempo.",
    });
  }

  // Ordena: prioridade 1 primeiro, depois por impacto
  return points
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        b.estimatedScoreImpact - a.estimatedScoreImpact,
    )
    .slice(0, 6);
}

// ─── Análise de tendência histórica ──────────────────────────────────────────

function analyzeTrend(
  currentSurplus: number,
  history?: Array<{ income: number; expense: number }>,
): { trend: ScoreTrend; trendDelta: number | null } {
  if (!history || history.length < 2) {
    return { trend: "UNKNOWN", trendDelta: null };
  }

  const historicalSurpluses = history.map((m) => m.income - m.expense);
  const avg =
    historicalSurpluses.reduce((s, v) => s + v, 0) / historicalSurpluses.length;

  if (avg === 0) return { trend: "STABLE", trendDelta: 0 };

  const delta = pct(currentSurplus - avg, Math.abs(avg));

  let trend: ScoreTrend;
  if (delta > 10) trend = "UP";
  else if (delta < -10) trend = "DOWN";
  else trend = "STABLE";

  return { trend, trendDelta: round2(delta) };
}

// ─── Função principal pública ─────────────────────────────────────────────────

/**
 * Calcula o score financeiro completo baseado nas métricas de entradas,
 * saídas e sobra do usuário, retornando um JSON rico com pontuação,
 * nível, cor, dimensões detalhadas e pontos de melhoria acionáveis.
 *
 * @example
 * const score = calculateFinancialScore({
 *   totalIncome: 8000,
 *   totalExpense: 5500,
 *   totalBalance: 12000,
 *   totalDebt: 3000,
 *   fixedExpenses: 3000,
 * })
 * // score.score => 74
 * // score.label => "Muito Bom"
 * // score.heatColor => "#22c55e"
 */
export function calculateFinancialScore(
  input: FinancialScoreInput,
): FinancialScore {
  const { totalIncome, totalExpense } = input;

  // Proteção contra divisão por zero
  const income = Math.max(totalIncome, 0);
  const expense = Math.max(totalExpense, 0);
  const surplus = income - expense;

  // ── Métricas brutas ────────────────────────────────────────────────────────
  const savingsRate = round2(pct(surplus, income));
  const expenseRatio = round2(pct(expense, income));

  const hasDebtData =
    typeof input.totalDebt === "number" && input.totalDebt >= 0;
  const hasBalanceData =
    typeof input.totalBalance === "number" && input.totalBalance >= 0;
  const hasHistoricalData =
    Array.isArray(input.historicalMonths) && input.historicalMonths.length >= 2;
  const hasFixedData =
    typeof input.fixedExpenses === "number" ||
    typeof input.fixedIncome === "number";

  const debtToIncomeRatio = hasDebtData
    ? round2(pct(input.totalDebt!, income * 12))
    : null;

  // Para reserva: usa fixedExpenses se disponível, senão cai para totalExpense como referência
  const monthlyReference = hasBalanceData
    ? typeof input.fixedExpenses === "number" && input.fixedExpenses > 0
      ? input.fixedExpenses
      : expense
    : 0;

  const emergencyMonths =
    hasBalanceData && monthlyReference > 0
      ? round2(input.totalBalance! / monthlyReference)
      : null;

  const { trend, trendDelta } = analyzeTrend(surplus, input.historicalMonths);

  const metrics: ScoreMetrics = {
    savingsRate,
    expenseRatio,
    surplus,
    debtToIncomeRatio,
    emergencyMonths,
    trend,
    trendDelta,
  };

  // ── Redistribuição de pontos entre dimensões disponíveis ───────────────────
  const activeDims = DIMENSIONS.filter(
    (d) =>
      !d.requiresOptionalData ||
      (d.id === "debt_control" && hasDebtData) ||
      (d.id === "emergency_reserve" && hasBalanceData),
  );
  const missingPoints = DIMENSIONS.filter(
    (d) => d.requiresOptionalData && !activeDims.find((a) => a.id === d.id),
  ).reduce((s, d) => s + d.baseMaxScore, 0);

  const coreTotal = activeDims.reduce((s, d) => s + d.baseMaxScore, 0);

  function adjustedMax(dim: DimensionConfig): number {
    const isCore = !dim.requiresOptionalData;
    if (!isCore || missingPoints === 0 || coreTotal === 0)
      return dim.baseMaxScore;
    const bonus = (dim.baseMaxScore / coreTotal) * missingPoints;
    return round2(dim.baseMaxScore + bonus);
  }

  // ── Cálculo por dimensão ───────────────────────────────────────────────────
  const dimensionsResult: ScoreDimension[] = [];
  let totalScore = 0;

  for (const dim of DIMENSIONS) {
    const inActive = activeDims.find((d) => d.id === dim.id);
    if (!inActive) continue;

    const max = adjustedMax(dim);
    let partial: Omit<ScoreDimension, "id" | "name" | "description">;

    switch (dim.id) {
      case "savings_rate":
        partial = calcSavingsRateDimension(savingsRate, max);
        break;
      case "expense_commitment":
        partial = calcExpenseCommitmentDimension(expenseRatio, max);
        break;
      case "liquidity":
        partial = calcLiquidityDimension(surplus, income, max);
        break;
      case "debt_control":
        partial = calcDebtDimension(input.totalDebt!, income, max);
        break;
      case "emergency_reserve":
        partial = calcEmergencyReserveDimension(
          input.totalBalance!,
          monthlyReference,
          max,
        );
        break;
      default:
        continue;
    }

    dimensionsResult.push({
      id: dim.id,
      name: dim.name,
      description: dim.description,
      ...partial,
    });
    totalScore += partial.score;
  }

  const finalScore = clamp(Math.round(totalScore), 0, 100);

  // ── Nível e identidade ─────────────────────────────────────────────────────
  const level = resolveLevel(finalScore);

  // ── Confiança do resultado ─────────────────────────────────────────────────
  let confidence: DataConfidence = "LOW";
  const dataBits = [
    hasDebtData,
    hasBalanceData,
    hasHistoricalData,
    hasFixedData,
  ].filter(Boolean).length;
  if (dataBits >= 3) confidence = "HIGH";
  else if (dataBits >= 1) confidence = "MEDIUM";

  // ── Pontos de melhoria ─────────────────────────────────────────────────────
  const improvementPoints = buildImprovements(input, metrics, level.id);

  return {
    score: finalScore,
    level: level.id,
    label: level.label,
    heatColor: level.heatColor,
    emoji: level.emoji,
    headline: buildHeadline(level.id, savingsRate, surplus),
    summary: buildSummary(level.id, savingsRate, expenseRatio, surplus),
    dimensions: dimensionsResult,
    improvementPoints,
    metrics,
    metadata: {
      calculatedAt: new Date().toISOString(),
      hasDebtData,
      hasBalanceData,
      hasHistoricalData,
      hasFixedData,
      confidence,
      activeDimensions: activeDims.length,
      totalDimensions: DIMENSIONS.length,
    },
  };
}
