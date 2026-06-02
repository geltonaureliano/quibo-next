/**
 * Análise Temporal de Score Financeiro — Quibo
 *
 * Envolve o scorer de período (calculateFinancialScore) e o aplica sobre uma
 * série de meses, respondendo às perguntas que um score isolado não responde:
 *
 *   • "Quais meses eu estou bem / mal?"      -> classificação relativa + absoluta
 *   • "Estou melhorando ou piorando?"        -> trajetória (regressão linear)
 *   • "Quando vou melhorar?"                 -> projeção até o próximo nível
 *   • "Onde devo me gerenciar?"              -> gargalo estrutural (dimensão âncora)
 *   • "Minhas finanças são consistentes?"    -> volatilidade do score
 *
 * Princípio central: um único mês é ruidoso (bônus, atraso de PJ, fatura alta).
 * Aqui o sinal vem da SÉRIE — média móvel para o estado atual, desvio para
 * consistência, e inclinação para direção. A nota mensal continua sendo a do
 * scorer original; esta camada interpreta a evolução dela no tempo.
 */

import {
  calculateFinancialScore,
  type FinancialScore,
  type FinancialScoreInput,
  type ScoreLevelId,
} from "./financial-score";

// ─── Limiares de nível ────────────────────────────────────────────────────────
// Espelham SCORE_LEVELS do módulo base. O ideal é EXPORTAR SCORE_LEVELS de
// financial-score.ts e importar aqui para eliminar esta duplicação.
const LEVEL_FLOORS: ReadonlyArray<{ id: ScoreLevelId; minScore: number }> = [
  { id: "EXCELLENT", minScore: 88 },
  { id: "VERY_GOOD", minScore: 74 },
  { id: "GOOD", minScore: 60 },
  { id: "REGULAR", minScore: 45 },
  { id: "WEAK", minScore: 30 },
  { id: "CRITICAL", minScore: 15 },
  { id: "EMERGENCY", minScore: 0 },
];

/** Score abaixo disto = mês ruim em termos absolutos, independente do histórico. */
const ABSOLUTE_LOW_THRESHOLD = 45; // piso de REGULAR

const ROLLING_WINDOW = 3; // meses da média móvel

// ─── Tipos de entrada ────────────────────────────────────────────────────────

export interface TimelineMonth {
  /** Competência no formato "YYYY-MM" (ex.: "2026-04") */
  period: string;
  /** Métricas daquele mês. NÃO inclua historicalMonths — o histórico é a série. */
  input: Omit<FinancialScoreInput, "historicalMonths">;
}

// ─── Tipos de saída ──────────────────────────────────────────────────────────

export type MonthClassification =
  | "STRONG" // bem acima do seu padrão
  | "ABOVE" // acima do seu padrão
  | "TYPICAL" // dentro do seu normal
  | "BELOW" // abaixo do seu padrão
  | "WEAK"; // bem abaixo do seu padrão

export type ConsistencyRating =
  | "VERY_STABLE"
  | "STABLE"
  | "VOLATILE"
  | "ERRATIC";
export type TrajectoryDirection = "IMPROVING" | "DECLINING" | "FLAT";

export interface ScoredMonth {
  period: string;
  /** Nota do mês (0-100), vinda do scorer base */
  score: number;
  level: ScoreLevelId;
  /** Média móvel de até ROLLING_WINDOW meses (estado "real", sem ruído) */
  rollingScore: number;
  /** Variação vs. mês anterior (em pontos) */
  deltaFromPrev: number | null;
  /** Posição relativa ao SEU próprio padrão histórico */
  classification: MonthClassification;
  /** Mês ruim em termos absolutos (score < 45), independente do histórico */
  isAbsoluteLowMonth: boolean;
  surplus: number;
  savingsRate: number;
  /** Resultado completo do scorer, caso queira drill-down na UI */
  detail: FinancialScore;
}

export interface DimensionBottleneck {
  id: string;
  name: string;
  /** Percentual médio atingido nesta dimensão ao longo da série (0-100) */
  avgPercentage: number;
  /** Em quantos meses esta dimensão foi a de pior desempenho */
  worstMonthCount: number;
}

