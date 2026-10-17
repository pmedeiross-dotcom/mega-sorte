import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  Dice5, 
  RotateCcw, 
  Save, 
  Trash2, 
  ListChecks, 
  History, 
  Info, 
  Filter, 
  ArrowUpDown, 
  Activity, 
  FileJson, 
  Layers, 
  FileText, 
  Upload, 
  CheckCircle,
  Zap,
  Search,
  Check,
  Copy,
  Award,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Eye,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { generateLuckyNumbersWithAI, analyzeBetHistory, generateBatchLuckyNumbersWithAI } from './services/geminiService';
import { Bet, GeneratorLogic } from './types';
import { validateGameAgainstRules, generateGameWithRules } from './utils/lotteryRules';
import NumberBall from './components/NumberBall';
import BetCard from './components/BetCard';
import FrequencyChart from './components/FrequencyChart';
import { jsPDF } from 'jspdf';

const STORAGE_KEY = 'mega_sorte_bets';
const LOGIC_KEY = 'mega_sorte_logic';
const DEFAULT_REFERENCE_DRAW = [5, 12, 26, 33, 44, 58]; // Concurso recente de referência

const App: React.FC = () => {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betCount, setBetCount] = useState<number>(6);
  const [history, setHistory] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [activeTab, setActiveTab] = useState<'play' | 'history' | 'checker'>('play');
  
  // Toast de feedback não intrusivo
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  // Lógica de regras estatísticas selecionáveis pelo usuário
  const [logicOptions, setLogicOptions] = useState<GeneratorLogic>(() => {
    const saved = localStorage.getItem(LOGIC_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { /* fallback */ }
    }
    return {
      repeat1to2: true,
      balanceEvenOdd: true,
      sum160to240: true,
      spreadDistribution: true,
      concentrate20to50: true,
      max2Consecutive: true,
      max2IdenticalEndings: true
    };
  });

  // Sorteio de referência para conferência e repetição
  const [referenceDraw, setReferenceDraw] = useState<number[]>(DEFAULT_REFERENCE_DRAW);
  const [isCustomizingRef, setIsCustomizingRef] = useState(false);
  const [tempRefInput, setTempRefInput] = useState(DEFAULT_REFERENCE_DRAW.join(', '));

  // Filtros de histórico
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'sum_desc' | 'sum_asc'>('newest');
  const [onlyPrizes, setOnlyPrizes] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mostrar toast
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Carregar histórico inicial
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { 
        console.error("Erro ao carregar histórico:", e); 
      }
    }
  }, []);

  // Salvar histórico e regras
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(LOGIC_KEY, JSON.stringify(logicOptions));
  }, [logicOptions]);

  const calculateSumData = (nums: number[]) => {
    const sum = nums.reduce((a, b) => a + b, 0);
    const minIdeal = logicOptions.sum160to240 ? 160 : 150;
    const maxIdeal = logicOptions.sum160to240 ? 240 : 210;
    
    let sumStatus: Bet['sumStatus'] = 'ideal';
    if (sum < minIdeal) sumStatus = 'low';
    if (sum > maxIdeal) sumStatus = 'high';
    return { sum, sumStatus };
  };

  // Diagnóstico em tempo real da seleção atual na cartela
  const currentValidation = useMemo(() => {
    return validateGameAgainstRules(selectedNumbers, logicOptions, referenceDraw);
  }, [selectedNumbers, logicOptions, referenceDraw]);

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(prev => prev.filter(n => n !== num));
    } else {
      if (selectedNumbers.length < betCount) {
        setSelectedNumbers(prev => [...prev, num].sort((a, b) => a - b));
      } else {
        showToast(`Limite de ${betCount} dezenas atingido para este bilhete.`, 'info');
      }
    }
  };

  const saveBet = (type: Bet['type'], numbers: number[], reasoning?: string, groundingUrls?: Bet['groundingUrls']) => {
    const { sum, sumStatus } = calculateSumData(numbers);
    const newBet: Bet = {
      id: Math.random().toString(36).substring(2, 11),
      numbers: [...numbers].sort((a, b) => a - b),
      createdAt: Date.now(),
      type,
      reasoning,
      groundingUrls,
      sum,
      sumStatus
    };
    setHistory(prev => [newBet, ...prev]);
    return newBet;
  };

  const handleManualSave = () => {
    if (selectedNumbers.length < 6) {
      showToast("Selecione pelo menos 6 dezenas para salvar.", 'error');
      return;
    }
    const reason = `Aposta montada manualmente na cartela (${selectedNumbers.length} dezenas).`;
    saveBet('manual', selectedNumbers, reason);
    setSelectedNumbers([]);
    showToast("Aposta salva com sucesso no histórico permanente!");
  };

  // Preencher cartela com as regras ativas instantaneamente
  const handleFillBoardWithRules = () => {
    const result = generateGameWithRules(betCount, logicOptions, referenceDraw);
    setSelectedNumbers(result.numbers);
    showToast(result.passedAllRules 
      ? "Cartela preenchida atendendo 100% das regras ativas!" 
      : "Cartela preenchida com otimização estatística máxima!", 'success');
  };

  // Gerador rápido com regras (salva direto no histórico)
  const handleQuickRuleGenerate = () => {
    const result = generateGameWithRules(betCount, logicOptions, referenceDraw);
    saveBet('smart_rules', result.numbers, result.reasoning);
    setSelectedNumbers(result.numbers);
    showToast(`Jogo gerado e salvo (${result.numbers.join(' - ')})!`);
  };

  // Surpresinha clássica pura
  const generateSurpresinha = () => {
    const numbers: number[] = [];
    while (numbers.length < betCount) {
      const r = Math.floor(Math.random() * 60) + 1;
      if (!numbers.includes(r)) numbers.push(r);
    }
    const sorted = numbers.sort((a, b) => a - b);
    setSelectedNumbers(sorted);
    saveBet('random', sorted, "Surpresinha aleatória sem filtros estatísticos.");
    showToast("Surpresinha gerada e registrada no histórico!");
  };

  // Gerador com IA
  const generateAI = async () => {
    setIsLoading(true);
    setLoadingStatus("Analisando Zona de Ouro e Estatísticas...");
    try {
      const result = await generateLuckyNumbersWithAI(betCount, logicOptions);
      setSelectedNumbers(result.numbers);
      saveBet('ai', result.numbers, result.reasoning, result.groundingUrls);
      showToast("Jogo gerado com Inteligência Artificial e salvo!");
    } catch (error) {
      // Fallback local garantido
      const fallback = generateGameWithRules(betCount, logicOptions, referenceDraw);
      setSelectedNumbers(fallback.numbers);
      saveBet('smart_rules', fallback.numbers, fallback.reasoning);
      showToast("Jogo gerado com sucesso via motor estatístico local!");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  // Gerar combo de 5 jogos com IA
  const generateBatchAI = async () => {
    setIsBatchLoading(true);
    try {
      const result = await generateBatchLuckyNumbersWithAI(logicOptions);
      result.games.forEach(game => {
        saveBet('ai', game.numbers, game.reasoning, result.groundingUrls);
      });
      showToast(`${result.games.length} jogos gerados e salvos no histórico!`);
      setActiveTab('history');
    } catch (error) {
      // Fallback local gerando 5 jogos com regras
      for (let i = 0; i < 5; i++) {
        const game = generateGameWithRules(6, logicOptions, referenceDraw);
        saveBet('smart_rules', game.numbers, game.reasoning);
      }
      showToast("5 jogos gerados com sucesso via motor de regras estatísticas!");
      setActiveTab('history');
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleAnalyzeBet = async (id: string) => {
    const bet = history.find(b => b.id === id);
    if (!bet) return;
    setAnalyzingId(id);
    try {
      const result = await analyzeBetHistory(bet.numbers);
      setHistory(prev => prev.map(b => b.id === id ? { ...b, analysis: result } : b));
      showToast("Análise histórica atualizada!");
    } catch (e) {
      showToast("Não foi possível verificar a premiação histórica agora.", 'error');
    } finally {
      setAnalyzingId(null);
    }
  };

  // Exportar backup JSON
  const exportHistory = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `mega_sorte_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast("Backup JSON exportado com sucesso!");
  };

  // Importar backup JSON
  const importHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          setHistory(prev => {
            const existingIds = new Set(prev.map(b => b.id));
            const newData = importedData.filter(b => !existingIds.has(b.id));
            return [...newData, ...prev];
          });
          showToast(`${importedData.length} apostas importadas com sucesso!`);
        }
      } catch (err) {
        showToast("Erro ao importar o arquivo. Verifique o formato JSON.", 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Relatório PDF de todos os jogos
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
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(11);
      doc.setTextColor(30);
      doc.setFont('helvetica', 'bold');
      doc.text(`Jogo #${filteredHistory.length - index} [${bet.type.toUpperCase()}] - ${new Date(bet.createdAt).toLocaleDateString('pt-BR')}`, 20, y);
      
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.text(bet.numbers.map(n => n.toString().padStart(2, '0')).join('  -  '), 20, y);
      
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Soma: ${bet.sum} | Status: ${bet.sumStatus === 'ideal' ? 'Faixa Ideal' : 'Fora da Média'}`, 20, y);
      
      if (bet.reasoning) {
        y += 5;
        const splitReason = doc.splitTextToSize(`Fundamento: ${bet.reasoning}`, 170);
        doc.text(splitReason, 20, y);
        y += (splitReason.length * 4.5);
      }
      
      y += 8;
      doc.setDrawColor(220);
      doc.line(20, y - 4, 190, y - 4);
    });
    
    doc.save(`historico-completo-mega-sena-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("PDF completo baixado com sucesso!");
  };

  // Atualizar sorteio de referência manual
  const handleSaveReferenceDraw = () => {
    const parsed = tempRefInput
      .split(/[\s,;-]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= 60);

    const unique = Array.from(new Set(parsed)).sort((a: number, b: number) => a - b);
    if (unique.length === 6) {
      setReferenceDraw(unique);
      setIsCustomizingRef(false);
      showToast("Sorteio de referência atualizado com sucesso!");
    } else {
      showToast("Informe exatamente 6 dezenas válidas (1 a 60).", 'error');
    }
  };

  // Contabilidade geral de conferência
  const checkerStats = useMemo(() => {
    let sena = 0;
    let quina = 0;
    let quadra = 0;
    let terno = 0;

    history.forEach(bet => {
      const hits = bet.numbers.filter(n => referenceDraw.includes(n)).length;
      if (hits === 6) sena++;
      else if (hits === 5) quina++;
      else if (hits === 4) quadra++;
      else if (hits === 3) terno++;
    });

    return { sena, quina, quadra, terno, total: history.length };
  }, [history, referenceDraw]);

  // Histórico filtrado e ordenado
  const filteredHistory = useMemo(() => {
    let result = [...history];

    if (filterType !== 'all') {
      result = result.filter(b => b.type === filterType);
    }

    if (searchTerm.trim()) {
      const searchNum = parseInt(searchTerm.trim(), 10);
      if (!isNaN(searchNum)) {
        result = result.filter(b => b.numbers.includes(searchNum));
      }
    }

    if (onlyPrizes && referenceDraw.length > 0) {
      result = result.filter(b => {
        const hits = b.numbers.filter(n => referenceDraw.includes(n)).length;
        return hits >= 4;
      });
    }

    result.sort((a, b) => {
      if (sortOrder === 'newest') return b.createdAt - a.createdAt;
      if (sortOrder === 'oldest') return a.createdAt - b.createdAt;
      if (sortOrder === 'sum_desc') return b.sum - a.sum;
      if (sortOrder === 'sum_asc') return a.sum - b.sum;
      return 0;
    });

    return result;
  }, [history, filterType, searchTerm, sortOrder, onlyPrizes, referenceDraw]);

  // Alternar todas as regras
  const toggleAllRules = (enable: boolean) => {
    setLogicOptions({
      repeat1to2: enable,
      balanceEvenOdd: enable,
      sum160to240: enable,
      spreadDistribution: enable,
      concentrate20to50: enable,
      max2Consecutive: enable,
      max2IdenticalEndings: enable
    });
    showToast(enable ? "Todas as 7 regras estatísticas foram ativadas!" : "Todas as regras foram desativadas.", 'info');
  };

  const activeRulesCount = Object.values(logicOptions).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce max-w-sm">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold text-white ${
            toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-emerald-700'
          }`}>
            <CheckCircle size={18} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header Principal */}
      <header className="w-full bg-white border-b border-emerald-100 shadow-sm sticky top-0 z-40 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-2.5 rounded-2xl shadow-md text-white">
              <Sparkles size={26} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight">Mega Sorte</h1>
                <span className="hidden sm:inline-block bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Mega-Sena AI
                </span>
              </div>
              <p className="text-[11px] font-medium text-emerald-700/80">
                Gerador estatístico e inteligente com regras personalizáveis
              </p>
            </div>
          </div>

          {/* Navegação entre Abas */}
          <nav className="flex items-center bg-emerald-50/80 p-1 rounded-2xl border border-emerald-200/60 shadow-inner">
            <button 
              type="button"
              onClick={() => setActiveTab('play')} 
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                activeTab === 'play' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              <ListChecks size={15} />
              <span>JOGAR</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('history')} 
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                activeTab === 'history' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              <History size={15} />
              <span>HISTÓRICO ({history.length})</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('checker')} 
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                activeTab === 'checker' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              <Award size={15} />
              <span>CONFERIR</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="w-full max-w-6xl px-3 sm:px-6 py-6 flex-grow">
        {activeTab === 'play' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lado Esquerdo: Cartela Interativa e Diagnóstico */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-4 sm:p-6 md:p-8 relative">
                {/* Barra de Controle de Dezenas */}
                <div className="flex flex-wrap justify-between items-center gap-3 mb-6 pb-4 border-b border-emerald-100/60">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-emerald-950 flex items-center">
                      Cartela Oficial Mega-Sena
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Toque para marcar suas dezenas ou use os geradores inteligentes
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-emerald-800">Tamanho:</span>
                    <select 
                      value={betCount} 
                      onChange={(e) => {
                        const newCount = Number(e.target.value);
                        setBetCount(newCount);
                        if (selectedNumbers.length > newCount) {
                          setSelectedNumbers(prev => prev.slice(0, newCount));
                        }
                      }} 
                      className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold py-1.5 px-3 rounded-xl outline-none cursor-pointer hover:bg-emerald-100/60 transition-colors"
                    >
                      {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(n => (
                        <option key={n} value={n}>{n} dezenas</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Bar / Contador de Selecionadas */}
                <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3 sm:p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                      {selectedNumbers.length}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">
                        {selectedNumbers.length} de {betCount} dezenas selecionadas
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        {selectedNumbers.length < betCount 
                          ? `Faltam ${betCount - selectedNumbers.length} para completar o bilhete`
                          : "Bilhete completo pronto para salvar!"}
                      </p>
                    </div>
                  </div>

                  {/* Dezenas Selecionadas Preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNumbers.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Nenhum número marcado</span>
                    ) : (
                      selectedNumbers.map(n => (
                        <span key={n} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-700 text-white text-xs font-bold">
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Grade de Dezenas (60 bolas) */}
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 sm:gap-2 justify-items-center mb-6">
                  {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => (
                    <NumberBall 
                      key={num} 
                      num={num} 
                      isSelected={selectedNumbers.includes(num)} 
                      isHit={referenceDraw.includes(num)}
                      onClick={() => toggleNumber(num)} 
                      size="md"
                    />
                  ))}
                </div>

                {/* Legenda de cores */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600 mb-6 pt-3 border-t border-slate-100">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-emerald-400 inline-block"></span>
                    <span>Marcado no bilhete</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-yellow-300 inline-block"></span>
                    <span>Sorteio de referência</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-white border border-emerald-200 inline-block"></span>
                    <span>Disponível</span>
                  </span>
                </div>

                {/* Botões de Ação na Cartela */}
                <div className="flex flex-wrap gap-2.5">
                  <button 
                    type="button"
                    onClick={handleManualSave} 
                    disabled={selectedNumbers.length < 6} 
                    className="flex-1 min-w-[200px] bg-emerald-600 text-white py-3.5 px-4 rounded-2xl font-black shadow-md hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center space-x-2 text-xs sm:text-sm"
                  >
                    <Save size={18} />
                    <span>SALVAR APOSTA NO HISTÓRICO</span>
                  </button>

                  <button 
                    type="button"
                    onClick={handleFillBoardWithRules} 
                    className="bg-emerald-100 text-emerald-900 py-3 px-4 rounded-2xl font-bold hover:bg-emerald-200 active:scale-[0.99] border border-emerald-200 transition-all flex items-center space-x-1.5 text-xs"
                    title="Preenche a cartela atendendo às regras ativas"
                  >
                    <Zap size={16} className="text-emerald-700" />
                    <span className="hidden sm:inline">Preencher c/ Regras</span>
                    <span className="sm:hidden">Regras</span>
                  </button>

                  <button 
                    type="button"
                    onClick={generateSurpresinha} 
                    className="bg-slate-100 text-slate-800 py-3 px-3.5 rounded-2xl font-bold hover:bg-slate-200 active:scale-[0.99] transition-all flex items-center space-x-1.5 text-xs"
                    title="Gera surpresinha aleatória simples"
                  >
                    <Dice5 size={16} />
                    <span>Surpresinha</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setSelectedNumbers([])} 
                    disabled={selectedNumbers.length === 0}
                    className="bg-red-50 text-red-600 px-3.5 py-3 rounded-2xl font-bold hover:bg-red-100 active:scale-[0.99] border border-red-100 disabled:opacity-40 transition-colors"
                    title="Limpar dezenas"
                  >
                    <RotateCcw size={17} />
                  </button>
                </div>
              </div>

              {/* HUD / Diagnóstico em Tempo Real das Regras Estatísticas */}
              <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-emerald-950 flex items-center space-x-2">
                    <Activity size={18} className="text-emerald-600" />
                    <span>Diagnóstico Estatístico da Seleção Atual</span>
                  </h3>
                  <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${
                    selectedNumbers.length < 6 
                      ? 'bg-slate-100 text-slate-600 border-slate-200' 
                      : currentValidation.allActiveRulesPassed 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {selectedNumbers.length < 6 
                      ? 'Selecione 6+ dezenas' 
                      : currentValidation.allActiveRulesPassed 
                        ? '100% Aprovado nas Regras Ativas' 
                        : `${currentValidation.passedRulesCount}/${currentValidation.activeRulesCount} Regras Aprovadas`}
                  </span>
                </div>

                {/* Grade de Verificação das Regras */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                  {/* Soma */}
                  <div className={`p-2.5 rounded-xl border transition-colors ${
                    !logicOptions.sum160to240 ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                    currentValidation.sumValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-200 text-red-900'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[10px] uppercase">Soma (160–240)</span>
                      {logicOptions.sum160to240 && (currentValidation.sumValid ? <Check size={14} className="text-emerald-600 font-bold" /> : <span className="text-[10px] font-bold text-red-600">Ajustar</span>)}
                    </div>
                    <p className="text-base font-black">{currentValidation.sum}</p>
                    <span className="text-[10px] opacity-75">
                      {currentValidation.sum < 160 ? 'Abaixo do ideal' : currentValidation.sum > 240 ? 'Acima do ideal' : 'Na Zona de Ouro'}
                    </span>
                  </div>

                  {/* Par/Ímpar */}
                  <div className={`p-2.5 rounded-xl border transition-colors ${
                    !logicOptions.balanceEvenOdd ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                    currentValidation.evenOddValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-200 text-red-900'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[10px] uppercase">Par / Ímpar</span>
                      {logicOptions.balanceEvenOdd && (currentValidation.evenOddValid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-red-600">3/3 ou 4/2</span>)}
                    </div>
                    <p className="text-base font-black">{currentValidation.evenCount}P / {currentValidation.oddCount}I</p>
                    <span className="text-[10px] opacity-75">Equilíbrio da cartela</span>
                  </div>

                  {/* Faixa 20 a 50 */}
                  <div className={`p-2.5 rounded-xl border transition-colors ${
                    !logicOptions.concentrate20to50 ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                    currentValidation.count20to50Valid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-200 text-red-900'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[10px] uppercase">Faixa 20–50</span>
                      {logicOptions.concentrate20to50 && (currentValidation.count20to50Valid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-red-600">&ge; 50%</span>)}
                    </div>
                    <p className="text-base font-black">{currentValidation.count20to50} dezenas</p>
                    <span className="text-[10px] opacity-75">Miolo mais frequente</span>
                  </div>

                  {/* Quadrantes */}
                  <div className={`p-2.5 rounded-xl border transition-colors ${
                    !logicOptions.spreadDistribution ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                    currentValidation.quadrantsValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-200 text-red-900'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[10px] uppercase">Quadrantes</span>
                      {logicOptions.spreadDistribution && (currentValidation.quadrantsValid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-red-600">&ge; 3 quad.</span>)}
                    </div>
                    <p className="text-base font-black">{currentValidation.quadrants.filter(q => q > 0).length} de 4</p>
                    <span className="text-[10px] opacity-75">Espalhamento ideal</span>
                  </div>

                  {/* Consecutivas */}
                  <div className={`p-2.5 rounded-xl border transition-colors ${
                    !logicOptions.max2Consecutive ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                    currentValidation.consecutiveValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-200 text-red-900'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[10px] uppercase">Seq. Consecutivas</span>
                      {logicOptions.max2Consecutive && (currentValidation.consecutiveValid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-red-600">Max 2</span>)}
                    </div>
                    <p className="text-base font-black">{currentValidation.consecutiveSequences.length} seq.</p>
                    <span className="text-[10px] opacity-75">Máx {currentValidation.maxConsecutive} seguidos</span>
                  </div>

                  {/* Finais Iguais */}
                  <div className={`p-2.5 rounded-xl border transition-colors ${
                    !logicOptions.max2IdenticalEndings ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                    currentValidation.endingsValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-200 text-red-900'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[10px] uppercase">Finais Iguais</span>
                      {logicOptions.max2IdenticalEndings && (currentValidation.endingsValid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-red-600">Max 2</span>)}
                    </div>
                    <p className="text-base font-black">Máx {currentValidation.maxEndingCount}</p>
                    <span className="text-[10px] opacity-75">Evita finais viciados</span>
                  </div>

                  {/* Repetição do Anterior */}
                  <div className={`p-2.5 rounded-xl border transition-colors ${
                    !logicOptions.repeat1to2 ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                    currentValidation.repeatValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-200 text-red-900'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[10px] uppercase">Repetição 1–2</span>
                      {logicOptions.repeat1to2 && (currentValidation.repeatValid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-red-600">1 ou 2</span>)}
                    </div>
                    <p className="text-base font-black">{currentValidation.repeatedCount} dezenas</p>
                    <span className="text-[10px] opacity-75">Padrão histórico</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Direito: Geradores e Regras Selecionáveis */}
            <div className="lg:col-span-4 space-y-6">
              {/* Card 1: Motor com IA + Zona de Ouro */}
              <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-white/15 rounded-full text-emerald-200">
                      <Sparkles size={13} className="mr-1 text-emerald-300" /> Inteligência Artificial
                    </span>
                    <span className="text-[10px] text-emerald-200 font-bold">Gemini + Search</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black tracking-tight">Gerar na Zona de Ouro</h3>
                    <p className="text-emerald-100/80 text-xs leading-relaxed mt-1">
                      A IA consulta os sorteios oficiais, analisa a densidade da <strong>Zona de Ouro (160–240)</strong> e gera apostas fundamentadas.
                    </p>
                  </div>

                  <button 
                    type="button"
                    onClick={generateAI} 
                    disabled={isLoading || isBatchLoading} 
                    className="w-full bg-white text-emerald-900 py-3.5 px-4 rounded-2xl font-black shadow-md hover:bg-emerald-50 active:scale-[0.98] transition-all flex flex-col items-center justify-center disabled:opacity-75 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2 py-1">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-800"></div>
                        <span className="text-xs font-bold uppercase">{loadingStatus}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2 text-sm">
                          <Sparkles size={17} className="text-emerald-600" />
                          <span>GERAR 1 JOGO COM IA</span>
                        </div>
                        <span className="text-[9px] text-emerald-600 font-bold uppercase mt-0.5">
                          Aplica regras ativas & salva no histórico
                        </span>
                      </>
                    )}
                  </button>

                  <button 
                    type="button"
                    onClick={generateBatchAI} 
                    disabled={isLoading || isBatchLoading} 
                    className="w-full bg-emerald-600/60 hover:bg-emerald-600 text-white border border-emerald-400/30 py-3 px-4 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 text-xs cursor-pointer disabled:opacity-50"
                  >
                    {isBatchLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Layers size={16} />
                        <span>COMBO 5 JOGOS VARIADOS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Card 2: Gerador Instantâneo via Regras Locais */}
              <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-emerald-950 flex items-center space-x-2">
                    <Zap size={18} className="text-emerald-600" />
                    <span>Geração Rápida pelas Regras</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Zero Espera
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Gera matematicamente em 10 milissegundos um jogo que cumpre com precisão cirúrgica todas as suas regras marcadas abaixo.
                </p>
                <button 
                  type="button"
                  onClick={handleQuickRuleGenerate}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
                >
                  <Zap size={16} className="text-emerald-600" />
                  <span>GERAR & SALVAR AGORA</span>
                </button>
              </div>

              {/* Card 3: Regras Estatísticas Selecionáveis */}
              <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-emerald-950 flex items-center space-x-1.5">
                      <SlidersHorizontal size={17} className="text-emerald-600" />
                      <span>Regras Estatísticas</span>
                    </h3>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      {activeRulesCount} de 7 ativas
                    </span>
                  </div>

                  <div className="flex space-x-1 text-[10px] font-bold">
                    <button 
                      type="button"
                      onClick={() => toggleAllRules(true)}
                      className="text-emerald-700 hover:underline px-1.5 py-0.5"
                    >
                      Todas
                    </button>
                    <span className="text-slate-300">|</span>
                    <button 
                      type="button"
                      onClick={() => toggleAllRules(false)}
                      className="text-slate-500 hover:underline px-1.5 py-0.5"
                    >
                      Nenhuma
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* Regra 1 */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={logicOptions.repeat1to2} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, repeat1to2: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Repetição de 1–2 dezenas</span>
                      <span className="text-[10px] text-slate-500">Mantém 1 ou 2 números do sorteio de referência anterior</span>
                    </div>
                  </label>

                  {/* Regra 2 */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={logicOptions.balanceEvenOdd} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, balanceEvenOdd: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Equilíbrio Par / Ímpar</span>
                      <span className="text-[10px] text-slate-500">Exige proporção 3P/3I ou 4P/2I (81% dos sorteios)</span>
                    </div>
                  </label>

                  {/* Regra 3 */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={logicOptions.sum160to240} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, sum160to240: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Soma entre 160 – 240</span>
                      <span className="text-[10px] text-slate-500">Faixa onde ocorrem mais de 78% dos prêmios principais</span>
                    </div>
                  </label>

                  {/* Regra 4 */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={logicOptions.spreadDistribution} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, spreadDistribution: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Distribuição espalhada</span>
                      <span className="text-[10px] text-slate-500">Ocupa pelo menos 3 quadrantes da cartela</span>
                    </div>
                  </label>

                  {/* Regra 5 */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={logicOptions.concentrate20to50} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, concentrate20to50: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Concentração no intervalo 20–50</span>
                      <span className="text-[10px] text-slate-500">Miolo estatístico com maior incidência histórica</span>
                    </div>
                  </label>

                  {/* Regra 6 */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={logicOptions.max2Consecutive} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, max2Consecutive: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Máximo 2 consecutivas</span>
                      <span className="text-[10px] text-slate-500">Evita sequências improváveis (como 12, 13, 14)</span>
                    </div>
                  </label>

                  {/* Regra 7 */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={logicOptions.max2IdenticalEndings} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, max2IdenticalEndings: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Máximo 2 finais iguais</span>
                      <span className="text-[10px] text-slate-500">Impede acumulação de terminação (ex: 14, 24, 34)</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Aba 2: Histórico Permanente Completo */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-slate-100 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-emerald-950 flex items-center space-x-2">
                  <History size={24} className="text-emerald-600" />
                  <span>Seu Histórico de Jogos</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Armazenamento local permanente • {filteredHistory.length} de {history.length} apostas exibidas
                </p>
              </div>

              {/* Ações de Backup & Exportação */}
              <div className="flex flex-wrap gap-2 items-center">
                <button 
                  type="button"
                  onClick={downloadFullHistoryPDF}
                  disabled={filteredHistory.length === 0}
                  className="bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center space-x-1.5 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <FileText size={15} /> <span>PDF COMPLETO</span>
                </button>
                
                <button 
                  type="button"
                  onClick={exportHistory} 
                  disabled={history.length === 0}
                  className="bg-white border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-emerald-50 transition-colors"
                >
                  <FileJson size={15} /> <span>EXPORTAR JSON</span>
                </button>

                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()} 
                  className="bg-white border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-emerald-50 transition-colors"
                >
                  <Upload size={15} /> <span>IMPORTAR</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={importHistory} accept=".json" className="hidden" />

                <button 
                  type="button"
                  onClick={() => { 
                    if (confirm("Tem certeza que deseja apagar todo o seu histórico de jogos neste navegador?")) {
                      setHistory([]);
                      showToast("Histórico limpo.");
                    }
                  }} 
                  disabled={history.length === 0}
                  className="text-red-500 hover:text-red-700 font-bold text-xs p-2 rounded-lg hover:bg-red-50 flex items-center space-x-1 disabled:opacity-30 transition-colors"
                  title="Limpar histórico"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
              {/* Filtro por Categoria */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center">
                  <Filter size={13} className="mr-1" /> Tipo:
                </span>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'ai', label: 'IA' },
                  { id: 'smart_rules', label: 'Regras' },
                  { id: 'random', label: 'Surpresinha' },
                  { id: 'manual', label: 'Manual' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      filterType === tab.id 
                        ? 'bg-emerald-700 text-white shadow-sm' 
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Busca por dezena e ordenação */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-2.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar dezena..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-none w-32 sm:w-36 focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <ArrowUpDown size={14} className="text-slate-400" />
                  <select 
                    value={sortOrder} 
                    onChange={(e: any) => setSortOrder(e.target.value)}
                    className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="newest">Mais recentes</option>
                    <option value="oldest">Mais antigos</option>
                    <option value="sum_desc">Maior soma</option>
                    <option value="sum_asc">Menor soma</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Listagem de Jogos */}
            {filteredHistory.length === 0 ? (
              <div className="text-center py-16 px-4 bg-emerald-50/50 rounded-3xl border-2 border-dashed border-emerald-200/80">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                  <ListChecks size={24} />
                </div>
                <h3 className="text-sm font-black text-emerald-950">Nenhuma aposta encontrada</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {history.length === 0 
                    ? "Monte seu jogo na cartela ou gere combinações com Inteligência Artificial para começar."
                    : "Nenhum jogo corresponde aos filtros selecionados. Tente redefinir a busca."}
                </p>
                {history.length === 0 && (
                  <button 
                    type="button"
                    onClick={() => setActiveTab('play')}
                    className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
                  >
                    Ir para o Gerador
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHistory.map((bet) => (
                  <BetCard 
                    key={bet.id} 
                    bet={bet} 
                    drawnNumbers={referenceDraw}
                    onDelete={(id) => {
                      setHistory(h => h.filter(x => x.id !== id));
                      showToast("Aposta excluída do histórico.");
                    }} 
                    onAnalyze={handleAnalyzeBet} 
                    isAnalyzing={analyzingId === bet.id} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aba 3: Conferidor de Apostas */}
        {activeTab === 'checker' && (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-4 sm:p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-950 flex items-center space-x-2">
                <Award size={24} className="text-emerald-600" />
                <span>Conferidor Automático de Apostas</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifique instantaneamente todas as apostas salvas contra o resultado de um concurso da Mega-Sena.
              </p>
            </div>

            {/* Painel do Concurso de Referência */}
            <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-5 sm:p-6 rounded-3xl shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-200">
                    Sorteio de Referência
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsCustomizingRef(!isCustomizingRef)}
                  className="text-[11px] font-bold text-emerald-200 hover:text-white underline"
                >
                  {isCustomizingRef ? 'Cancelar Edição' : 'Digitar Outro Concurso'}
                </button>
              </div>

              {isCustomizingRef ? (
                <div className="bg-white/10 p-3.5 rounded-2xl space-y-2.5">
                  <label className="text-xs font-bold text-emerald-100 block">
                    Digite as 6 dezenas sorteadas separadas por vírgula ou espaço:
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={tempRefInput} 
                      onChange={(e) => setTempRefInput(e.target.value)}
                      placeholder="Ex: 05, 12, 26, 33, 44, 58" 
                      className="flex-1 px-3 py-2 rounded-xl bg-white text-slate-900 font-bold text-sm outline-none"
                    />
                    <button 
                      type="button"
                      onClick={handleSaveReferenceDraw}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-xs transition-colors"
                    >
                      CONFERIR
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 py-2">
                  {referenceDraw.map(n => (
                    <span 
                      key={n} 
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 font-black flex items-center justify-center text-sm sm:text-base shadow-md border-2 border-yellow-300"
                    >
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-emerald-200/80">
                Estas 6 dezenas também orientam a regra de repetição de 1–2 dezenas no gerador estatístico.
              </p>
            </div>

            {/* Placar de Premiações */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 text-center">
                <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Sena (6 acertos)</span>
                <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-1">{checkerStats.sena}</p>
                <span className="text-[10px] text-amber-700 font-medium">Prêmio Máximo</span>
              </div>

              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/70 text-center">
                <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Quina (5 acertos)</span>
                <p className="text-2xl sm:text-3xl font-black text-blue-900 mt-1">{checkerStats.quina}</p>
                <span className="text-[10px] text-blue-700 font-medium">2º Faixa</span>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 text-center">
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Quadra (4 acertos)</span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">{checkerStats.quadra}</p>
                <span className="text-[10px] text-emerald-700 font-medium">3º Faixa</span>
              </div>

              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/70 text-center">
                <span className="text-[10px] font-black uppercase text-purple-800 tracking-wider">Terno (3 acertos)</span>
                <p className="text-2xl sm:text-3xl font-black text-purple-900 mt-1">{checkerStats.terno}</p>
                <span className="text-[10px] text-purple-700 font-medium">Sem prêmio na Mega</span>
              </div>
            </div>

            {/* Gráfico de Visualização de Dados (Recharts) */}
            <FrequencyChart history={history} referenceDraw={referenceDraw} />

            {/* Toggle de Apenas Premiadas */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={onlyPrizes} 
                  onChange={(e) => setOnlyPrizes(e.target.checked)} 
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Exibir somente jogos premiados (&ge; 4 acertos)</span>
              </label>

              <span className="text-xs text-slate-500">
                Total de apostas no histórico: {history.length}
              </span>
            </div>

            {/* Listagem com destaque nos números acertados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {filteredHistory.map((bet) => (
                <BetCard 
                  key={bet.id} 
                  bet={bet} 
                  drawnNumbers={referenceDraw}
                  onDelete={(id) => {
                    setHistory(h => h.filter(x => x.id !== id));
                    showToast("Aposta excluída.");
                  }} 
                  onAnalyze={handleAnalyzeBet} 
                  isAnalyzing={analyzingId === bet.id} 
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Rodapé Elegante */}
      <footer className="w-full bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 no-print mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-slate-600">
            Mega Sorte • Gerador Estatístico e Inteligente da Mega-Sena
          </p>
          <p className="text-[11px] text-slate-400">
            Armazenamento permanente no navegador • Jogue com responsabilidade (+18)
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
