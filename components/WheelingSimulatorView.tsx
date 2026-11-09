import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  Save, 
  Trash2, 
  Play, 
  CheckCircle2, 
  TrendingDown, 
  Info,
  DollarSign,
  Grid3X3,
  Flame,
  Clock
} from 'lucide-react';
import { 
  generateWheeling, 
  testWheelingAgainstDraw, 
  WHEELING_PLANS, 
  WHEELING_PLANS_LOTOFACIL,
  WheelingGuarantee, 
  WheelingResult 
} from '../utils/wheelingEngine';
import { OfficialDrawResult, LotteryType } from '../types';
import { TOP_10_HISTORICAL } from '../utils/megaSenaOfficialStats';
import { TOP_10_MAIS_MILIONARIA } from '../utils/maisMilionariaOfficialStats';
import { TOP_10_LOTOFACIL } from '../utils/lotofacilRules';

interface WheelingSimulatorViewProps {
  latestDraw?: OfficialDrawResult;
  lottery?: LotteryType;
  onSaveBatchBets?: (games: number[][], reason: string) => void;
}

export const WheelingSimulatorView: React.FC<WheelingSimulatorViewProps> = ({
  latestDraw,
  lottery = 'megasena',
  onSaveBatchBets
}) => {
  const activeLottery: LotteryType = (lottery as LotteryType) || 'megasena';
  const isMaisMilionaria = activeLottery === 'maismilionaria';
  const isLotofacil = activeLottery === 'lotofacil';
  const maxLimit = isLotofacil ? 25 : (isMaisMilionaria ? 50 : 60);
  const minPoolSize = isLotofacil ? 16 : 7;
  const maxPoolSize = isLotofacil ? 22 : 16;
  const plans = isLotofacil ? WHEELING_PLANS_LOTOFACIL : WHEELING_PLANS;
  const singleTicketPrice = isLotofacil ? 3.0 : (isMaisMilionaria ? 6.0 : 5.0);

  // Dezenas selecionadas para o fechamento
  const [selectedPool, setSelectedPool] = useState<number[]>(() => {
    if (isLotofacil) {
      return [1, 2, 3, 4, 5, 8, 10, 11, 13, 14, 15, 17, 18, 20, 22, 24, 25];
    }
    if (isMaisMilionaria) {
      return TOP_10_MAIS_MILIONARIA.slice(0, 10).map(t => t.number).sort((a, b) => a - b);
    }
    return TOP_10_HISTORICAL.slice(0, 10).map(t => t.number).sort((a, b) => a - b);
  });

  const [guarantee, setGuarantee] = useState<WheelingGuarantee>('quadra_if_6');
  const [testMode, setTestMode] = useState<'latest' | 'custom' | null>(null);
  const [customTestInput, setCustomTestInput] = useState('');

  // Geração do fechamento combinatorial
  const wheelResult: WheelingResult = useMemo(() => {
    return generateWheeling(selectedPool, guarantee, activeLottery);
  }, [selectedPool, guarantee, activeLottery]);

  // Alterna número no pool
  const toggleNumber = (num: number) => {
    if (selectedPool.includes(num)) {
      if (selectedPool.length > minPoolSize) {
        setSelectedPool(prev => prev.filter(n => n !== num));
      }
    } else {
      if (selectedPool.length < maxPoolSize) {
        setSelectedPool(prev => [...prev, num].sort((a, b) => a - b));
      }
    }
  };

  // Predefinições rápidas
  const handleSelectTop10 = () => {
    if (isLotofacil) {
      const top18 = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 20, 22, 24];
      setSelectedPool(top18);
      return;
    }
    const list = isMaisMilionaria
      ? TOP_10_MAIS_MILIONARIA.map(t => t.number)
      : TOP_10_HISTORICAL.map(t => t.number);
    setSelectedPool(list.slice(0, 10).sort((a, b) => a - b));
  };

  const handleSelectRandom12 = () => {
    const targetCount = isLotofacil ? 18 : 12;
    const pool = Array.from({ length: maxLimit }, (_, i) => i + 1);
    const chosen: number[] = [];
    while (chosen.length < targetCount && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      chosen.push(pool[idx]);
      pool.splice(idx, 1);
    }
    setSelectedPool(chosen.sort((a, b) => a - b));
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  // Teste de Desempenho do Fechamento
  const testOutcome = useMemo(() => {
    if (!testMode) return null;
    let drawn: number[] = [];

    if (testMode === 'latest') {
      if (!latestDraw?.numbers || latestDraw.numbers.length < 6) return null;
      drawn = latestDraw.numbers;
    } else if (testMode === 'custom') {
      drawn = customTestInput
        .split(/[\s,;-]+/)
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n >= 1 && n <= maxLimit);
      if (drawn.length < 6) return null;
    }

    return testWheelingAgainstDraw(wheelResult.games, drawn, activeLottery);
  }, [testMode, customTestInput, latestDraw, wheelResult.games, maxLimit, activeLottery]);

  const handleSaveAllGames = () => {
    if (!onSaveBatchBets || wheelResult.games.length === 0) return;
    onSaveBatchBets(
      wheelResult.games,
      `Fechamento Econômico (${selectedPool.length} dezenas): ${plans.find(p => p.id === guarantee)?.name}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal */}
      <div className={`text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden border ${
        isMaisMilionaria 
          ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border-amber-800' 
          : 'bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 border-emerald-800'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                isMaisMilionaria 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
              }`}>
                Matrizes de Cobertura Reduzida
              </span>
              <span className="text-xs text-slate-300">
                Economia de até 98% vs Aposta Caixa
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
              <Calculator size={24} className={isMaisMilionaria ? 'text-amber-400' : 'text-emerald-400'} />
              <span>Simulador de Fechamentos & Desdobramentos Econômicos</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Jogue com mais dezenas (8 a 16 números) pagando apenas uma fração do preço oficial da Caixa, com <strong>garantia matemática 100% comprovada</strong> de Quadra ou Quina.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white/10 p-3 rounded-2xl backdrop-blur-xs text-center border border-white/10">
            <div className="px-3">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Dezenas no Grupo</span>
              <span className="text-xl font-black text-white">{selectedPool.length}</span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="px-3">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">Jogos Gerados</span>
              <span className="text-xl font-black text-white">{wheelResult.gamesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cartela Interativa de Seleção das Dezenas do Fechamento */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Grid3X3 size={18} className={isMaisMilionaria ? 'text-amber-600' : 'text-emerald-600'} />
              <span>1. Escolha o Grupo de Dezenas ({selectedPool.length} selecionadas)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Selecione entre 7 e 16 dezenas para compor a sua matriz de fechamento.
            </p>
          </div>

          {/* Botões Rápidos */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSelectTop10}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Top 10 Históricas
            </button>
            <button
              onClick={handleSelectRandom12}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              12 Dezenas Aleatórias
            </button>
            <button
              onClick={() => setSelectedPool([1, 2, 3, 4, 5, 6, 7])}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
            >
              Redefinir
            </button>
          </div>
        </div>

        {/* Grade de 01 a 60 (ou 01 a 50) */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
          {Array.from({ length: maxLimit }, (_, i) => i + 1).map(num => {
            const isSelected = selectedPool.includes(num);
            return (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                className={`h-10 sm:h-11 rounded-xl font-mono font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center border ${
                  isSelected
                    ? isMaisMilionaria
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md scale-105'
                      : 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {num.toString().padStart(2, '0')}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Seleção da Garantia Matemática */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <span>2. Selecione a Garantia Matemática Desejada</span>
          </h3>
          <p className="text-xs text-slate-500">
            Quanto mais econômica a garantia, menos bilhetes você precisará registrar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map(plan => {
            const isSelected = guarantee === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setGuarantee(plan.id)}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-2 relative ${
                  isSelected
                    ? isMaisMilionaria
                      ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
                      : 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400/40 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                }`}
              >
                {plan.recommended && (
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider">
                    Recomendado
                  </span>
                )}
                <div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    plan.targetGuarantee === 'Sena' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    Garante {plan.targetGuarantee}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-2">{plan.shortLabel}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{plan.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Comparativo de Investimento e Economia */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-7 shadow-md space-y-4 border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-700/80 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Economia Financeira Comprovada
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
              Fechamento Econômico ({wheelResult.gamesCount} Jogos) vs Aposta Múltipla Caixa
            </h3>
          </div>

          {onSaveBatchBets && wheelResult.gamesCount > 0 && (
            <button
              onClick={handleSaveAllGames}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Save size={15} />
              <span>Salvar Todos os {wheelResult.gamesCount} Jogos na Carteira</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Aposta Múltipla Oficial Caixa</span>
            <span className="text-xl font-black text-rose-400">{formatBRL(wheelResult.officialMultipleCost)}</span>
            <span className="text-[10px] text-slate-400 block">Exige bilhete único especial da Caixa</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 border border-emerald-500/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Fechamento Inteligente Reduzido</span>
            <span className="text-xl font-black text-emerald-400">{formatBRL(wheelResult.economicWheelCost)}</span>
            <span className="text-[10px] text-emerald-200 block">{wheelResult.gamesCount} apostas simples de 6 dezenas</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">Você Economiza:</span>
            <span className="text-2xl font-black text-white">{formatBRL(wheelResult.savingsAmount)}</span>
            <span className="text-xs font-bold text-emerald-300 block">
              Economia de {wheelResult.savingsPercent}% no seu bolso!
            </span>
          </div>
        </div>
      </div>

      {/* 4. Testador de Eficácia do Fechamento */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Play size={18} className="text-emerald-600" />
              <span>3. Testar Desempenho do Fechamento</span>
            </h3>
            <p className="text-xs text-slate-500">
              Confira quantos acertos este fechamento teria conquistado contra o último concurso ou um sorteio personalizado.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTestMode(testMode === 'latest' ? null : 'latest')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                testMode === 'latest'
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
              }`}
            >
              Testar com Último Sorteio Oficial #{latestDraw?.contestNumber}
            </button>
            <button
              onClick={() => setTestMode(testMode === 'custom' ? null : 'custom')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                testMode === 'custom'
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
              }`}
            >
              Informar 6 Dezenas
            </button>
          </div>
        </div>

        {testMode === 'custom' && (
          <div className="max-w-md space-y-1">
            <input
              type="text"
              value={customTestInput}
              onChange={e => setCustomTestInput(e.target.value)}
              placeholder="ex: 05, 12, 14, 25, 41, 50"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-slate-400">Informe 6 dezenas para simular</span>
          </div>
        )}

        {testOutcome && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <span className="text-xs font-black text-slate-800">
                Resultado do Teste no Fechamento:
              </span>
              <span className="text-xs font-bold text-emerald-800">
                {testOutcome.totalPrized} bilhete(s) premiado(s)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">{isLotofacil ? '15 Acertos' : 'Senas (6)'}</span>
                <span className="text-lg font-black text-amber-600 block">{testOutcome.senaCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">{isLotofacil ? '14 Acertos' : 'Quinas (5)'}</span>
                <span className="text-lg font-black text-emerald-600 block">{testOutcome.quinaCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">{isLotofacil ? '13 Acertos' : 'Quadras (4)'}</span>
                <span className="text-lg font-black text-teal-600 block">{testOutcome.quadraCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">{isLotofacil ? '12/11 Acertos' : 'Ternos (3)'}</span>
                <span className="text-lg font-black text-slate-700 block">{testOutcome.ternoCount + (testOutcome.elevenCount || 0)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Lista de Bilhetes Gerados pelo Fechamento */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-black text-slate-900">
            Bilhetes do Fechamento ({wheelResult.gamesCount} combinações)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Preço total: {formatBRL(wheelResult.economicWheelCost)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {wheelResult.games.map((game, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
            >
              <span className="text-xs font-black text-slate-500 font-mono">
                #{idx + 1}
              </span>
              <div className="flex flex-wrap gap-1">
                {game.map(num => (
                  <span 
                    key={num}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-black text-xs flex items-center justify-center shadow-2xs"
                  >
                    {num.toString().padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WheelingSimulatorView;
