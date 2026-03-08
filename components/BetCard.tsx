
import React from 'react';
import { Bet } from '../types';
import NumberBall from './NumberBall';
import { Trash2, Share2, Calendar, ExternalLink, Activity, CheckCircle2, AlertCircle, Calculator, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface BetCardProps {
  bet: Bet;
  onDelete: (id: string) => void;
  onAnalyze: (id: string) => Promise<void>;
  isAnalyzing: boolean;
}

const BetCard: React.FC<BetCardProps> = ({ bet, onDelete, onAnalyze, isAnalyzing }) => {
  const handleShare = () => {
    const text = `Aposta Mega Sena: ${bet.numbers.join(', ')} (Soma: ${bet.sum}). Gerado pelo Mega Sorte AI!`;
    if (navigator.share) {
      navigator.share({ title: 'Minha Aposta', text }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert('Copiado!');
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const date = new Date(bet.createdAt).toLocaleDateString('pt-BR');
    
    doc.setFontSize(22);
    doc.setTextColor(32, 152, 105);
    doc.text('Mega Sorte - Sua Aposta', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Data: ${date}`, 20, 30);
    doc.text(`Tipo: ${bet.type.toUpperCase()}`, 20, 37);
    
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Números Sorteados:', 20, 55);
    doc.text(bet.numbers.join(' - '), 20, 65);
    
    doc.setFontSize(12);
    doc.text(`Soma Total: ${bet.sum} (${bet.sumStatus === 'ideal' ? 'Média Ideal' : 'Fora da Média'})`, 20, 80);
    
    if (bet.reasoning) {
      doc.setFontSize(10);
      doc.text('Análise:', 20, 95);
      const splitReason = doc.splitTextToSize(bet.reasoning, 170);
      doc.text(splitReason, 20, 102);
    }
    
    doc.save(`aposta-mega-sena-${bet.id}.pdf`);
  };

  const getSumBadge = () => {
    switch(bet.sumStatus) {
      case 'ideal': return { color: 'bg-emerald-100 text-emerald-700', label: 'Média Ideal' };
      case 'high': return { color: 'bg-amber-100 text-amber-700', label: 'Soma Alta' };
      case 'low': return { color: 'bg-blue-100 text-blue-700', label: 'Soma Baixa' };
      default: return { color: 'bg-gray-100 text-gray-700', label: 'Soma' };
    }
  };

  const sumBadge = getSumBadge();

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-5 mb-4 hover:shadow-xl transition-shadow flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2 text-emerald-600">
          <Calendar size={14} />
          <span className="text-[10px] font-medium">
            {new Date(bet.createdAt).toLocaleDateString('pt-BR')}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider ${
            bet.type === 'ai' ? 'bg-purple-100 text-purple-700' : 
            bet.type === 'random' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {bet.type === 'ai' ? 'IA' : bet.type}
          </span>
        </div>
        <div className="flex space-x-1">
          <button onClick={downloadPDF} className="p-1.5 text-gray-400 hover:text-emerald-600" title="Baixar PDF">
            <FileDown size={16} />
          </button>
          <button onClick={handleShare} className="p-1.5 text-gray-400 hover:text-emerald-600" title="Compartilhar">
            <Share2 size={16} />
          </button>
          <button onClick={() => onDelete(bet.id)} className="p-1.5 text-gray-400 hover:text-red-600" title="Excluir">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {bet.numbers.map((n) => (
          <NumberBall key={n} num={n} size="sm" isSelected />
        ))}
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg ${sumBadge.color}`}>
          <Calculator size={14} />
          <span className="text-xs font-bold">Soma: {bet.sum}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase ${sumBadge.color.replace('bg-', 'text-')}`}>
          {sumBadge.label}
        </span>
      </div>

      <div className="flex-grow">
        {bet.reasoning && (
          <p className="text-[10px] text-gray-600 italic leading-relaxed mb-3">
            "{bet.reasoning}"
          </p>
        )}
      </div>

      {!bet.analysis ? (
        <button 
          onClick={() => onAnalyze(bet.id)}
          disabled={isAnalyzing}
          className="mt-2 w-full flex items-center justify-center space-x-2 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold hover:bg-emerald-100 disabled:opacity-50"
        >
          {isAnalyzing ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-700"></div> : <Activity size={12} />}
          <span>VERIFICAR HISTÓRICO</span>
        </button>
      ) : (
        <div className="mt-4 pt-4 border-t border-emerald-50">
          <div className="grid grid-cols-4 gap-1 text-center mb-2">
            {[
              { label: 'S', val: bet.analysis.matchCounts.sena, c: 'text-yellow-600' },
              { label: 'Q', val: bet.analysis.matchCounts.quina, c: 'text-blue-600' },
              { label: '4', val: bet.analysis.matchCounts.quadra, c: 'text-emerald-600' },
              { label: '3', val: bet.analysis.matchCounts.terno, c: 'text-purple-600' }
            ].map(i => (
              <div key={i.label} className="bg-gray-50 rounded p-1">
                <p className="text-[8px] text-gray-400 font-bold">{i.label}</p>
                <p className={`text-xs font-black ${i.c}`}>{i.val}</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-gray-500 italic leading-tight">"{bet.analysis.details}"</p>
        </div>
      )}
    </div>
  );
};

export default BetCard;