export interface Projection {
  /** Direção da tendência */
  direction: TrajectoryDirection;
  /** Inclinação da reta de tendência, em pontos de score por mês */
  slopePerMonth: number;
  /** Nível atual (baseado na média móvel mais recente) */
  currentLevel: ScoreLevelId;
  /** Próximo nível acima, se houver */
  nextLevel: ScoreLevelId | null;
  /** Meses estimados até alcançar o próximo nível (null se não aplicável) */
  monthsToNextLevel: number | null;
  /** Competência estimada do próximo nível ("YYYY-MM"), se projetável */
  projectedPeriod: string | null;
  /** Se declinando: meses até cair abaixo do nível atual (alerta) */
  monthsToDropLevel: number | null;
  /** Texto pronto para exibição */
  message: string;
}

export interface FinancialTimeline {
  months: ScoredMonth[];
  /** Score típico do período (mediana, robusta a outliers) */
  baselineScore: number;
  /** Desvio-padrão dos scores mensais */
  scoreStdDev: number;
  consistency: ConsistencyRating;
  bestMonth: ScoredMonth | null;
  worstMonth: ScoredMonth | null;
  /** Dimensão que mais consistentemente puxa o score para baixo */
  bottleneck: DimensionBottleneck | null;
  projection: Projection;
  /** Resumo executivo da evolução, pronto para a UI */
  summary: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0;
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(variance);
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Inclinação via mínimos quadrados sobre (índice, valor). pts por passo (mês). */
function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function addMonths(period: string, n: number): string {
  const [y, m] = period.split("-").map(Number);
  // Date em UTC dia 1 evita drift de fuso/dia
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function levelFloorFor(score: number): { id: ScoreLevelId; minScore: number } {
  return (
    LEVEL_FLOORS.find((l) => score >= l.minScore) ??
    LEVEL_FLOORS[LEVEL_FLOORS.length - 1]
  );
}

function nextLevelAbove(
  score: number,
): { id: ScoreLevelId; minScore: number } | null {
  // menor piso estritamente maior que o score atual
  const above = [...LEVEL_FLOORS]
    .filter((l) => l.minScore > score)
    .sort((a, b) => a.minScore - b.minScore);
  return above[0] ?? null;
}

function consistencyFromStdDev(sd: number): ConsistencyRating {
  if (sd < 5) return "VERY_STABLE";
  if (sd < 12) return "STABLE";
  if (sd < 20) return "VOLATILE";
  return "ERRATIC";
}

/**
 * Classifica o mês em relação ao padrão pessoal usando z-score.
 * Com poucos dados (n < 3) ou variância nula, cai para classificação absoluta.
 */
function classifyMonth(
  score: number,
  seriesMean: number,
  seriesStd: number,
  n: number,
): MonthClassification {
  if (n < 3 || seriesStd < 1e-6) {
    if (score >= 74) return "STRONG";
    if (score >= 60) return "ABOVE";
    if (score >= 45) return "TYPICAL";
    if (score >= 30) return "BELOW";
    return "WEAK";
  }
  const z = (score - seriesMean) / seriesStd;
  if (z >= 1) return "STRONG";
  if (z >= 0.4) return "ABOVE";
  if (z > -0.4) return "TYPICAL";
  if (z > -1) return "BELOW";
  return "WEAK";
}

// ─── Função principal ──────────────────────────────────────────────────────────

/**
 * Calcula a linha do tempo financeira a partir de uma série mensal ordenada
 * (ou não — a função ordena por `period`).
 *
 * @example
 * const timeline = calculateFinancialTimeline([
 *   { period: "2026-01", input: { totalIncome: 8000, totalExpense: 7200 } },
 *   { period: "2026-02", input: { totalIncome: 8200, totalExpense: 6800 } },
 *   { period: "2026-03", input: { totalIncome: 8000, totalExpense: 6100 } },
 * ])
 * // timeline.projection.message => "Tendência de melhora..."
 * // timeline.bottleneck.name    => "Reserva de Emergência"
 */
export function calculateFinancialTimeline(
  rawMonths: TimelineMonth[],
): FinancialTimeline {
  if (rawMonths.length === 0) {
    throw new Error("calculateFinancialTimeline requer ao menos um mês.");
  }

  // 1. Ordena cronologicamente e pontua cada mês.
  //    Cada mês recebe como histórico os meses anteriores da própria série,
  //    para que a tendência interna do scorer também tenha contexto real.
  const sorted = [...rawMonths].sort((a, b) =>
    a.period.localeCompare(b.period),
  );

  const scored: ScoredMonth[] = sorted.map((tm, i) => {
    const history = sorted
      .slice(0, i)
      .map((p) => ({
        income: p.input.totalIncome,
        expense: p.input.totalExpense,
      }));

    const detail = calculateFinancialScore({
      ...tm.input,
      historicalMonths: history.length >= 2 ? history : undefined,
    });

    return {
      period: tm.period,
      score: detail.score,
      level: detail.level,
      rollingScore: detail.score, // preenchido no passo 2
      deltaFromPrev: null, // preenchido no passo 2
      classification: "TYPICAL", // preenchido no passo 3
      isAbsoluteLowMonth: detail.score < ABSOLUTE_LOW_THRESHOLD,
      surplus: detail.metrics.surplus,
      savingsRate: detail.metrics.savingsRate,
      detail,
    };
  });

  const scores = scored.map((m) => m.score);

  // 2. Média móvel (estado real, sem ruído) e delta mês a mês.
  scored.forEach((m, i) => {
    const windowStart = Math.max(0, i - (ROLLING_WINDOW - 1));
    const windowScores = scores.slice(windowStart, i + 1);
    m.rollingScore = round2(mean(windowScores));
    m.deltaFromPrev = i === 0 ? null : round2(scores[i] - scores[i - 1]);
  });

  // 3. Estatísticas da série e classificação relativa.
  const seriesMean = mean(scores);
  const seriesStd = stdDev(scores);
  const baselineScore = round2(median(scores));

  scored.forEach((m) => {
    m.classification = classifyMonth(
      m.score,
      seriesMean,
      seriesStd,
      scores.length,
    );
  });

  // 4. Melhor / pior mês.
  const bestMonth = scored.reduce<ScoredMonth | null>(
    (best, m) => (best === null || m.score > best.score ? m : best),
    null,
  );
  const worstMonth = scored.reduce<ScoredMonth | null>(
    (worst, m) => (worst === null || m.score < worst.score ? m : worst),
    null,
  );

  // 5. Gargalo estrutural: dimensão com menor desempenho médio na série.
  const bottleneck = computeBottleneck(scored);

  // 6. Projeção temporal.
  const projection = computeProjection(scored, scores);

  // 7. Resumo executivo.
  const consistency = consistencyFromStdDev(seriesStd);
  const summary = buildTimelineSummary({
    scored,
    baselineScore,
    consistency,
    bottleneck,
    projection,
  });

  return {
    months: scored,
    baselineScore,
    scoreStdDev: round2(seriesStd),
    consistency,
    bestMonth,
    worstMonth,
    bottleneck,
    projection,
    summary,
  };
}

// ─── Gargalo estrutural ─────────────────────────────────────────────────────────

function computeBottleneck(scored: ScoredMonth[]): DimensionBottleneck | null {
  // Acumula percentual por dimensão e conta quantas vezes cada uma foi a pior.
  const acc = new Map<
    string,
    { name: string; sum: number; count: number; worst: number }
  >();

  for (const m of scored) {
    const dims = m.detail.dimensions;
    if (dims.length === 0) continue;

    let worstDimId: string | null = null;
    let worstPct = Infinity;

    for (const d of dims) {
      const cur = acc.get(d.id) ?? { name: d.name, sum: 0, count: 0, worst: 0 };
      cur.sum += d.percentage;
      cur.count += 1;
      acc.set(d.id, cur);

      if (d.percentage < worstPct) {
        worstPct = d.percentage;
        worstDimId = d.id;
      }
    }
    if (worstDimId) {
      const cur = acc.get(worstDimId)!;
      cur.worst += 1;
    }
  }

  if (acc.size === 0) return null;

  let bottleneck: DimensionBottleneck | null = null;
  for (const [id, v] of acc) {
    const avgPercentage = round2(v.sum / v.count);
    if (bottleneck === null || avgPercentage < bottleneck.avgPercentage) {
      bottleneck = {
        id,
        name: v.name,
        avgPercentage,
        worstMonthCount: v.worst,
      };
    }
  }
  return bottleneck;
}

// ─── Projeção ────────────────────────────────────────────────────────────────

function computeProjection(
  scored: ScoredMonth[],
  scores: number[],
): Projection {
  const last = scored[scored.length - 1];
  const current = last.rollingScore; // usa média móvel como estado atual
  const currentLevel = levelFloorFor(current).id;

  // Tendência sobre a média móvel reduz ruído de meses isolados.
  const rollingSeries = scored.map((m) => m.rollingScore);
  const slope = round2(linearSlope(rollingSeries));

  let direction: TrajectoryDirection = "FLAT";
  if (slope >= 0.5) direction = "IMPROVING";
  else if (slope <= -0.5) direction = "DECLINING";

  const next = nextLevelAbove(current);
  let monthsToNextLevel: number | null = null;
  let projectedPeriod: string | null = null;
  let monthsToDropLevel: number | null = null;

  if (direction === "IMPROVING" && next) {
    const gap = next.minScore - current;
    monthsToNextLevel = Math.max(1, Math.ceil(gap / slope));
    projectedPeriod = addMonths(last.period, monthsToNextLevel);
  }

  if (direction === "DECLINING") {
    const floor = levelFloorFor(current).minScore;
    const distanceToFloor = current - floor;
    if (distanceToFloor > 0) {
      monthsToDropLevel = Math.max(
        1,
        Math.ceil(distanceToFloor / Math.abs(slope)),
      );
    } else {
      monthsToDropLevel = 1; // já no piso; próximo mês ruim já rebaixa
    }
  }

  const message = buildProjectionMessage({
    direction,
    slope,
    currentLevel,
    next,
    monthsToNextLevel,
    projectedPeriod,
    monthsToDropLevel,
    insufficientData: scores.length < 3,
  });

  return {
    direction,
    slopePerMonth: slope,
    currentLevel,
    nextLevel: next?.id ?? null,
    monthsToNextLevel,
    projectedPeriod,
    monthsToDropLevel,
    message,
  };
}

function buildProjectionMessage(args: {
  direction: TrajectoryDirection;
  slope: number;
  currentLevel: ScoreLevelId;
  next: { id: ScoreLevelId; minScore: number } | null;
  monthsToNextLevel: number | null;
  projectedPeriod: string | null;
  monthsToDropLevel: number | null;
  insufficientData: boolean;
}): string {
  const {
    direction,
    slope,
    next,
    monthsToNextLevel,
    projectedPeriod,
    monthsToDropLevel,
    insufficientData,
  } = args;

  if (insufficientData) {
    return "Histórico curto: são necessários pelo menos 3 meses para projetar tendência com confiança.";
  }

  if (direction === "IMPROVING") {
    if (next && monthsToNextLevel && projectedPeriod) {
      return `Tendência de melhora (+${slope} pts/mês). Mantendo esse ritmo, você alcança o próximo nível em cerca de ${monthsToNextLevel} ${monthsToNextLevel === 1 ? "mês" : "meses"} (por volta de ${projectedPeriod}).`;
    }
    return `Tendência de melhora (+${slope} pts/mês) e você já está no nível máximo. Foque em manter a consistência.`;
  }

  if (direction === "DECLINING") {
    if (monthsToDropLevel) {
      return `Atenção: tendência de queda (${slope} pts/mês). No ritmo atual, você pode cair de nível em ~${monthsToDropLevel} ${monthsToDropLevel === 1 ? "mês" : "meses"}. Reaja agora atacando o gargalo principal.`;
    }
    return `Atenção: tendência de queda (${slope} pts/mês). Reaja antes que o rebaixamento se concretize.`;
  }

  return "Tendência estável. Seu score está oscilando dentro de uma faixa previsível, sem melhora nem piora claras.";
}

// ─── Resumo executivo ────────────────────────────────────────────────────────

function buildTimelineSummary(args: {
  scored: ScoredMonth[];
  baselineScore: number;
  consistency: ConsistencyRating;
  bottleneck: DimensionBottleneck | null;
  projection: Projection;
}): string {
  const { scored, baselineScore, consistency, bottleneck, projection } = args;

  const lowMonths = scored.filter((m) => m.isAbsoluteLowMonth).length;
  const total = scored.length;

  const consistencyText: Record<ConsistencyRating, string> = {
    VERY_STABLE: "muito consistentes",
    STABLE: "razoavelmente estáveis",
    VOLATILE: "voláteis",
    ERRATIC: "bastante irregulares",
  };

  const parts: string[] = [];
  parts.push(
    `Ao longo de ${total} ${total === 1 ? "mês" : "meses"}, seu score típico foi ${baselineScore}, com finanças ${consistencyText[consistency]}.`,
  );

  if (lowMonths > 0) {
    parts.push(
      `${lowMonths} ${lowMonths === 1 ? "mês ficou" : "meses ficaram"} em zona de risco (abaixo de ${ABSOLUTE_LOW_THRESHOLD}).`,
    );
  }

  if (bottleneck) {
    parts.push(
      `O ponto que mais te limita é "${bottleneck.name}" (média de ${bottleneck.avgPercentage}% de aproveitamento) — é onde a gestão tem maior retorno.`,
    );
  }

  parts.push(projection.message);

  return parts.join(" ");
}
