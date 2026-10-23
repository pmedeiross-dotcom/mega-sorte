
import React, { useState } from 'react';
import { Bet } from '../types';
import NumberBall from './NumberBall';
import { Trash2, Share2, Calendar, Activity, Calculator, FileDown, Copy, Check, Award, Cloud } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface BetCardProps {
  bet: Bet;
  drawnNumbers?: number[];
  onDelete: (id: string) => void;
  onAnalyze: (id: string) => Promise<void>;
  isAnalyzing: boolean;
}

const BetCard: React.FC<BetCardProps> = ({ bet, drawnNumbers, onDelete, onAnalyze, isAnalyzing }) => {
  const [copied, setCopied] = useState(false);

  // Contagem de acertos se houver sorteio selecionado
  const hitsCount = drawnNumbers && drawnNumbers.length > 0
    ? bet.numbers.filter(n => drawnNumbers.includes(n)).length
    : 0;

  const handleCopy = () => {
    const text = bet.numbers.map(n => n.toString().padStart(2, '0')).join(' - ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const text = `Aposta Mega-Sena: ${bet.numbers.map(n => n.toString().padStart(2, '0')).join(' - ')} (Soma: ${bet.sum}). Gerado no Mega Sorte!`;
    if (navigator.share) {
      navigator.share({ title: 'Minha Aposta da Mega-Sena', text }).catch(console.error);
    } else {
      handleCopy();
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const date = new Date(bet.createdAt).toLocaleDateString('pt-BR');
    
    doc.setFontSize(22);
    doc.setTextColor(32, 152, 105);
    doc.text('Mega Sorte - Cartão de Jogo', 20, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Data do Jogo: ${date}`, 20, 30);
    doc.text(`Modalidade: ${bet.type.toUpperCase()}`, 20, 37);
    
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Dezenas Marcadas:', 20, 52);
    doc.text(bet.numbers.map(n => n.toString().padStart(2, '0')).join('  -  '), 20, 62);
    
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Soma Total das Dezenas: ${bet.sum} (${bet.sumStatus === 'ideal' ? 'Média Ideal' : 'Fora da Média'})`, 20, 78);
    
    if (bet.reasoning) {
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text('Fundamento Estatístico:', 20, 92);
      const splitReason = doc.splitTextToSize(bet.reasoning, 170);
      doc.text(splitReason, 20, 99);
    }
    
    doc.save(`aposta-mega-sena-${bet.id}.pdf`);
  };

  const getSumBadge = () => {
    switch(bet.sumStatus) {
      case 'ideal': return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Faixa Ideal' };
      case 'high': return { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Soma Alta' };
      case 'low': return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Soma Baixa' };
      default: return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Soma' };
    }
  };

  const getTypeBadge = () => {
    switch(bet.type) {
      case 'ai': return { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'IA Estatística' };
      case 'smart_rules': return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Regras Rápidas' };
      case 'random': return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Surpresinha' };
      default: return { color: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Manual' };
    }
  };

  const sumBadge = getSumBadge();
  const typeBadge = getTypeBadge();

  // Par/ímpar
  const evenCount = bet.numbers.filter(n => n % 2 === 0).length;
  const oddCount = bet.numbers.length - evenCount;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-5 mb-4 hover:shadow-md transition-all flex flex-col h-full ${
      hitsCount >= 4 ? 'border-amber-400 ring-2 ring-amber-300/40 bg-gradient-to-b from-amber-50/40 to-white' : 'border-emerald-100'
    }`}>
      {/* Cabeçalho do Card */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <div className="flex items-center space-x-2 text-emerald-700">
          <Calendar size={13} className="text-emerald-500" />
          <span className="text-[11px] font-semibold">
            {new Date(bet.createdAt).toLocaleDateString('pt-BR')}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeBadge.color}`}>
            {typeBadge.label}
          </span>
          {bet.isCloudSynced && (
            <span 
              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200"
              title="Salvo na nuvem do Google Firestore. Acessível em qualquer navegador."
            >
              <Cloud size={10} />
              <span>Nuvem</span>
            </span>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center space-x-1">
          <button 
            type="button" 
            onClick={handleCopy} 
            className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" 
            title="Copiar dezenas"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          </button>
          <button 
            type="button" 
            onClick={downloadPDF} 
            className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" 
            title="Baixar PDF"
          >
            <FileDown size={16} />
          </button>
          <button 
            type="button" 
            onClick={handleShare} 
            className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" 
            title="Compartilhar"
          >
            <Share2 size={16} />
          </button>
          <button 
            type="button" 
            onClick={() => onDelete(bet.id)} 
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
            title="Excluir aposta"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Destaque de Acertos se houver conferência */}
      {drawnNumbers && drawnNumbers.length > 0 && (
        <div className="mb-3">
          {hitsCount >= 6 ? (
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-black text-xs px-3 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
              <span className="flex items-center"><Award className="mr-1.5" size={16} /> MEGA SENA! 6 ACERTOS!</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md">PREMIADO</span>
            </div>
          ) : hitsCount === 5 ? (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs px-3 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
              <span className="flex items-center"><Award className="mr-1.5" size={16} /> QUINA! 5 ACERTOS!</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md">PREMIADO</span>
            </div>
          ) : hitsCount === 4 ? (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs px-3 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
              <span className="flex items-center"><Award className="mr-1.5" size={16} /> QUADRA! 4 ACERTOS!</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md">PREMIADO</span>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-medium px-3 py-1 rounded-xl flex items-center justify-between">
              <span>{hitsCount} {hitsCount === 1 ? 'acerto' : 'acertos'} no sorteio</span>
              <span className="text-[10px] text-gray-400">Sem premiação</span>
            </div>
          )}
        </div>
      )}

      {/* Dezenas */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3.5">
        {bet.numbers.map((n) => (
          <NumberBall 
            key={n} 
            num={n} 
            size="sm" 
            isSelected 
            isHit={drawnNumbers?.includes(n)} 
          />
        ))}
      </div>

      {/* Métricas estatísticas da aposta */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${sumBadge.color}`}>
          <Calculator size={13} />
          <span>Soma: {bet.sum}</span>
          <span className="text-[10px] opacity-75">({sumBadge.label})</span>
        </div>

        <div className="px-2.5 py-1 rounded-lg border border-emerald-100 bg-emerald-50/70 text-emerald-800 text-[11px] font-bold">
          {evenCount}P / {oddCount}I
        </div>

        <div className="px-2 py-1 rounded-lg bg-gray-50 text-gray-600 text-[11px] font-medium">
          {bet.numbers.length} dezenas
        </div>
      </div>

      {/* Badges da Análise Avançada e Métricas Matemáticas */}
      {bet.advancedMetrics && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px]">
          {bet.advancedMetrics.strategyUsed && (
            <span className={`px-2 py-0.5 rounded-md font-black border ${
              bet.advancedMetrics.strategyUsed === 'momentum' 
                ? 'bg-orange-50 text-orange-900 border-orange-300' 
                : bet.advancedMetrics.strategyUsed === 'cycle_delay'
                ? 'bg-blue-50 text-blue-900 border-blue-300'
                : bet.advancedMetrics.strategyUsed === 'cooccurrence'
                ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                : bet.advancedMetrics.strategyUsed === 'entropy_shannon'
                ? 'bg-purple-50 text-purple-900 border-purple-300'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
            }`}>
              {bet.advancedMetrics.strategyUsed === 'momentum' && '🔥 Momentum'}
              {bet.advancedMetrics.strategyUsed === 'cycle_delay' && '⏳ Pressão/Ciclo'}
              {bet.advancedMetrics.strategyUsed === 'cooccurrence' && '🔗 Alta Afinidade'}
              {bet.advancedMetrics.strategyUsed === 'entropy_shannon' && '🎲 Shannon'}
              {bet.advancedMetrics.strategyUsed === 'balanced' && '🎯 Padrão Ouro'}
            </span>
          )}
          {bet.advancedMetrics.duqueName && (
            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
              ✨ {bet.advancedMetrics.duqueName}
            </span>
          )}
          {bet.advancedMetrics.shannonEntropy !== undefined && (
            <span className="bg-violet-50 text-violet-800 border border-violet-200 px-2 py-0.5 rounded-md font-semibold">
              H: {bet.advancedMetrics.shannonEntropy} bits ({bet.advancedMetrics.entropyLabel || 'Ideal'})
            </span>
          )}
          {bet.advancedMetrics.hasHighPressureDezena && (
            <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md font-bold">
              ⚡ Pressão Z &gt; 1.35
            </span>
          )}
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
            Primos: {bet.advancedMetrics.primesCount}
          </span>
          <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md font-semibold">
            Moldura: {bet.advancedMetrics.frameCount} / Centro: {bet.advancedMetrics.centerCount}
          </span>
          {bet.advancedMetrics.paretoCount > 0 && (
            <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md font-semibold">
              Pareto: {bet.advancedMetrics.paretoCount}
            </span>
          )}
          {bet.advancedMetrics.cycleMissingCount > 0 && (
            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md font-semibold">
              Ciclo: {bet.advancedMetrics.cycleMissingCount}
            </span>
          )}
          {bet.advancedMetrics.chiSquareConformity !== undefined && (
            <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md font-semibold">
              χ²: {bet.advancedMetrics.chiSquareConformity}%
            </span>
          )}
          {bet.advancedMetrics.advancedScore !== undefined && (
            <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-bold ml-auto">
              {bet.advancedMetrics.advancedScore}% Analítico
            </span>
          )}
        </div>
      )}

      {/* Justificativa / Fundamento */}
      <div className="flex-grow">
        {bet.reasoning && (
          <p className="text-[11px] text-gray-600 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100 leading-relaxed mb-3">
            {bet.reasoning}
          </p>
        )}
      </div>

      {/* Histórico Histórico / Análise IA */}
      {!bet.analysis ? (
        <button 
          type="button"
          onClick={() => onAnalyze(bet.id)}
          disabled={isAnalyzing}
          className="mt-2 w-full flex items-center justify-center space-x-2 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {isAnalyzing ? (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-emerald-700"></div>
          ) : (
            <Activity size={14} className="text-emerald-600" />
          )}
          <span>VERIFICAR HISTÓRICO DE PREMIAÇÃO</span>
        </button>
      ) : (
        <div className="mt-3 pt-3 border-t border-emerald-100">
          <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
            {[
              { label: 'Sena', val: bet.analysis.matchCounts.sena, c: 'text-amber-700 bg-amber-50 border-amber-200' },
              { label: 'Quina', val: bet.analysis.matchCounts.quina, c: 'text-blue-700 bg-blue-50 border-blue-200' },
              { label: 'Quadra', val: bet.analysis.matchCounts.quadra, c: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              { label: 'Terno', val: bet.analysis.matchCounts.terno, c: 'text-purple-700 bg-purple-50 border-purple-200' }
            ].map(i => (
              <div key={i.label} className={`rounded-lg p-1.5 border ${i.c}`}>
                <p className="text-[9px] font-bold uppercase tracking-tight">{i.label}</p>
                <p className="text-sm font-black">{i.val}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 italic leading-snug">"{bet.analysis.details}"</p>
        </div>
      )}
    </div>
  );
};

export default BetCard;

