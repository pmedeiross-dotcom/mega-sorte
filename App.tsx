
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, Dice5, RotateCcw, Save, Trash2, ListChecks, History, Info, Filter, ArrowUpDown, Activity, FileJson, Layers, FileText, Upload, CheckCircle } from 'lucide-react';
import { generateLuckyNumbersWithAI, analyzeBetHistory, generateBatchLuckyNumbersWithAI } from './services/geminiService';
import { Bet } from './types';
import NumberBall from './components/NumberBall';
import BetCard from './components/BetCard';
import { jsPDF } from 'jspdf';

const STORAGE_KEY = 'mega_sorte_bets';

const App: React.FC = () => {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betCount, setBetCount] = useState<number>(6);
  const [history, setHistory] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Carregar histórico ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { console.error("Erro ao carregar localStorage:", e); }
    }
  }, []);

  // Salvar automaticamente sempre que o histórico mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const calculateSumData = (nums: number[]) => {
    const sum = nums.reduce((a, b) => a + b, 0);
    let sumStatus: Bet['sumStatus'] = 'ideal';
    if (sum < 150) sumStatus = 'low';
    if (sum > 210) sumStatus = 'high';
    return { sum, sumStatus };
  };

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(prev => prev.filter(n => n !== num));
    } else {
      if (selectedNumbers.length < 20) {
        setSelectedNumbers(prev => [...prev, num].sort((a, b) => a - b));
      } else {
        alert("Máximo 20 números.");
      }
    }
  };

  const saveBet = (type: Bet['type'], numbers: number[], reasoning?: string, groundingUrls?: Bet['groundingUrls']) => {
    const { sum, sumStatus } = calculateSumData(numbers);
    const newBet: Bet = {
      id: Math.random().toString(36).substr(2, 9),
      numbers: [...numbers].sort((a, b) => a - b),
      createdAt: Date.now(),
      type,
      reasoning,
      groundingUrls,
      sum,
      sumStatus
    };
    setHistory(prev => [newBet, ...prev]);
  };

  const handleManualSave = () => {
    if (selectedNumbers.length < 6) return;
    saveBet('manual', selectedNumbers);
    setSelectedNumbers([]);
    alert("Jogo salvo no histórico permanente do seu navegador!");
  };

  const generateSurpresinha = () => {
    const numbers: number[] = [];
    while (numbers.length < betCount) {
      const r = Math.floor(Math.random() * 60) + 1;
      if (!numbers.includes(r)) numbers.push(r);
    }
    const sorted = numbers.sort((a, b) => a - b);
    saveBet('random', sorted);
    setShowHistory(true);
  };

  const generateBatchAI = async () => {
    setIsBatchLoading(true);
    try {
      const result = await generateBatchLuckyNumbersWithAI();
      result.games.forEach(game => {
        saveBet('ai', game.numbers, game.reasoning, result.groundingUrls);
      });
      setShowHistory(true);
    } catch (error) {
      alert("Erro ao gerar combo de IA. Verifique sua conexão.");
    } finally {
      setIsBatchLoading(false);
    }
  };

  const exportHistory = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `mega_sorte_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          // Mesclar dados sem duplicar IDs
          setHistory(prev => {
            const existingIds = new Set(prev.map(b => b.id));
            const newData = importedData.filter(b => !existingIds.has(b.id));
            return [...newData, ...prev];
          });
          alert(`${importedData.length} apostas importadas com sucesso!`);
        }
      } catch (err) {
        alert("Erro ao ler o arquivo de backup. Verifique se o formato está correto.");
      }
    };
    reader.readAsText(file);
    // Limpar o input para permitir importar o mesmo arquivo novamente se necessário
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadFullHistoryPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('pt-BR');
    
    doc.setFontSize(22);
    doc.setTextColor(32, 152, 105);
    doc.text('Relatório de Apostas - Mega Sorte', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${now} • Total de jogos: ${filteredHistory.length}`, 20, 28);
    
    let y = 40;
    filteredHistory.forEach((bet, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text(`Jogo #${filteredHistory.length - index} (${bet.type.toUpperCase()}) - ${new Date(bet.createdAt).toLocaleDateString('pt-BR')}`, 20, y);
      
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text(bet.numbers.join(' - '), 20, y);
      
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Soma: ${bet.sum} | Status: ${bet.sumStatus === 'ideal' ? 'Média Ideal' : 'Fora da Média'}`, 20, y);
      
      if (bet.reasoning) {
        y += 6;
        const splitReason = doc.splitTextToSize(`Análise: ${bet.reasoning}`, 170);
        doc.text(splitReason, 20, y);
        y += (splitReason.length * 5);
      }
      
      y += 10;
      doc.setDrawColor(230);
      doc.line(20, y - 5, 190, y - 5);
    });
    
    doc.save(`historico-completo-mega-sena.pdf`);
  };

  const generateAI = async () => {
    setIsLoading(true);
    setLoadingStatus("Buscando maior percentual...");
    try {
      const result = await generateLuckyNumbersWithAI(betCount);
      saveBet('ai', result.numbers, result.reasoning, result.groundingUrls);
      setShowHistory(true);
    } catch (error) {
      alert("Erro na IA.");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  const handleAnalyzeBet = async (id: string) => {
    const bet = history.find(b => b.id === id);
    if (!bet) return;
    setAnalyzingId(id);
    try {
      const result = await analyzeBetHistory(bet.numbers);
      setHistory(prev => prev.map(b => b.id === id ? { ...b, analysis: result } : b));
    } catch (e) {
      alert("Erro ao consultar dados.");
    } finally {
      setAnalyzingId(null);
    }
  };

  const filteredHistory = useMemo(() => {
    let result = [...history];
    if (filterType !== 'all') result = result.filter(b => b.type === filterType);
    const now = Date.now();
    const day = 86400000;
    if (dateRange === 'today') result = result.filter(b => now - b.createdAt < day);
    if (dateRange === 'week') result = result.filter(b => now - b.createdAt < day * 7);
    result.sort((a, b) => sortOrder === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
    return result;
  }, [history, filterType, dateRange, sortOrder]);

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg text-white">
            <Sparkles size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-emerald-900 leading-tight">Mega Sorte</h1>
            <div className="flex items-center text-emerald-700 text-[10px] font-bold uppercase tracking-tighter">
              <CheckCircle size={10} className="mr-1 text-emerald-500" />
              Sincronizado Localmente
            </div>
          </div>
        </div>

        <nav className="flex items-center space-x-2 bg-white p-1 rounded-full shadow-sm border border-emerald-100">
          <button onClick={() => setShowHistory(false)} className={`px-4 py-2 rounded-full text-xs font-black transition-all ${!showHistory ? 'bg-emerald-600 text-white' : 'text-emerald-800'}`}>
            <ListChecks size={16} className="inline mr-1" /> JOGAR
          </button>
          <button onClick={() => setShowHistory(true)} className={`px-4 py-2 rounded-full text-xs font-black transition-all ${showHistory ? 'bg-emerald-600 text-white' : 'text-emerald-800'}`}>
            <History size={16} className="inline mr-1" /> HISTÓRICO ({history.length})
          </button>
        </nav>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        {!showHistory ? (
          <>
            <div className="lg:col-span-8 bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-emerald-50 no-print">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-emerald-900">Monte seu Jogo</h2>
                <select value={betCount} onChange={(e) => setBetCount(Number(e.target.value))} className="bg-emerald-50 text-emerald-800 text-xs font-bold p-2 rounded-lg outline-none">
                  {[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(n => (
                    <option key={n} value={n}>{n} dezenas</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-8">
                {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => (
                  <NumberBall key={num} num={num} isSelected={selectedNumbers.includes(num)} onClick={() => toggleNumber(num)} />
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleManualSave} disabled={selectedNumbers.length < 6} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2">
                  <Save size={20} /> <span>SALVAR NO HISTÓRICO</span>
                </button>
                <button onClick={() => setSelectedNumbers([])} className="bg-emerald-50 text-emerald-700 px-6 rounded-2xl font-bold hover:bg-emerald-100 border border-emerald-100">
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6 no-print">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-lg font-black mb-2 flex items-center"><Sparkles className="mr-2" size={20} /> Mega IA +</h3>
                  <p className="text-emerald-100 text-[10px] mb-6 leading-relaxed">
                    A IA analisa a <strong>Zona de Ouro</strong> para gerar jogos estatisticamente superiores que ficam salvos para você.
                  </p>
                  <button onClick={generateAI} disabled={isLoading || isBatchLoading} className="w-full bg-white text-emerald-700 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all flex flex-col items-center justify-center disabled:opacity-70">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-700 mb-1"></div>
                        <span className="text-[9px] uppercase font-bold">{loadingStatus}</span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2"><Sparkles size={20} /> <span>GERAR NA ZONA DE OURO</span></div>
                        <span className="text-[8px] text-emerald-600/70 font-black">SALVAMENTO AUTOMÁTICO</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-lg space-y-3">
                <h3 className="text-sm font-black text-emerald-900 mb-2 flex items-center"><Dice5 className="mr-2 text-emerald-600" size={18} /> Geração Combo</h3>
                <button onClick={generateBatchAI} disabled={isLoading || isBatchLoading} className="w-full bg-emerald-100 text-emerald-800 py-3 rounded-2xl font-black hover:bg-emerald-200 border border-emerald-200 flex flex-col items-center justify-center space-y-1 transition-all disabled:opacity-50">
                  {isBatchLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-800"></div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2"><Layers size={18} /> <span>GERAR 5 JOGOS COM IA</span></div>
                      <span className="text-[8px] opacity-70">SÃO GRAVADOS AUTOMATICAMENTE</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-emerald-900 rounded-3xl p-5 text-white shadow-lg">
                <h4 className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">
                   Backup & Portabilidade
                </h4>
                <p className="text-[9px] text-emerald-100 leading-relaxed italic">
                  Seus jogos ficam salvos neste navegador. Para acessá-los em outro dispositivo, use o botão "JSON" no histórico para exportar e depois "IMPORTAR".
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="lg:col-span-12 bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-emerald-50">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print border-b border-emerald-50 pb-6">
              <div className="flex items-center space-x-3">
                <History className="text-emerald-600" size={24} />
                <h2 className="text-2xl font-black text-emerald-900">Seu Histórico Permanente</h2>
              </div>
              <div className="flex flex-wrap gap-2 items-center justify-center md:justify-end">
                <button 
                  onClick={downloadFullHistoryPDF}
                  disabled={filteredHistory.length === 0}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center space-x-1 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <FileText size={14} /> <span>PDF COMPLETO</span>
                </button>
                
                <button onClick={exportHistory} className="bg-white border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-[10px] font-black flex items-center space-x-1 hover:bg-emerald-50 transition-colors">
                  <FileJson size={14} /> <span>EXPORTAR</span>
                </button>

                <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-[10px] font-black flex items-center space-x-1 hover:bg-emerald-50 transition-colors">
                  <Upload size={14} /> <span>IMPORTAR</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={importHistory} accept=".json" className="hidden" />

                <button onClick={() => { if(confirm("Deseja limpar todo o histórico local?")) setHistory([]) }} className="text-red-500 font-black text-[10px] uppercase hover:underline flex items-center space-x-1 ml-2">
                  <Trash2 size={14} /> <span>LIMPAR TUDO</span>
                </button>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-200 no-print mt-6">
                <p className="text-emerald-600 font-bold text-sm">O histórico está vazio. Gere ou importe jogos!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-8 max-w-3xl mx-auto">
                {filteredHistory.map((bet) => (
                  <div key={bet.id} className="w-full">
                    <BetCard 
                      bet={bet} 
                      onDelete={(id) => setHistory(h => h.filter(x => x.id !== id))} 
                      onAnalyze={handleAnalyzeBet} 
                      isAnalyzing={analyzingId === bet.id} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-auto py-10 text-center no-print">
        <p className="text-emerald-900/40 text-[9px] font-black uppercase tracking-widest mb-2">
          Mega Sorte AI • Armazenamento Local Permanente • 2024
        </p>
      </footer>
    </div>
  );
};

export default App;
