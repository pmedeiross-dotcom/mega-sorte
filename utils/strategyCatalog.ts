import { CalculationStrategy } from '../types';

export interface StrategyMetadata {
  id: CalculationStrategy;
  name: string;
  shortName: string;
  badge: string;
  description: string;
}

export const STRATEGY_CATALOG: Record<CalculationStrategy, StrategyMetadata> = {
  hybrid_combinatorial: {\n    id: 'hybrid_combinatorial',\n    name: 'Estratégia Híbrida de Cobertura Combinatória',\n    shortName: 'Híbrida',\n    badge: '🧬 Híbrida Combinatória',\n    description: 'Pares e trincas inéditos + equilíbrio de dezenas + soma, paridade e dispersão como critérios suaves'\n  },\n  combinatorial_cover: {
    id: 'combinatorial_cover',
    name: 'Cobertura Anti-Colisão',
    shortName: 'Anti-Colisão',
    badge: '🛡️ Cobertura Anti-Colisão',
    description: 'Gini 0,02 · 61,6% Terno+ · 60,1% Pares'
  },
  balanced: {
    id: 'balanced',
    name: 'Padrão Ouro',
    shortName: 'Padrão Ouro',
    badge: '🎯 Padrão Ouro',
    description: 'Regras clássicas + Teto por dezena'
  },
  momentum: {
    id: 'momentum',
    name: 'Momentum Recente',
    shortName: 'Momentum',
    badge: '🔥 Momentum Recente',
    description: 'Peso recente + Teto por dezena'
  },
  cycle_delay: {
    id: 'cycle_delay',
    name: 'Pressão & Ciclo',
    shortName: 'Pressão/Ciclo',
    badge: '⏳ Pressão & Ciclo',
    description: 'Ciclo atual + Teto por dezena'
  },
  cooccurrence: {
    id: 'cooccurrence',
    name: 'Alta Afinidade (Duques)',
    shortName: 'Alta Afinidade',
    badge: '🔗 Alta Afinidade (Duques)',
    description: 'Duques históricos + Teto por dezena'
  },
  entropy_shannon: {
    id: 'entropy_shannon',
    name: 'Máxima Entropia (Shannon)',
    shortName: 'Máx. Entropia',
    badge: '🎲 Máxima Entropia',
    description: 'Dispersão uniforme de Shannon'
  }
};

export const STRATEGY_LABELS: Record<CalculationStrategy, string> = {
  combinatorial_cover: STRATEGY_CATALOG.combinatorial_cover.name,\n  hybrid_combinatorial: STRATEGY_CATALOG.hybrid_combinatorial.name,
  balanced: STRATEGY_CATALOG.balanced.name,
  momentum: STRATEGY_CATALOG.momentum.name,
  cycle_delay: STRATEGY_CATALOG.cycle_delay.name,
  cooccurrence: STRATEGY_CATALOG.cooccurrence.name,
  entropy_shannon: STRATEGY_CATALOG.entropy_shannon.name
};

export function getStrategyMeta(strategy?: CalculationStrategy): StrategyMetadata {
  if (!strategy || !(strategy in STRATEGY_CATALOG)) {
    return STRATEGY_CATALOG.combinatorial_cover;
  }
  return STRATEGY_CATALOG[strategy];
}
