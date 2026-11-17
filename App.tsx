import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
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
  RefreshCw,
  BarChart3,
  Flame,
  Target,
  Grid3X3,
  Cloud,
  LogOut,
  LogIn,
  Globe,
  GitCompare,
  ArrowRight,
  Clover,
  Database,
  Wifi,
  WifiOff,
  BrainCircuit,
  Trophy
} from 'lucide-react';
import { generateLuckyNumbersWithAI, analyzeBetHistory, generateBatchLuckyNumbersWithAI } from './services/geminiService';
import { Bet, GeneratorLogic, OfficialDrawResult, LotteryType } from './types';
import { 
  validateGameAgainstRules, 
  generateGameWithRules, 
  generatePortfolioWithRules,
  buildAdvancedBetMetrics, 
  autoOptimizeGameNumbers 
} from './utils/lotteryRules';
import { generateMaisMilionariaGameWithRules } from './utils/maisMilionariaRules';
import { LATEST_MAIS_MILIONARIA_DRAW } from './utils/maisMilionariaContestsData';
import { buildDrawsListWithLatest } from './utils/megaSenaAdvancedAnalytics';
import { buildMaisMilionariaDrawsListWithLatest } from './utils/maisMilionariaAdvancedAnalytics';
import { LATEST_LOTOFACIL_DRAW, buildLotofacilDrawsListWithLatest } from './utils/lotofacilContestsData';
import { 
  validateLotofacilBet, 
  generateLotofacilWithRules, 
  autoOptimizeLotofacilGame,
  LOTOFACIL_FRAME,
  LOTOFACIL_CENTER 
} from './utils/lotofacilRules';
import { LOTOFACIL_FREQUENCY_DATA } from './utils/lotofacilOfficialStats';
import { analyzeGamePlausibility, isGamePlausible } from './utils/plausibilityFilter';
import { analyzeTernoFilterFromBets, getHistoricalDrawsForBacktest } from './utils/backtestingEngine';
import { STRATEGY_CATALOG, getStrategyMeta } from './utils/strategyCatalog';
import NumberBall from './components/NumberBall';
import BetCard, { PastComparisonSummary, PastContestMatch } from './components/BetCard';
import FrequencyChart from './components/FrequencyChart';
import AdvancedAnalyticsView from './components/AdvancedAnalyticsView';
import LatestOfficialDrawCard from './components/LatestOfficialDrawCard';
import GameComparatorView from './components/GameComparatorView';
import SequenceAnalyticsView from './components/SequenceAnalyticsView';
import WheelingSimulatorView from './components/WheelingSimulatorView';
import AICoachingPanel from './components/AICoachingPanel';
import GameRankingPanel from './components/GameRankingPanel';
import CacheManagerModal from './components/CacheManagerModal';
import { offlineCacheManager } from './services/offlineCacheManager';
import { 
  getStoredLatestOfficialDraw, 
  saveStoredLatestOfficialDraw, 
  fetchLatestOfficialDraw 
} from './services/lotteryApi';
import { jsPDF } from 'jspdf';
import { testConnection } from './firebase';
import { 
  loginWithGoogle, 
  logoutUser, 
  subscribeToAuth, 
  fetchCloudBetsOnce,
  saveBetToCloud, 
  deleteBetFromCloud, 
  subscribeToCloudBets, 
  syncAllLocalBetsToCloud 
} from './services/firebaseService';
import { User } from 'firebase/auth';

const STORAGE_KEY = 'mega_sorte_bets';
const LOGIC_KEY = 'mega_sorte_logic_v3';

const App: React.FC = () => {
  // Último Sorteio Oficial da Mega-Sena (Sempre Visível e Integrado)
  const [latestOfficialDraw, setLatestOfficialDraw] = useState<OfficialDrawResult>(() => getStoredLatestOfficialDraw());
  const [isFetchingDraw, setIsFetchingDraw] = useState<boolean>(false);

  const [currentLottery, setCurrentLottery] = useState<LotteryType>('megasena');
  const [latestMaisMilionariaDraw, setLatestMaisMilionariaDraw] = useState<OfficialDrawResult>(() => ({
    contestNumber: LATEST_MAIS_MILIONARIA_DRAW.contest,
    date: LATEST_MAIS_MILIONARIA_DRAW.date,
    numbers: LATEST_MAIS_MILIONARIA_DRAW.numbers,
    trevos: LATEST_MAIS_MILIONARIA_DRAW.trevos || [1, 2],
    accumulated: true,
    estimatedNextPrize: "R$ 10.000.000,00",
    prizeSena: "Acumulado",
    lastUpdated: Date.now(),
    source: 'official_archive',
    lottery: 'maismilionaria'
  }));

  const [latestLotofacilDraw, setLatestLotofacilDraw] = useState<OfficialDrawResult>(() => ({
    contestNumber: LATEST_LOTOFACIL_DRAW.contest,
    date: LATEST_LOTOFACIL_DRAW.date,
    numbers: LATEST_LOTOFACIL_DRAW.numbers,
    accumulated: false,
    estimatedNextPrize: "R$ 1.700.000,00",
    prizeSena: "15 Acertos Premiado",
    lastUpdated: Date.now(),
    source: 'official_archive',
    lottery: 'lotofacil'
  }));

  const [selectedTrevos, setSelectedTrevos] = useState<number[]>([1, 2]);

  const activeOfficialDraw = currentLottery === 'lotofacil'
    ? latestLotofacilDraw
    : (currentLottery === 'maismilionaria' ? latestMaisMilionariaDraw : latestOfficialDraw);

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betCount, setBetCount] = useState<number>(6);
  const [history, setHistory] = useState<Bet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      const backup = offlineCacheManager.getBackupUserBets();
      if (Array.isArray(backup) && backup.length > 0) {
        return backup as Bet[];
      }
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [isRuleGenerating, setIsRuleGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'play' | 'my_games' | 'analytics' | 'wheeling' | 'compare'
  >('play');
  const [myGamesSubTab, setMyGamesSubTab] = useState<'history' | 'checker' | 'ranking'>('history');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'stats' | 'sequences' | 'coaching'>('stats');
  const [compareSubModeRequest, setCompareSubModeRequest] = useState<{
    mode: 'direct' | 'simulator' | 'backtesting' | 'prospective';
    nonce: number;
  } | undefined>(undefined);

  const openMyGames = (sub: 'history' | 'checker' | 'ranking' = 'history') => {
    setMyGamesSubTab(sub);
    setActiveTab('my_games');
  };

  const openAnalytics = (sub: 'stats' | 'sequences' | 'coaching' = 'stats') => {
    setAnalyticsSubTab(sub);
    setActiveTab('analytics');
  };

  const openCompare = (mode: 'direct' | 'simulator' | 'backtesting' | 'prospective' = 'direct') => {
    setCompareSubModeRequest({ mode, nonce: Date.now() + Math.random() });
    setActiveTab('compare');
  };
  
  // Toast de feedback não intrusivo
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  // Gerenciador de Cache Offline e Status de Conexão
  const [isCacheModalOpen, setIsCacheModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => offlineCacheManager.isOnline());

  // Lógica de regras estatísticas selecionáveis pelo usuário (inclui Análise Avançada)
  const [logicOptions, setLogicOptions] = useState<GeneratorLogic>(() => {
    const defaults: GeneratorLogic = {
      repeat1to2: true,
      balanceEvenOdd: true,
      sum160to240: true,
      spreadDistribution: true,
      concentrate20to50: true,
      max2Consecutive: true,
      max2IdenticalEndings: true,
      preferHistoricalHotNumbers: true,
      // Pilares da Análise Avançada
      useAdvancedDuques: true,
      frameAndCenterBalance: true,
      balancePrimesAndFibonacci: true,
      paretoTopSelection: true,
      includeCycleDezenas: true,
      multiplesOfThreeBalance: true,
      rowAndColDispersion: true,
      // Estratégia de Cálculo Matemático (Padrão auditado: Cobertura Anti-Colisão)
      calculationStrategy: 'combinatorial_cover',
      // Filtro de Plausibilidade Histórica (Centralizar nos clusters de máxima densidade)
      strictPlausibilityFilter: true,
      // Sub-Pool Combinatório opcional (60 = cobertura global padrão)
      portfolioSubPoolSize: 60
    };
    const savedV3 = localStorage.getItem(LOGIC_KEY);
    if (savedV3) {
      try {
        return { ...defaults, ...JSON.parse(savedV3) };
      } catch (e) { /* fallback */ }
    }
    const savedV2 = localStorage.getItem('mega_sorte_logic_v2');
    if (savedV2) {
      try {
        const parsed = JSON.parse(savedV2);
        return {
          ...defaults,
          ...parsed,
          calculationStrategy: 'combinatorial_cover',
          portfolioSubPoolSize: 60
        };
      } catch (e) { /* fallback */ }
    }
    return defaults;
  });

  const [generationModeTab, setGenerationModeTab] = useState<'portfolio' | 'single' | 'ai'>('portfolio');
  const [portfolioBatchSize, setPortfolioBatchSize] = useState<number>(78);
  const [showBoardDetails, setShowBoardDetails] = useState<boolean>(false);
  const [showExperimentalStrategies, setShowExperimentalStrategies] = useState<boolean>(false);
  const [showManualRules, setShowManualRules] = useState<boolean>(false);
  const [lastBatchCoverage, setLastBatchCoverage] = useState<{
    totalGames: number;
    distinctGames: number;
    distinctNumbers: number;
    uniquePairs: number;
    pairCoveragePct: number;
    giniCoefficient: number;
    maxFreq?: number;
    subPoolSize?: number;
  } | null>(null);

  // Sorteios de referência de conferência independentes para Mega-Sena, +Milionária e Lotofácil
  const [megaRefDraw, setMegaRefDraw] = useState<number[]>(latestOfficialDraw.numbers);
  const [maisMilionariaRefDraw, setMaisMilionariaRefDraw] = useState<number[]>(latestMaisMilionariaDraw.numbers);
  const [maisMilionariaRefTrevos, setMaisMilionariaRefTrevos] = useState<number[]>(latestMaisMilionariaDraw.trevos || [1, 2]);
  const [lotofacilRefDraw, setLotofacilRefDraw] = useState<number[]>(latestLotofacilDraw.numbers);

  const [isCustomizingRef, setIsCustomizingRef] = useState(false);
  const [tempRefInput, setTempRefInput] = useState(latestOfficialDraw.numbers.join(', '));
  const [tempRefTrevosInput, setTempRefTrevosInput] = useState((latestMaisMilionariaDraw.trevos || [1, 2]).join(', '));

  const activeRefNumbers = currentLottery === 'lotofacil'
    ? lotofacilRefDraw
    : (currentLottery === 'maismilionaria' ? maisMilionariaRefDraw : megaRefDraw);
  const activeRefTrevos = currentLottery === 'maismilionaria' ? maisMilionariaRefTrevos : undefined;

  const [selectedCheckerContest, setSelectedCheckerContest] = useState<number | 'custom'>(activeOfficialDraw.contestNumber);
  const [checkerFilterScope, setCheckerFilterScope] = useState<'selected_contest' | 'all_past'>('selected_contest');

  // Sincroniza inputs ao mudar de perfil de loteria
  useEffect(() => {
    if (currentLottery === 'lotofacil') {
      setTempRefInput(lotofacilRefDraw.join(', '));
    } else if (currentLottery === 'maismilionaria') {
      setTempRefInput(maisMilionariaRefDraw.join(', '));
      setTempRefTrevosInput(maisMilionariaRefTrevos.join(', '));
    } else {
      setTempRefInput(megaRefDraw.join(', '));
    }
    setIsCustomizingRef(false);
  }, [currentLottery, megaRefDraw, maisMilionariaRefDraw, maisMilionariaRefTrevos, lotofacilRefDraw]);

  // Filtros de histórico
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'sum_desc' | 'sum_asc'>('newest');
  const [onlyPrizes, setOnlyPrizes] = useState<boolean>(false);
  const [checkerHitsFilter, setCheckerHitsFilter] = useState<
    'all' | '3plus' | '3' | '4' | '5' | '6' | '11plus' | '11' | '12' | '13' | '14' | '15'
  >('all');
  const [checkerHitsOrder, setCheckerHitsOrder] = useState<'hits_desc' | 'hits_asc' | 'best_past' | 'newest'>('hits_desc');

  useEffect(() => {
    setCheckerHitsFilter('all');
    setSelectedCheckerContest(
      currentLottery === 'lotofacil'
        ? latestLotofacilDraw.contestNumber
        : currentLottery === 'maismilionaria'
        ? latestMaisMilionariaDraw.contestNumber
        : latestOfficialDraw.contestNumber
    );
  }, [currentLottery, latestLotofacilDraw.contestNumber, latestMaisMilionariaDraw.contestNumber, latestOfficialDraw.contestNumber]);

  // Estado de Autenticação e Nuvem Google Firebase
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'synced' | 'syncing' | 'error'>('idle');
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [cloudSyncRetryNonce, setCloudSyncRetryNonce] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCloudErrorMessage = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err || '');
    if (raw.includes('Free daily read units') || raw.includes('Quota exceeded') || raw.includes('resource-exhausted')) {
      return 'Cota diária gratuita do Firestore atingida (será redefinida amanhã).';
    }
    if (raw.includes('Missing or insufficient permissions') || raw.includes('permission-denied')) {
      return 'Permissão negada no Firestore ao carregar apostas. Verifique as regras de segurança.';
    }
    if (raw.includes('client is offline') || raw.includes('unavailable')) {
      return 'Sem conexão com o servidor da nuvem no momento.';
    }
    return 'Não foi possível sincronizar com a nuvem. Clique em atualizar para tentar novamente.';
  };

  // Mostrar toast
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Testar conexão inicial com Firestore (mandatório pelo SDK) e escutar Auth
  useEffect(() => {
    testConnection().catch(() => {});
    const unsub = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Sincronizar em tempo real com a nuvem quando o usuário estiver autenticado
  useEffect(() => {
    if (!currentUser) {
      setCloudSyncStatus('idle');
      setCloudSyncError(null);
      return;
    }
    let active = true;
    setCloudSyncStatus('syncing');
    setCloudSyncError(null);

    const mergeCloudBets = (cloudBets: Bet[]) => {
      setHistory(prev => {
        const map = new Map<string, Bet>();
        prev.forEach(b => map.set(b.id, b));
        cloudBets.forEach(b => map.set(b.id, { ...b, isCloudSynced: true }));
        const merged = Array.from(map.values());
        merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return merged;
      });
    };

    const unsubscribeBets = subscribeToCloudBets(
      currentUser.uid,
      (cloudBets, meta) => {
        if (!active) return;
        mergeCloudBets(cloudBets);
        if (!meta?.fromCache || cloudBets.length > 0) {
          setCloudSyncStatus('synced');
          setCloudSyncError(null);
        }
      },
      async (err) => {
        if (!active) return;
        console.warn("Erro ao sincronizar apostas na nuvem (onSnapshot):", err);
        try {
          const fallbackBets = await fetchCloudBetsOnce(currentUser.uid);
          if (!active) return;
          mergeCloudBets(fallbackBets);
          setCloudSyncStatus('synced');
          setCloudSyncError(null);
        } catch (fallbackErr) {
          if (!active) return;
          setCloudSyncStatus('error');
          setCloudSyncError(parseCloudErrorMessage(fallbackErr || err));
        }
      }
    );

    return () => {
      active = false;
      unsubscribeBets();
    };
  }, [currentUser, cloudSyncRetryNonce]);

  // Sincronizar em segundo plano na inicialização para obter o último concurso oficial da Caixa
  useEffect(() => {
    fetchLatestOfficialDraw().then(({ draw, isLive, message }) => {
      if (isLive) {
        setLatestOfficialDraw(draw);
        setMegaRefDraw(draw.numbers);
        if (currentLottery === 'megasena') {
          setTempRefInput(draw.numbers.join(', '));
        }
        showToast(message, 'info');
      }
    }).catch(() => {});
  }, [currentLottery]);

  const handleRefreshLatestDraw = async () => {
    setIsFetchingDraw(true);
    try {
      const { draw, isLive, message } = await fetchLatestOfficialDraw();
      setLatestOfficialDraw(draw);
      setMegaRefDraw(draw.numbers);
      if (currentLottery === 'megasena') {
        setTempRefInput(draw.numbers.join(', '));
      }
      showToast(message, isLive ? 'success' : 'info');
    } catch {
      showToast("Não foi possível buscar na Caixa no momento. Usando último concurso salvo.", 'info');
    } finally {
      setIsFetchingDraw(false);
    }
  };

  const handleUpdateLatestDraw = (updated: OfficialDrawResult) => {
    if (currentLottery === 'lotofacil') {
      setLatestLotofacilDraw(updated);
      setLotofacilRefDraw(updated.numbers);
      setTempRefInput(updated.numbers.join(', '));
      showToast(`Concurso #${updated.contestNumber} da Lotofácil salvo com sucesso!`, 'success');
    } else if (currentLottery === 'maismilionaria') {
      setLatestMaisMilionariaDraw(updated);
      setMaisMilionariaRefDraw(updated.numbers);
      if (updated.trevos) setMaisMilionariaRefTrevos(updated.trevos);
      setTempRefInput(updated.numbers.join(', '));
      if (updated.trevos) setTempRefTrevosInput(updated.trevos.join(', '));
      showToast(`Concurso #${updated.contestNumber} da +Milionária salvo com sucesso!`, 'success');
    } else {
      setLatestOfficialDraw(updated);
      saveStoredLatestOfficialDraw(updated);
      setMegaRefDraw(updated.numbers);
      setTempRefInput(updated.numbers.join(', '));
      setSelectedCheckerContest(updated.contestNumber);
      showToast(`Concurso #${updated.contestNumber} da Mega-Sena salvo com sucesso!`, 'success');
    }
  };

  const handleRestoreOfficialDrawInChecker = () => {
    if (currentLottery === 'lotofacil') {
      setLotofacilRefDraw(latestLotofacilDraw.numbers);
      setTempRefInput(latestLotofacilDraw.numbers.join(', '));
      setSelectedCheckerContest(latestLotofacilDraw.contestNumber);
      setIsCustomizingRef(false);
      showToast(`Conferência restaurada para o Último Concurso Oficial Caixa Lotofácil #${latestLotofacilDraw.contestNumber}!`, 'success');
    } else if (currentLottery === 'maismilionaria') {
      setMaisMilionariaRefDraw(latestMaisMilionariaDraw.numbers);
      setMaisMilionariaRefTrevos(latestMaisMilionariaDraw.trevos || [1, 2]);
      setTempRefInput(latestMaisMilionariaDraw.numbers.join(', '));
      setTempRefTrevosInput((latestMaisMilionariaDraw.trevos || [1, 2]).join(', '));
      setSelectedCheckerContest(latestMaisMilionariaDraw.contestNumber);
      setIsCustomizingRef(false);
      showToast(`Conferência restaurada para o Último Concurso Oficial Caixa +Milionária #${latestMaisMilionariaDraw.contestNumber}!`, 'success');
    } else {
      setMegaRefDraw(latestOfficialDraw.numbers);
      setTempRefInput(latestOfficialDraw.numbers.join(', '));
      setSelectedCheckerContest(latestOfficialDraw.contestNumber);
      setIsCustomizingRef(false);
      showToast(`Conferência restaurada para o Último Concurso Oficial Caixa Mega-Sena #${latestOfficialDraw.contestNumber}!`, 'success');
    }
  };

  // Registrar Service Worker e escutar status de rede
  useEffect(() => {
    offlineCacheManager.registerServiceWorker();
    const unsub = offlineCacheManager.subscribeNetworkStatus((online) => {
      setIsOnline(online);
    });
    return () => unsub();
  }, []);

  // Aquecimento e pré-cálculo do Cache Offline em background
  useEffect(() => {
    const timer = setTimeout(() => {
      const megaList = buildDrawsListWithLatest(latestOfficialDraw);
      const maisList = buildMaisMilionariaDrawsListWithLatest(latestMaisMilionariaDraw);
      const lotoList = buildLotofacilDrawsListWithLatest(latestLotofacilDraw);
      offlineCacheManager.warmOfflineCache(megaList, maisList, lotoList);
    }, 350);
    return () => clearTimeout(timer);
  }, [latestOfficialDraw, latestMaisMilionariaDraw, latestLotofacilDraw]);

  // Salvar histórico e regras em cache local com backup secundário
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    offlineCacheManager.backupUserBets(history);
  }, [history]);

  useEffect(() => {
    localStorage.setItem(LOGIC_KEY, JSON.stringify(logicOptions));
  }, [logicOptions]);

  const handleTriggerWarmUp = async () => {
    const megaList = buildDrawsListWithLatest(latestOfficialDraw);
    const maisList = buildMaisMilionariaDrawsListWithLatest(latestMaisMilionariaDraw);
    await offlineCacheManager.warmOfflineCache(megaList, maisList);
    showToast("Cache offline 100% atualizado e pré-calculado em alta velocidade!", 'success');
  };

  const handleClearLocalCache = () => {
    offlineCacheManager.clearCache();
    const megaList = buildDrawsListWithLatest(latestOfficialDraw);
    const maisList = buildMaisMilionariaDrawsListWithLatest(latestMaisMilionariaDraw);
    offlineCacheManager.warmOfflineCache(megaList, maisList);
    showToast("Cache local limpo e reprocessado!", 'info');
  };

  // Ações de Autenticação com Google
  const handleGoogleLogin = async () => {
    try {
      setIsSyncingCloud(true);
      const user = await loginWithGoogle();
      showToast(`Conectado como ${user.displayName || user.email}! Sincronizando apostas...`, 'success');
      // Subir apostas locais existentes para a nuvem para que nunca se percam
      if (history.length > 0) {
        const count = await syncAllLocalBetsToCloud(user.uid, history);
        if (count > 0) {
          showToast(`${count} aposta(s) sincronizada(s) para sua conta na nuvem!`);
        }
      }
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        showToast("Não foi possível conectar com o Google no momento.", 'error');
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setCloudSyncStatus('idle');
      showToast("Desconectado da conta Google. Apostas continuam salvas localmente neste navegador.");
    } catch (error) {
      showToast("Erro ao desconectar.", 'error');
    }
  };

  const handleSyncNow = async () => {
    if (!currentUser) {
      handleGoogleLogin();
      return;
    }
    setIsSyncingCloud(true);
    setCloudSyncStatus('syncing');
    setCloudSyncError(null);
    try {
      const cloudBets = await fetchCloudBetsOnce(currentUser.uid);
      const cloudIds = new Set(cloudBets.map(b => b.id));

      setHistory(prev => {
        const map = new Map<string, Bet>();
        prev.forEach(b => map.set(b.id, b));
        cloudBets.forEach(b => map.set(b.id, { ...b, isCloudSynced: true }));
        const merged = Array.from(map.values());
        merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return merged;
      });

      const uploadedCount = await syncAllLocalBetsToCloud(currentUser.uid, history, cloudIds);
      setCloudSyncStatus('synced');
      setCloudSyncRetryNonce(n => n + 1);
      showToast(
        `Sincronizado! ${cloudBets.length} jogo(s) na nuvem${uploadedCount > 0 ? ` (${uploadedCount} enviado(s))` : ''}.`,
        'success'
      );
    } catch (e) {
      const msg = parseCloudErrorMessage(e);
      setCloudSyncStatus('error');
      setCloudSyncError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const calculateSumData = (nums: number[]) => {
    const sum = nums.reduce((a, b) => a + b, 0);
    let minIdeal = logicOptions.sum160to240 ? 160 : 150;
    let maxIdeal = logicOptions.sum160to240 ? 240 : 210;
    if (currentLottery === 'lotofacil') {
      minIdeal = 180;
      maxIdeal = 220;
    } else if (currentLottery === 'maismilionaria') {
      minIdeal = 120;
      maxIdeal = 185;
    }
    
    let sumStatus: Bet['sumStatus'] = 'ideal';
    if (sum < minIdeal) sumStatus = 'low';
    if (sum > maxIdeal) sumStatus = 'high';
    return { sum, sumStatus };
  };

  // Diferimento dos estados via useDeferredValue para garantir 60 FPS na interação com a cartela
  // e evitar engasgos durante a verificação das regras estatísticas e análise avançada
  const deferredSelectedNumbers = useDeferredValue(selectedNumbers);
  const deferredLogicOptions = useDeferredValue(logicOptions);
  const deferredOfficialNumbers = useDeferredValue(latestOfficialDraw.numbers);
  const deferredLotofacilNumbers = useDeferredValue(latestLotofacilDraw.numbers);
  const deferredMaisMilionariaNumbers = useDeferredValue(latestMaisMilionariaDraw.numbers);

  // Diagnóstico em tempo real da seleção atual na cartela integrando o último concurso
  const currentValidation = useMemo(() => {
    if (currentLottery === 'lotofacil') {
      return validateLotofacilBet(deferredSelectedNumbers, deferredLogicOptions, deferredLotofacilNumbers);
    }
    const refNumbers = currentLottery === 'maismilionaria' ? deferredMaisMilionariaNumbers : deferredOfficialNumbers;
    return validateGameAgainstRules(deferredSelectedNumbers, deferredLogicOptions, refNumbers);
  }, [currentLottery, deferredSelectedNumbers, deferredLogicOptions, deferredLotofacilNumbers, deferredMaisMilionariaNumbers, deferredOfficialNumbers]);

  // Diagnóstico em tempo real de Plausibilidade e Macro-Clusters (ex: alerta 1,2,3,4,5,6)
  const currentPlausibility = useMemo(() => {
    return analyzeGamePlausibility(deferredSelectedNumbers, currentLottery);
  }, [deferredSelectedNumbers, currentLottery]);

  const isRulesPending = selectedNumbers !== deferredSelectedNumbers;

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

  const saveBet = (
    type: Bet['type'], 
    numbers: number[], 
    reasoning?: string, 
    groundingUrls?: Bet['groundingUrls'],
    advancedMetrics?: Bet['advancedMetrics'],
    customTrevos?: number[]
  ) => {
    const { sum, sumStatus } = calculateSumData(numbers);
    const resolvedAdvancedMetrics = advancedMetrics || (
      currentLottery === 'lotofacil'
        ? validateLotofacilBet(numbers, logicOptions, activeRefNumbers).advancedMetrics
        : buildAdvancedBetMetrics(validateGameAgainstRules(numbers, logicOptions, activeRefNumbers))
    );
    const resolvedTrevos = customTrevos && customTrevos.length > 0 ? customTrevos : selectedTrevos;
    const newBet: Bet = {
      id: Math.random().toString(36).substring(2, 11),
      numbers: [...numbers].sort((a, b) => a - b),
      trevos: currentLottery === 'maismilionaria' ? [...resolvedTrevos].sort((a, b) => a - b) : undefined,
      lottery: currentLottery,
      createdAt: Date.now(),
      type,
      reasoning,
      groundingUrls,
      sum,
      sumStatus,
      advancedMetrics: resolvedAdvancedMetrics,
      userId: currentUser?.uid,
      isCloudSynced: Boolean(currentUser)
    };

    setHistory(prev => [newBet, ...prev]);

    // Se o usuário estiver autenticado, salva instantaneamente no Firestore
    if (currentUser) {
      saveBetToCloud(currentUser.uid, newBet).catch(err => {
        console.warn("Erro ao salvar aposta no Firestore:", err);
      });
    }

    return newBet;
  };

  const saveBetsBatch = (
    items: Array<{
      type: Bet['type'];
      numbers: number[];
      reasoning?: string;
      advancedMetrics?: Bet['advancedMetrics'];
    }>
  ) => {
    const baseTime = Date.now();
    const created: Bet[] = items.map((item, idx) => {
      const { sum, sumStatus } = calculateSumData(item.numbers);
      const resolvedAdvancedMetrics = item.advancedMetrics || (
        currentLottery === 'lotofacil'
          ? validateLotofacilBet(item.numbers, logicOptions, activeRefNumbers).advancedMetrics
          : buildAdvancedBetMetrics(validateGameAgainstRules(item.numbers, logicOptions, activeRefNumbers))
      );
      return {
        id: `${Math.random().toString(36).substring(2, 9)}_${idx}`,
        numbers: [...item.numbers].sort((a, b) => a - b),
        trevos: currentLottery === 'maismilionaria' ? [...selectedTrevos].sort((a, b) => a - b) : undefined,
        lottery: currentLottery,
        createdAt: baseTime + idx,
        type: item.type,
        reasoning: item.reasoning,
        sum,
        sumStatus,
        advancedMetrics: resolvedAdvancedMetrics,
        userId: currentUser?.uid,
        isCloudSynced: Boolean(currentUser)
      };
    });

    setHistory(prev => [...created, ...prev]);

    if (currentUser) {
      created.forEach(bet => {
        saveBetToCloud(currentUser.uid, bet).catch(() => {});
      });
    }
    return created;
  };

  const handleGeneratePortfolioBatch = () => {
    setIsRuleGenerating(true);
    setTimeout(() => {
      try {
        const size = Math.max(2, Math.min(200, portfolioBatchSize || 78));
        if (currentLottery === 'megasena') {
          const { games, coverage } = generatePortfolioWithRules(size, betCount, logicOptions, latestOfficialDraw.numbers);
          saveBetsBatch(
            games.map(g => ({
              type: 'smart_rules',
              numbers: g.numbers,
              reasoning: g.reasoning,
              advancedMetrics: g.advancedMetrics
            }))
          );
          const subPoolUsed = logicOptions.calculationStrategy === 'combinatorial_cover'
            ? (logicOptions.portfolioSubPoolSize ?? 60)
            : 60;
          setLastBatchCoverage({
            totalGames: coverage.totalGames,
            distinctGames: coverage.distinctGames,
            distinctNumbers: coverage.distinctNumbers,
            uniquePairs: coverage.uniquePairs,
            pairCoveragePct: coverage.pairCoveragePct,
            giniCoefficient: coverage.giniCoefficient,
            maxFreq: coverage.maxFreq,
            subPoolSize: subPoolUsed
          });
          if (games.length > 0) setSelectedNumbers(games[0].numbers);
          showToast(
            `Carteira de ${coverage.distinctGames}/${size} jogos distintos salva (${coverage.distinctNumbers}/${subPoolUsed} dez. • máx. ${coverage.maxFreq}x/dez. • ${coverage.pairCoveragePct.toFixed(1)}% pares únicos)!`,
            'success'
          );
        } else {
          const seen = new Set<string>();
          const items: Array<{ type: Bet['type']; numbers: number[]; reasoning?: string; advancedMetrics?: Bet['advancedMetrics'] }> = [];
          for (let i = 0; i < size * 4 && items.length < size; i++) {
            const g = currentLottery === 'lotofacil'
              ? generateLotofacilWithRules(betCount, logicOptions, latestLotofacilDraw.numbers)
              : generateMaisMilionariaGameWithRules(betCount, logicOptions, latestMaisMilionariaDraw.numbers);
            const k = g.numbers.join('-');
            if (!seen.has(k)) {
              seen.add(k);
              items.push({ type: 'smart_rules', numbers: g.numbers, reasoning: g.reasoning, advancedMetrics: g.advancedMetrics });
            }
          }
          saveBetsBatch(items);
          if (items.length > 0) setSelectedNumbers(items[0].numbers);
          showToast(`Carteira de ${items.length} jogos distintos salva no histórico!`, 'success');
        }
      } finally {
        setIsRuleGenerating(false);
      }
    }, 20);
  };

  const handleDeleteBet = (id: string) => {
    setHistory(h => h.filter(x => x.id !== id));
    if (currentUser) {
      deleteBetFromCloud(currentUser.uid, id).catch(err => {
        console.warn("Erro ao excluir do Firestore:", err);
      });
    }
    showToast("Aposta excluída do histórico.");
  };

  const handleClearHistory = async () => {
    if (!confirm("Tem certeza que deseja apagar todas as apostas salvas?")) return;
    if (currentUser) {
      for (const b of history) {
        deleteBetFromCloud(currentUser.uid, b.id).catch(() => {});
      }
    }
    setHistory([]);
    showToast("Histórico limpo com sucesso.");
  };

  const handleManualSave = () => {
    const minRequired = currentLottery === 'lotofacil' ? 15 : 6;
    if (selectedNumbers.length < minRequired) {
      showToast(`Selecione pelo menos ${minRequired} dezenas para salvar.`, 'error');
      return;
    }
    const lottoLabel = currentLottery === 'lotofacil' ? 'Lotofácil' : (currentLottery === 'maismilionaria' ? '+Milionária' : 'Mega-Sena');
    const reason = `Aposta montada manualmente na cartela da ${lottoLabel} (${selectedNumbers.length} dezenas).`;
    saveBet('manual', selectedNumbers, reason);
    setSelectedNumbers([]);
    showToast("Aposta salva com sucesso no histórico permanente!");
  };

  // Auto-otimizador com inteligência estatística para dezenas selecionadas com setTimeout de debounce
  const handleAutoOptimizeSelected = () => {
    if (selectedNumbers.length === 0) {
      showToast("Selecione dezenas na cartela para auto-otimizar.", 'info');
      return;
    }
    setIsOptimizing(true);
    setTimeout(() => {
      try {
        if (currentLottery === 'lotofacil') {
          const { optimizedNumbers, changesMade } = autoOptimizeLotofacilGame(selectedNumbers, latestLotofacilDraw.numbers);
          setSelectedNumbers(optimizedNumbers);
          setBetCount(optimizedNumbers.length);
          showToast(`Lotofácil auto-otimizada com sucesso (${changesMade.length} ajustes na Moldura e Paridade)!`, 'success');
        } else {
          const { optimizedNumbers, changesMade } = autoOptimizeGameNumbers(selectedNumbers);
          setSelectedNumbers(optimizedNumbers);
          setBetCount(optimizedNumbers.length);
          showToast(`Jogo auto-otimizado com sucesso (${changesMade.length} ajustes)!`, 'success');
        }
      } finally {
        setIsOptimizing(false);
      }
    }, 20);
  };

  // Preencher cartela com as regras e análise avançada integrando o último concurso com setTimeout debounce
  const handleFillBoardWithRules = () => {
    setIsRuleGenerating(true);
    setTimeout(() => {
      try {
        if (currentLottery === 'lotofacil') {
          const result = generateLotofacilWithRules(betCount, logicOptions, latestLotofacilDraw.numbers);
          setSelectedNumbers(result.numbers);
          showToast(`Cartela da Lotofácil preenchida com as regras de ouro (Moldura, Par/Ímpar, Repetidas)! (Score: ${result.validation.advancedScore}%)`, 'success');
        } else if (currentLottery === 'maismilionaria') {
          const result = generateMaisMilionariaGameWithRules(betCount, logicOptions, latestMaisMilionariaDraw.numbers);
          setSelectedNumbers(result.numbers);
          setSelectedTrevos(result.trevos);
          showToast(`Cartela da +Milionária preenchida integrando Concurso #${latestMaisMilionariaDraw.contestNumber}!`, 'success');
        } else {
          const result = generateGameWithRules(betCount, logicOptions, latestOfficialDraw.numbers);
          setSelectedNumbers(result.numbers);
          showToast(result.passedAllRules 
            ? `Cartela preenchida integrando o Concurso #${latestOfficialDraw.contestNumber} (Score: ${result.validation.advancedScore}%)!` 
            : `Cartela preenchida com otimização analítica (${result.validation.advancedScore}% conformidade)!`, 'success');
        }
      } finally {
        setIsRuleGenerating(false);
      }
    }, 20);
  };

  const handleQuickRuleGenerate = () => {
    setIsRuleGenerating(true);
    setTimeout(() => {
      try {
        if (currentLottery === 'lotofacil') {
          const result = generateLotofacilWithRules(betCount, logicOptions, latestLotofacilDraw.numbers);
          saveBet('smart_rules', result.numbers, result.reasoning, undefined, result.advancedMetrics);
          setSelectedNumbers(result.numbers);
          showToast(`Jogo de ${result.numbers.length} dezenas da Lotofácil gerado integrando Concurso #${latestLotofacilDraw.contestNumber}!`, 'success');
        } else if (currentLottery === 'maismilionaria') {
          const result = generateMaisMilionariaGameWithRules(betCount, logicOptions, latestMaisMilionariaDraw.numbers);
          saveBet('smart_rules', result.numbers, result.reasoning, undefined, result.advancedMetrics);
          setSelectedNumbers(result.numbers);
          setSelectedTrevos(result.trevos);
          showToast(`Jogo da +Milionária gerado com sucesso integrando Concurso #${latestMaisMilionariaDraw.contestNumber}!`, 'success');
        } else {
          const result = generateGameWithRules(betCount, logicOptions, latestOfficialDraw.numbers);
          saveBet('smart_rules', result.numbers, result.reasoning, undefined, result.advancedMetrics);
          setSelectedNumbers(result.numbers);
          const strategyName = getStrategyMeta(logicOptions.calculationStrategy).name;
          showToast(`Jogo gerado via [${strategyName}] integrando o Concurso #${latestOfficialDraw.contestNumber}!`, 'success');
        }
      } finally {
        setIsRuleGenerating(false);
      }
    }, 20);
  };

  // Surpresinha (com suporte ao Filtro de Plausibilidade Ativo)
  const generateSurpresinha = () => {
    const maxVal = currentLottery === 'lotofacil' ? 25 : (currentLottery === 'maismilionaria' ? 50 : 60);
    const targetCount = currentLottery === 'lotofacil' ? (betCount || 15) : betCount;
    const usePlausibility = logicOptions.strictPlausibilityFilter !== false;

    let sorted: number[] = [];
    let attempts = 0;

    while (attempts < 80) {
      attempts++;
      const numbers: number[] = [];
      while (numbers.length < targetCount) {
        const r = Math.floor(Math.random() * maxVal) + 1;
        if (!numbers.includes(r)) numbers.push(r);
      }
      const candidate = numbers.sort((a, b) => a - b);
      if (!usePlausibility || isGamePlausible(candidate, currentLottery)) {
        sorted = candidate;
        break;
      }
      if (sorted.length === 0) sorted = candidate;
    }

    setSelectedNumbers(sorted);
    if (currentLottery === 'maismilionaria') {
      const trevos = [Math.floor(Math.random() * 6) + 1];
      while (trevos.length < 2) {
        const t = Math.floor(Math.random() * 6) + 1;
        if (!trevos.includes(t)) trevos.push(t);
      }
      setSelectedTrevos(trevos.sort((a, b) => a - b));
    }
    const lottoLabel = currentLottery === 'lotofacil' ? 'Lotofácil' : (currentLottery === 'maismilionaria' ? '+Milionária' : 'Mega-Sena');
    const reason = usePlausibility
      ? `Surpresinha calibrada no Cluster de Alta Plausibilidade Histórica (${lottoLabel}).`
      : `Surpresinha aleatória sem filtros estatísticos (${lottoLabel}).`;
    saveBet('random', sorted, reason);
    showToast(usePlausibility ? "Surpresinha no Cluster Central gerada com sucesso!" : "Surpresinha gerada e registrada no histórico!");
  };

  // Gerador com IA integrando obrigatoriamente o último sorteio oficial
  const generateAI = async () => {
    setIsLoading(true);
    setLoadingStatus(`Analisando Concurso Oficial #${activeOfficialDraw.contestNumber} e Estatísticas...`);
    try {
      const result = await generateLuckyNumbersWithAI(betCount, logicOptions, activeOfficialDraw, currentLottery);
      setSelectedNumbers(result.numbers);
      saveBet('ai', result.numbers, result.reasoning, result.groundingUrls);
      showToast(`Jogo gerado com Inteligência Artificial integrando o Concurso #${activeOfficialDraw.contestNumber}!`);
    } catch (error) {
      if (currentLottery === 'lotofacil') {
        const fallback = generateLotofacilWithRules(betCount, logicOptions, latestLotofacilDraw.numbers);
        setSelectedNumbers(fallback.numbers);
        saveBet('smart_rules', fallback.numbers, fallback.reasoning, undefined, fallback.advancedMetrics);
        showToast(`Jogo da Lotofácil gerado pelo motor estatístico integrando o Concurso #${latestLotofacilDraw.contestNumber}!`);
      } else if (currentLottery === 'maismilionaria') {
        const fallback = generateMaisMilionariaGameWithRules(betCount, logicOptions, latestMaisMilionariaDraw.numbers);
        setSelectedNumbers(fallback.numbers);
        setSelectedTrevos(fallback.trevos);
        saveBet('smart_rules', fallback.numbers, fallback.reasoning, undefined, fallback.advancedMetrics);
        showToast(`Jogo da +Milionária gerado pelo motor estatístico integrando o Concurso #${latestMaisMilionariaDraw.contestNumber}!`);
      } else {
        const fallback = generateGameWithRules(betCount, logicOptions, latestOfficialDraw.numbers);
        setSelectedNumbers(fallback.numbers);
        saveBet('smart_rules', fallback.numbers, fallback.reasoning, undefined, fallback.advancedMetrics);
        showToast(`Jogo gerado com sucesso via motor estatístico integrando o Concurso #${latestOfficialDraw.contestNumber}!`);
      }
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  // Gerar combo de 5 jogos com IA integrando o último concurso oficial
  const generateBatchAI = async () => {
    setIsBatchLoading(true);
    try {
      const result = await generateBatchLuckyNumbersWithAI(logicOptions, activeOfficialDraw, currentLottery);
      result.games.forEach(game => {
        saveBet('ai', game.numbers, game.reasoning, result.groundingUrls);
      });
      showToast(`${result.games.length} jogos gerados integrando o Concurso #${activeOfficialDraw.contestNumber}!`);
      openMyGames('history');
    } catch (error) {
      const seenFallback = new Set<string>();
      const fallbackBatch: Array<{ type: Bet['type']; numbers: number[]; reasoning?: string; advancedMetrics?: Bet['advancedMetrics'] }> = [];
      let tries = 0;
      while (fallbackBatch.length < 5 && tries < 30) {
        tries++;
        const game = currentLottery === 'lotofacil'
          ? generateLotofacilWithRules(15, logicOptions, latestLotofacilDraw.numbers)
          : currentLottery === 'maismilionaria'
          ? generateMaisMilionariaGameWithRules(6, logicOptions, latestMaisMilionariaDraw.numbers)
          : generateGameWithRules(6, logicOptions, latestOfficialDraw.numbers);
        const key = game.numbers.join('-');
        if (!seenFallback.has(key)) {
          seenFallback.add(key);
          fallbackBatch.push({
            type: 'smart_rules',
            numbers: game.numbers,
            reasoning: game.reasoning,
            advancedMetrics: game.advancedMetrics
          });
        }
      }
      saveBetsBatch(fallbackBatch);
      showToast(`${fallbackBatch.length} jogos únicos gerados com sucesso integrando o Concurso #${activeOfficialDraw.contestNumber}!`);
      openMyGames('history');
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
    const isLoto = currentLottery === 'lotofacil';
    const isMais = currentLottery === 'maismilionaria';
    const maxNum = isLoto ? 25 : (isMais ? 50 : 60);
    const expectedCount = isLoto ? 15 : 6;

    const parsedNums = tempRefInput
      .split(/[\s,;-]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= maxNum);

    const uniqueNums = Array.from(new Set(parsedNums)).sort((a: number, b: number) => a - b);

    if (uniqueNums.length !== expectedCount) {
      showToast(`Informe exatamente ${expectedCount} dezenas válidas (01 a ${maxNum}).`, 'error');
      return;
    }

    if (isLoto) {
      setLotofacilRefDraw(uniqueNums);
      setSelectedCheckerContest('custom');
      setIsCustomizingRef(false);
      showToast("Sorteio de referência da Lotofácil atualizado com sucesso!");
    } else if (isMais) {
      const parsedTrevos = tempRefTrevosInput
        .split(/[\s,;-]+/)
        .map(s => parseInt(s.trim(), 10))
        .filter(t => !isNaN(t) && t >= 1 && t <= 6);
      const uniqueTrevos = Array.from(new Set(parsedTrevos)).sort((a: number, b: number) => a - b);
      if (uniqueTrevos.length !== 2) {
        showToast("Informe exatamente 2 trevos válidos (1 a 6) para a +Milionária.", 'error');
        return;
      }
      setMaisMilionariaRefDraw(uniqueNums);
      setMaisMilionariaRefTrevos(uniqueTrevos);
      setSelectedCheckerContest('custom');
      setIsCustomizingRef(false);
      showToast("Sorteio de referência da +Milionária atualizado com sucesso!");
    } else {
      setMegaRefDraw(uniqueNums);
      setSelectedCheckerContest('custom');
      setIsCustomizingRef(false);
      showToast("Sorteio de referência da Mega-Sena atualizado com sucesso!");
    }
  };

  // Contabilidade geral de conferência
  const checkerStats = useMemo(() => {
    const relevantBets = history.filter(b => (b.lottery || 'megasena') === currentLottery);

    if (currentLottery === 'lotofacil') {
      let hits15 = 0;
      let hits14 = 0;
      let hits13 = 0;
      let hits12 = 0;
      let hits11 = 0;

      relevantBets.forEach(bet => {
        const hits = bet.numbers.filter(n => activeRefNumbers.includes(n)).length;
        if (hits >= 15) hits15++;
        else if (hits === 14) hits14++;
        else if (hits === 13) hits13++;
        else if (hits === 12) hits12++;
        else if (hits === 11) hits11++;
      });

      const totalPrizeFixed = hits13 * 30 + hits12 * 12 + hits11 * 6;
      return { hits15, hits14, hits13, hits12, hits11, totalPrizeFixed, total: relevantBets.length };
    }

    if (currentLottery === 'maismilionaria') {
      let faixa1 = 0; // 6 + 2 trevos
      let faixa2to4 = 0; // 6 ou 5 acertos
      let faixa5to6 = 0; // 4 acertos
      let faixa7to10 = 0; // 3 ou 2 acertos + trevos

      relevantBets.forEach(bet => {
        const hits = bet.numbers.filter(n => activeRefNumbers.includes(n)).length;
        const trevosHits = (activeRefTrevos && bet.trevos) 
          ? bet.trevos.filter(t => activeRefTrevos.includes(t)).length 
          : 0;

        if (hits === 6 && trevosHits === 2) faixa1++;
        else if (hits === 6 || hits === 5) faixa2to4++;
        else if (hits === 4) faixa5to6++;
        else if ((hits === 3 && trevosHits >= 1) || (hits === 2 && trevosHits >= 1)) faixa7to10++;
      });

      return { faixa1, faixa2to4, faixa5to6, faixa7to10, total: relevantBets.length };
    }

    let sena = 0;
    let quina = 0;
    let quadra = 0;
    let terno = 0;

    relevantBets.forEach(bet => {
      const hits = bet.numbers.filter(n => activeRefNumbers.includes(n)).length;
      if (hits === 6) sena++;
      else if (hits === 5) quina++;
      else if (hits === 4) quadra++;
      else if (hits === 3) terno++;
    });

    return { sena, quina, quadra, terno, total: relevantBets.length };
  }, [history, currentLottery, activeRefNumbers, activeRefTrevos]);

  // Histórico filtrado e ordenado para a modalidade atual
  const filteredHistory = useMemo(() => {
    let result = history.filter(b => (b.lottery || 'megasena') === currentLottery);

    if (filterType !== 'all') {
      result = result.filter(b => b.type === filterType);
    }

    if (searchTerm.trim()) {
      const searchNum = parseInt(searchTerm.trim(), 10);
      if (!isNaN(searchNum)) {
        result = result.filter(b => b.numbers.includes(searchNum));
      }
    }

    if (onlyPrizes && activeRefNumbers.length > 0) {
      result = result.filter(b => {
        const hits = b.numbers.filter(n => activeRefNumbers.includes(n)).length;
        if (currentLottery === 'lotofacil') {
          return hits >= 11;
        }
        if (currentLottery === 'maismilionaria') {
          const tHits = (activeRefTrevos && b.trevos) 
            ? b.trevos.filter(t => activeRefTrevos.includes(t)).length 
            : 0;
          return hits >= 4 || (hits === 3 && tHits >= 1) || (hits === 2 && tHits >= 1);
        }
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
  }, [history, currentLottery, filterType, searchTerm, sortOrder, onlyPrizes, activeRefNumbers, activeRefTrevos]);

  const lotteryCounts = useMemo(() => {
    const counts = { megasena: 0, maismilionaria: 0, lotofacil: 0 };
    history.forEach(b => {
      const lot = (b.lottery || 'megasena') as LotteryType;
      if (lot in counts) counts[lot]++;
      else counts.megasena++;
    });
    return counts;
  }, [history]);

  // Concursos históricos arquivados disponíveis para comparação na aba Conferir
  const pastContestsForChecker = useMemo(
    () => getHistoricalDrawsForBacktest(currentLottery, activeOfficialDraw),
    [currentLottery, activeOfficialDraw]
  );

  const selectedCheckerDrawMeta = useMemo(() => {
    if (selectedCheckerContest === 'custom') return null;
    return (
      pastContestsForChecker.find(d => d.contest === selectedCheckerContest) || {
        contest: activeOfficialDraw.contestNumber,
        date: activeOfficialDraw.date,
        numbers: activeOfficialDraw.numbers,
        trevos: activeOfficialDraw.trevos
      }
    );
  }, [selectedCheckerContest, pastContestsForChecker, activeOfficialDraw]);

  const handleSelectPastContestInChecker = (contestNumber: number) => {
    const draw = pastContestsForChecker.find(d => d.contest === contestNumber);
    if (!draw) return;

    if (currentLottery === 'lotofacil') {
      setLotofacilRefDraw(draw.numbers);
      setTempRefInput(draw.numbers.join(', '));
    } else if (currentLottery === 'maismilionaria') {
      setMaisMilionariaRefDraw(draw.numbers);
      const trevos = draw.trevos && draw.trevos.length === 2 ? draw.trevos : (latestMaisMilionariaDraw.trevos || [1, 2]);
      setMaisMilionariaRefTrevos(trevos);
      setTempRefInput(draw.numbers.join(', '));
      setTempRefTrevosInput(trevos.join(', '));
    } else {
      setMegaRefDraw(draw.numbers);
      setTempRefInput(draw.numbers.join(', '));
    }
    setSelectedCheckerContest(contestNumber);
    setIsCustomizingRef(false);
    showToast(`Conferindo apostas com o Concurso #${draw.contest} (${draw.date})`, 'success');
  };

  // Comparação automática de cada aposta contra TODOS os concursos passados arquivados
  const betPastComparisons = useMemo(() => {
    const map = new Map<string, PastComparisonSummary>();
    const relevantBets = history.filter(b => (b.lottery || 'megasena') === currentLottery);
    const minNotable = currentLottery === 'lotofacil' ? 11 : 3;
    const highThreshold = currentLottery === 'lotofacil' ? 12 : 4;

    const preparedDraws = pastContestsForChecker.map(d => ({
      draw: d,
      numSet: new Set(d.numbers),
      trevoSet: d.trevos ? new Set(d.trevos) : null
    }));

    let overallBest: { bet: Bet; match: PastContestMatch } | null = null;
    let betsWithMidOrHigher = 0;
    let betsWithHighTier = 0;

    relevantBets.forEach(bet => {
      const countsByTier: Record<number, number> = {};
      const matches: PastContestMatch[] = [];

      preparedDraws.forEach(({ draw, numSet, trevoSet }) => {
        const matchedNumbers = bet.numbers.filter(n => numSet.has(n));
        const hits = matchedNumbers.length;
        countsByTier[hits] = (countsByTier[hits] || 0) + 1;

        let trevosHits: number | undefined;
        let matchedTrevos: number[] | undefined;
        if (currentLottery === 'maismilionaria' && trevoSet && bet.trevos) {
          matchedTrevos = bet.trevos.filter(t => trevoSet.has(t));
          trevosHits = matchedTrevos.length;
        }

        matches.push({
          contest: draw.contest,
          date: draw.date,
          hits,
          matchedNumbers,
          trevosHits,
          matchedTrevos
        });
      });

      matches.sort((a, b) => {
        if (b.hits !== a.hits) return b.hits - a.hits;
        if ((b.trevosHits ?? 0) !== (a.trevosHits ?? 0)) return (b.trevosHits ?? 0) - (a.trevosHits ?? 0);
        return b.contest - a.contest;
      });

      const bestMatch = matches[0] || null;
      const notable = matches.filter(m => m.hits >= minNotable);
      const notableMatches = notable.length > 0 ? notable : matches.slice(0, 3);

      if (bestMatch) {
        if (bestMatch.hits >= minNotable) betsWithMidOrHigher++;
        if (bestMatch.hits >= highThreshold) betsWithHighTier++;
        if (
          !overallBest ||
          bestMatch.hits > overallBest.match.hits ||
          (bestMatch.hits === overallBest.match.hits && (bestMatch.trevosHits ?? 0) > (overallBest.match.trevosHits ?? 0)) ||
          (bestMatch.hits === overallBest.match.hits && bestMatch.contest > overallBest.match.contest)
        ) {
          overallBest = { bet, match: bestMatch };
        }
      }

      map.set(bet.id, {
        totalContestsChecked: pastContestsForChecker.length,
        bestMatch,
        notableMatches,
        countsByTier
      });
    });

    return {
      map,
      overallBest,
      betsWithMidOrHigher,
      betsWithHighTier,
      totalBets: relevantBets.length
    };
  }, [history, currentLottery, pastContestsForChecker]);

  // Contagens por faixa exata de acertos e listagem ordenada exclusiva da aba Conferir
  const checkerHitCounts = useMemo(() => {
    const refSet = new Set(activeRefNumbers);
    const relevant = history.filter(b => (b.lottery || 'megasena') === currentLottery);
    const counts: Record<number, number> = {};
    let threePlus = 0;
    let elevenPlus = 0;

    relevant.forEach(bet => {
      const hits = checkerFilterScope === 'all_past'
        ? (betPastComparisons.map.get(bet.id)?.bestMatch?.hits ?? 0)
        : bet.numbers.filter(n => refSet.has(n)).length;
      counts[hits] = (counts[hits] || 0) + 1;
      if (hits >= 3) threePlus++;
      if (hits >= 11) elevenPlus++;
    });

    return {
      total: relevant.length,
      threePlus,
      elevenPlus,
      byHits: counts
    };
  }, [history, currentLottery, activeRefNumbers, checkerFilterScope, betPastComparisons]);

  const checkerFilteredHistory = useMemo(() => {
    const refSet = new Set(activeRefNumbers);
    const relevant = history.filter(b => (b.lottery || 'megasena') === currentLottery);

    let result = relevant.map(bet => {
      const selectedHits = bet.numbers.filter(n => refSet.has(n)).length;
      const bestPastHits = betPastComparisons.map.get(bet.id)?.bestMatch?.hits ?? 0;
      const hits = checkerFilterScope === 'all_past' ? bestPastHits : selectedHits;
      return {
        bet,
        hits,
        selectedHits,
        bestPastHits
      };
    });

    if (checkerHitsFilter === 'all') {
      if (onlyPrizes && activeRefNumbers.length > 0) {
        result = result.filter(({ bet, hits }) => {
          if (currentLottery === 'lotofacil') return hits >= 11;
          if (currentLottery === 'maismilionaria') {
            if (checkerFilterScope === 'all_past') {
              const bestPast = betPastComparisons.map.get(bet.id)?.bestMatch;
              const tHits = bestPast?.trevosHits ?? 0;
              return hits >= 4 || (hits === 3 && tHits >= 1) || (hits === 2 && tHits >= 1);
            }
            const tHits = (activeRefTrevos && bet.trevos)
              ? bet.trevos.filter(t => activeRefTrevos.includes(t)).length
              : 0;
            return hits >= 4 || (hits === 3 && tHits >= 1) || (hits === 2 && tHits >= 1);
          }
          return hits >= 4;
        });
      }
    } else if (checkerHitsFilter === '3plus') {
      result = result.filter(({ hits }) => hits >= 3 && hits <= 6);
    } else if (checkerHitsFilter === '11plus') {
      result = result.filter(({ hits }) => hits >= 11);
    } else {
      const exactTarget = parseInt(checkerHitsFilter, 10);
      if (!isNaN(exactTarget)) {
        result = result.filter(({ hits }) => hits === exactTarget);
      }
    }

    result.sort((a, b) => {
      if (checkerHitsOrder === 'best_past') {
        if (b.bestPastHits !== a.bestPastHits) return b.bestPastHits - a.bestPastHits;
        if (b.selectedHits !== a.selectedHits) return b.selectedHits - a.selectedHits;
      } else if (checkerHitsOrder === 'hits_desc') {
        if (b.hits !== a.hits) return b.hits - a.hits;
      } else if (checkerHitsOrder === 'hits_asc') {
        if (a.hits !== b.hits) return a.hits - b.hits;
      }
      return b.bet.createdAt - a.bet.createdAt;
    });

    return result.map(item => item.bet);
  }, [history, currentLottery, activeRefNumbers, activeRefTrevos, checkerHitsFilter, checkerHitsOrder, onlyPrizes, checkerFilterScope, betPastComparisons]);

  const handleExtractTernoStatsFromChecker = () => {
    const refSet = new Set(activeRefNumbers);
    const relevant = history.filter(b => (b.lottery || 'megasena') === currentLottery);
    const minThreshold = currentLottery === 'lotofacil' ? 11 : 3;
    const mapped = relevant.map(bet => {
      const matched = bet.numbers.filter(n => refSet.has(n));
      return {
        numbers: bet.numbers,
        matchedNumbers: matched,
        hits: matched.length
      };
    });

    const profile = analyzeTernoFilterFromBets(mapped, currentLottery, relevant.length, minThreshold);
    if (!profile) {
      showToast(`Nenhuma aposta conferida atingiu ${minThreshold}+ acertos nesta modalidade ainda.`, 'info');
      return;
    }

    setLogicOptions(prev => ({
      ...prev,
      useTernoStatsBoost: true,
      ternoBoostProfile: profile
    }));
    showToast(
      `Estatísticas de ${profile.ternoSimulationsCount} de ${profile.sourceSimulationsCount} jogos (${minThreshold}+ acertos) aplicadas na Análise Avançada e Gerador!`,
      'success'
    );
  };

  // Alternar todas as regras
  const toggleAllRules = (enable: boolean) => {
    setLogicOptions(prev => ({
      ...prev,
      repeat1to2: enable,
      balanceEvenOdd: enable,
      sum160to240: enable,
      spreadDistribution: enable,
      concentrate20to50: enable,
      max2Consecutive: enable,
      max2IdenticalEndings: enable,
      preferHistoricalHotNumbers: enable,
      useAdvancedDuques: enable,
      frameAndCenterBalance: enable,
      balancePrimesAndFibonacci: enable,
      paretoTopSelection: enable,
      includeCycleDezenas: enable,
      multiplesOfThreeBalance: enable,
      rowAndColDispersion: enable,
      ...(prev.ternoBoostProfile ? { useTernoStatsBoost: enable } : {})
    }));
    showToast(enable ? "Todas as 15 regras estatísticas e analíticas foram ativadas!" : "Todas as regras foram desativadas.", 'info');
  };

  const activeRulesCount = [
    logicOptions.repeat1to2,
    logicOptions.balanceEvenOdd,
    logicOptions.sum160to240,
    logicOptions.spreadDistribution,
    logicOptions.concentrate20to50,
    logicOptions.max2Consecutive,
    logicOptions.max2IdenticalEndings,
    logicOptions.preferHistoricalHotNumbers,
    logicOptions.useAdvancedDuques,
    logicOptions.frameAndCenterBalance,
    logicOptions.balancePrimesAndFibonacci,
    logicOptions.paretoTopSelection,
    logicOptions.includeCycleDezenas,
    logicOptions.multiplesOfThreeBalance,
    logicOptions.rowAndColDispersion,
    logicOptions.strictPlausibilityFilter !== false,
    Boolean(logicOptions.useTernoStatsBoost && logicOptions.ternoBoostProfile?.lottery === currentLottery)
  ].filter(Boolean).length;

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
      <header className="w-full bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl shadow-md text-white transition-colors ${
              currentLottery === 'lotofacil'
                ? 'bg-gradient-to-br from-purple-600 to-fuchsia-600'
                : (currentLottery === 'maismilionaria' ? 'bg-gradient-to-br from-amber-600 to-yellow-600' : 'bg-gradient-to-br from-emerald-600 to-teal-700')
            }`}>
              {currentLottery === 'lotofacil' ? <Award size={26} /> : (currentLottery === 'maismilionaria' ? <Clover size={26} /> : <Sparkles size={26} />)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {currentLottery === 'lotofacil' 
                    ? 'Lotofácil Sorte' 
                    : (currentLottery === 'maismilionaria' ? '+Milionária Sorte' : 'Mega Sorte')}
                </h1>
                
                {/* Switcher de Modalidade / Perfil */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLottery('megasena');
                      setBetCount(6);
                      setSelectedNumbers([]);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      currentLottery === 'megasena'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Mega-Sena (60)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLottery('maismilionaria');
                      setBetCount(6);
                      setSelectedNumbers([]);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      currentLottery === 'maismilionaria'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    +Milionária (50+6)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLottery('lotofacil');
                      setBetCount(15);
                      setSelectedNumbers([]);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      currentLottery === 'lotofacil'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Lotofácil (25)
                  </button>
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                {currentLottery === 'lotofacil'
                  ? 'Base Oficial dos mais de 3.350 concursos da Lotofácil (Caixa Econômica Federal)'
                  : (currentLottery === 'maismilionaria'
                    ? 'Base Oficial dos 401 concursos da +Milionária (Caixa Econômica Federal)'
                    : 'Base Oficial de mais de 3.070 concursos da Mega-Sena (Caixa Econômica Federal)')}
              </p>
            </div>
          </div>

          {/* Navegação entre Abas e Cloud Widget */}
          <div className="flex flex-wrap items-center gap-2.5">
            <nav className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto max-w-full">
              <button 
                type="button"
                onClick={() => setActiveTab('play')} 
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'play' 
                    ? (currentLottery === 'lotofacil' ? 'bg-purple-600 text-white shadow-sm' : (currentLottery === 'maismilionaria' ? 'bg-amber-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'))
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <ListChecks size={15} />
                <span>JOGAR</span>
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('my_games')} 
                title={history.length > filteredHistory.length ? `${filteredHistory.length} exibidos na modalidade/filtros atuais de ${history.length} jogos salvos no total` : undefined}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'my_games' 
                    ? (currentLottery === 'lotofacil' ? 'bg-purple-600 text-white shadow-sm' : (currentLottery === 'maismilionaria' ? 'bg-amber-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'))
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <Award size={15} />
                <span>
                  MEUS JOGOS ({filteredHistory.length}{history.length > filteredHistory.length ? `/${history.length}` : ''})
                </span>
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('analytics')} 
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'analytics' 
                    ? (currentLottery === 'lotofacil' ? 'bg-purple-600 text-white shadow-sm' : (currentLottery === 'maismilionaria' ? 'bg-amber-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'))
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <BarChart3 size={15} />
                <span>ANÁLISES</span>
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('wheeling')} 
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'wheeling' 
                    ? (currentLottery === 'lotofacil' ? 'bg-purple-600 text-white shadow-sm' : (currentLottery === 'maismilionaria' ? 'bg-amber-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'))
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <Layers size={15} />
                <span>FECHAMENTOS</span>
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('compare')} 
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'compare' 
                    ? (currentLottery === 'lotofacil' ? 'bg-purple-600 text-white shadow-sm' : (currentLottery === 'maismilionaria' ? 'bg-amber-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'))
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <GitCompare size={15} />
                <span>COMPARAR &amp; SIMULAR</span>
              </button>
            </nav>

            {/* Widget de Nuvem & Autenticação Google */}
            <div className="flex items-center">
              {currentUser ? (
                <div className={`flex items-center space-x-2 px-2.5 py-1 rounded-2xl shadow-sm border ${
                  cloudSyncStatus === 'error'
                    ? 'bg-rose-50/90 border-rose-200'
                    : 'bg-emerald-50/90 border-emerald-200/90'
                }`}>
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="" 
                      className="w-7 h-7 rounded-full border border-emerald-300 object-cover" 
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  
                  <div
                    className="hidden xl:flex flex-col text-left pr-0.5"
                    title={cloudSyncError || undefined}
                  >
                    <span className="text-[11px] font-bold text-emerald-950 leading-tight truncate max-w-[110px]">
                      {currentUser.displayName || currentUser.email}
                    </span>
                    <span className={`text-[9px] flex items-center space-x-1 font-semibold ${
                      cloudSyncStatus === 'error'
                        ? 'text-rose-700'
                        : cloudSyncStatus === 'syncing'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}>
                      <Cloud size={10} className={
                        cloudSyncStatus === 'error'
                          ? 'text-rose-600'
                          : cloudSyncStatus === 'syncing'
                          ? 'text-amber-500 animate-pulse'
                          : 'text-emerald-600'
                      } />
                      <span>
                        {cloudSyncStatus === 'syncing'
                          ? 'Sincronizando...'
                          : cloudSyncStatus === 'error'
                          ? 'Erro na Nuvem'
                          : cloudSyncStatus === 'synced'
                          ? 'Nuvem Conectada'
                          : 'Conectando...'}
                      </span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncingCloud}
                    className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/50 rounded-xl transition-all"
                    title="Baixar e sincronizar apostas da nuvem agora"
                  >
                    <RefreshCw size={13} className={isSyncingCloud ? 'animate-spin' : ''} />
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Desconectar conta Google"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSyncingCloud}
                  className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3 py-2 rounded-2xl text-xs font-black shadow-sm transition-all active:scale-[0.98]"
                  title="Conectar com o Google para salvar suas apostas na nuvem e abrir em qualquer navegador"
                >
                  <Cloud size={14} />
                  <span className="hidden sm:inline">Salvar na Nuvem</span>
                  <span className="sm:hidden">Nuvem</span>
                </button>
              )}
            </div>

            {/* Botão de Controle do Cache Offline & Diagnóstico */}
            <button
              type="button"
              onClick={() => setIsCacheModalOpen(true)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                isOnline
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
              }`}
              title="Gerenciador de Cache Offline (100% autônomo sem internet)"
            >
              <Database size={13} className={isOnline ? 'text-emerald-600' : 'text-amber-600'} />
              <span className="hidden md:inline">
                {isOnline ? 'Cache Offline Pronto' : 'Modo Offline Ativo'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Banner de Aviso de Modo Offline quando sem conexão */}
      {!isOnline && (
        <div className="w-full bg-amber-500 text-amber-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-xs no-print">
          <WifiOff size={15} />
          <span>Modo Offline Ativo: Todas as análises, geradores, sequências e probabilidades estão rodando 100% via cache local.</span>
          <button 
            type="button"
            onClick={() => setIsCacheModalOpen(true)}
            className="underline hover:text-white font-extrabold cursor-pointer ml-1"
          >
            Ver Cache
          </button>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="w-full max-w-6xl px-3 sm:px-6 py-6 flex-grow">
        {/* Campo Permanente: Resultado do Último Sorteio Oficial Caixa Integrado */}
        <div className="mb-6">
          <LatestOfficialDrawCard
            latestDraw={activeOfficialDraw}
            lottery={currentLottery}
            onRefresh={handleRefreshLatestDraw}
            onUpdateDraw={(updated) => {
              if (currentLottery === 'maismilionaria') {
                setLatestMaisMilionariaDraw(updated);
                showToast(`Concurso #${updated.contestNumber} da +Milionária atualizado com sucesso!`, 'success');
              } else {
                handleUpdateLatestDraw(updated);
              }
            }}
            onSimulateProbability={() => openCompare('simulator')}
            onCheckMyBets={() => {
              if (currentLottery === 'maismilionaria') {
                setMaisMilionariaRefDraw(latestMaisMilionariaDraw.numbers);
                if (latestMaisMilionariaDraw.trevos) setMaisMilionariaRefTrevos(latestMaisMilionariaDraw.trevos);
                setTempRefInput(latestMaisMilionariaDraw.numbers.join(', '));
                if (latestMaisMilionariaDraw.trevos) setTempRefTrevosInput(latestMaisMilionariaDraw.trevos.join(', '));
              } else {
                setMegaRefDraw(latestOfficialDraw.numbers);
                setTempRefInput(latestOfficialDraw.numbers.join(', '));
              }
              openMyGames('checker');
            }}
            isRefreshing={isFetchingDraw}
          />
        </div>

        {activeTab === 'play' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lado Esquerdo: Cartela Interativa e Diagnóstico */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8 relative">
                {/* Barra de Controle de Dezenas */}
                <div className="flex flex-wrap justify-between items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                      <span>
                        Cartela Oficial {currentLottery === 'lotofacil' 
                          ? 'Lotofácil (01 a 25 - Marque 15 a 20 dezenas)' 
                          : (currentLottery === 'maismilionaria' ? '+Milionária (01 a 50 + Trevos)' : 'Mega-Sena (01 a 60)')}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentLottery === 'lotofacil'
                        ? 'Toque para marcar suas 15 dezenas (Moldura em destaque) ou use os geradores estatísticos'
                        : 'Toque para marcar suas dezenas ou use os geradores inteligentes'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700">Tamanho:</span>
                    <select 
                      value={betCount} 
                      onChange={(e) => {
                        const newCount = Number(e.target.value);
                        setBetCount(newCount);
                        if (selectedNumbers.length > newCount) {
                          setSelectedNumbers(prev => prev.slice(0, newCount));
                        }
                      }} 
                      className="bg-slate-50 text-slate-900 border border-slate-200 text-xs font-bold py-1.5 px-3 rounded-xl outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      {(currentLottery === 'lotofacil'
                        ? [15, 16, 17, 18, 19, 20]
                        : (currentLottery === 'maismilionaria' 
                          ? [6, 7, 8, 9, 10, 11, 12] 
                          : [6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
                      ).map(n => (
                        <option key={n} value={n}>{n} dezenas</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Bar / Contador de Selecionadas */}
                <div className={`border rounded-2xl p-3 sm:p-4 mb-6 flex flex-wrap items-center justify-between gap-3 ${
                  currentLottery === 'lotofacil'
                    ? 'bg-purple-50/70 border-purple-200/70'
                    : (currentLottery === 'maismilionaria' ? 'bg-amber-50/70 border-amber-200/70' : 'bg-emerald-50/70 border-emerald-200/70')
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl text-white font-black flex items-center justify-center text-sm shadow-sm ${
                      currentLottery === 'lotofacil'
                        ? 'bg-purple-600'
                        : (currentLottery === 'maismilionaria' ? 'bg-amber-600' : 'bg-emerald-600')
                    }`}>
                      {selectedNumbers.length}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {selectedNumbers.length} de {betCount} dezenas selecionadas
                      </p>
                      <p className={`text-[11px] ${
                        currentLottery === 'lotofacil' 
                          ? 'text-purple-800' 
                          : (currentLottery === 'maismilionaria' ? 'text-amber-800' : 'text-emerald-700')
                      }`}>
                        {selectedNumbers.length < betCount 
                          ? `Faltam ${betCount - selectedNumbers.length} para completar o bilhete`
                          : "Bilhete completo pronto para salvar!"}
                      </p>
                    </div>
                  </div>

                  {/* Dezenas Selecionadas Preview */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {selectedNumbers.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Nenhum número marcado</span>
                    ) : (
                      selectedNumbers.map(n => (
                        <span key={n} className={`inline-flex items-center px-2 py-0.5 rounded-lg text-white text-xs font-bold ${
                          currentLottery === 'lotofacil' 
                            ? 'bg-purple-700' 
                            : (currentLottery === 'maismilionaria' ? 'bg-amber-700' : 'bg-emerald-700')
                        }`}>
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))
                    )}
                    {currentLottery === 'maismilionaria' && (
                      <span className="ml-1 text-xs font-mono font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-lg">
                        Trevos: {selectedTrevos.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Grade de Dezenas */}
                {currentLottery === 'lotofacil' ? (
                  <div className="mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
                      <span className="text-[11px] font-bold text-slate-600">
                        Cartela 5x5: <span className="text-purple-700 font-extrabold">Moldura (16 dezenas)</span> e <span className="text-indigo-700 font-extrabold">Centro (9 dezenas)</span>
                      </span>
                      <span className="text-[10px] text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                        Padrão Caixa: 9 a 11 na Moldura
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 max-w-sm sm:max-w-md mx-auto justify-items-center p-3.5 bg-gradient-to-br from-purple-50/60 to-fuchsia-50/40 border border-purple-200/80 rounded-3xl shadow-inner">
                      {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
                        const isFrame = LOTOFACIL_FRAME.includes(num);
                        return (
                          <div key={num} className="relative flex flex-col items-center">
                            <NumberBall 
                              num={num} 
                              isSelected={selectedNumbers.includes(num)} 
                              isHit={activeRefNumbers.includes(num)}
                              onClick={() => toggleNumber(num)} 
                              size="md"
                            />
                            <span className={`text-[8px] font-black uppercase tracking-tighter mt-0.5 ${
                              isFrame ? 'text-purple-600 font-bold' : 'text-indigo-500'
                            }`}>
                              {isFrame ? 'Moldura' : 'Centro'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2 justify-items-center mb-6">
                    {Array.from({ length: currentLottery === 'maismilionaria' ? 50 : 60 }, (_, i) => i + 1).map((num) => (
                      <NumberBall 
                        key={num} 
                        num={num} 
                        isSelected={selectedNumbers.includes(num)} 
                        isHit={activeRefNumbers.includes(num)}
                        onClick={() => toggleNumber(num)} 
                        size="md"
                      />
                    ))}
                  </div>
                )}

                {/* Se for +Milionária, Seletor de 2 Trevos Oficiais */}
                {currentLottery === 'maismilionaria' && (
                  <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-300">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-amber-950 flex items-center gap-1 uppercase tracking-wider">
                          <Clover size={15} className="text-amber-700" />
                          <span>Selecione 2 Trevos Oficiais (1 a 6):</span>
                        </span>
                      </div>
                      <span className="text-xs font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-md border border-amber-300">
                        Trevos Escolhidos: {selectedTrevos.map(t => `🍀 0${t}`).join(' e ')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {[1, 2, 3, 4, 5, 6].map(t => {
                        const isSel = selectedTrevos.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              if (selectedTrevos.includes(t)) {
                                if (selectedTrevos.length > 2) {
                                  setSelectedTrevos(prev => prev.filter(x => x !== t));
                                }
                              } else {
                                if (selectedTrevos.length < 2) {
                                  setSelectedTrevos(prev => [...prev, t].sort((a, b) => a - b));
                                } else {
                                  setSelectedTrevos([selectedTrevos[1], t].sort((a, b) => a - b));
                                }
                              }
                            }}
                            className={`w-12 h-12 rounded-2xl font-mono font-black text-sm flex items-center justify-center border-2 transition-all cursor-pointer shadow-xs ${
                              isSel
                                ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 border-amber-600 scale-105 shadow-md'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-xs mr-0.5">🍀</span>{t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Legenda de cores */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600 mb-6 pt-3 border-t border-slate-100">
                  <span className="flex items-center space-x-1.5">
                    <span className={`w-3.5 h-3.5 rounded-full inline-block ${currentLottery === 'lotofacil' ? 'bg-purple-600 border border-purple-400' : 'bg-emerald-600 border border-emerald-400'}`}></span>
                    <span>Marcado no bilhete</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-yellow-300 inline-block"></span>
                    <span>Sorteio de referência</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300 inline-block"></span>
                    <span>Disponível</span>
                  </span>
                </div>

                {/* Botões de Ação Manual da Cartela (Geração centralizada no painel ao lado) */}
                <div className="flex flex-wrap gap-2.5">
                  <button 
                    type="button"
                    onClick={handleManualSave} 
                    disabled={selectedNumbers.length < (currentLottery === 'lotofacil' ? 15 : 6)} 
                    className={`flex-1 min-w-[200px] text-white py-3.5 px-4 rounded-2xl font-black shadow-md active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center space-x-2 text-xs sm:text-sm ${
                      currentLottery === 'lotofacil'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : (currentLottery === 'maismilionaria' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700')
                    }`}
                  >
                    <Save size={18} />
                    <span>SALVAR APOSTA NO HISTÓRICO</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setSelectedNumbers([])} 
                    disabled={selectedNumbers.length === 0}
                    className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl font-bold hover:bg-red-100 active:scale-[0.99] border border-red-100 disabled:opacity-40 transition-colors flex items-center space-x-1.5 text-xs"
                    title="Limpar dezenas marcadas na cartela"
                  >
                    <RotateCcw size={16} />
                    <span>Limpar</span>
                  </button>
                </div>
              </div>

              {/* HUD / Diagnóstico em Tempo Real (Resumo Limpo + Raio-X Recolhível) */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Activity size={18} className={currentLottery === 'lotofacil' ? 'text-purple-600' : 'text-emerald-600'} />
                    <h3 className="text-sm font-black text-slate-900">
                      Resumo Rápido do Jogo
                    </h3>
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      selectedNumbers.length < (currentLottery === 'lotofacil' ? 15 : 6)
                        ? 'bg-slate-100 text-slate-600 border-slate-200' 
                        : currentValidation.allActiveRulesPassed 
                          ? (currentLottery === 'lotofacil' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300') 
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {selectedNumbers.length < (currentLottery === 'lotofacil' ? 15 : 6)
                        ? `Faltam ${(currentLottery === 'lotofacil' ? 15 : 6) - selectedNumbers.length} dez.` 
                        : `${currentValidation.advancedScore}% • ${currentValidation.passedRulesCount}/${currentValidation.activeRulesCount} regras`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedNumbers.length >= 4 && (
                      <button
                        type="button"
                        onClick={handleAutoOptimizeSelected}
                        disabled={isOptimizing}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-[11px] font-black transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <Sparkles size={12} className={isOptimizing ? 'animate-spin' : ''} />
                        <span>{isOptimizing ? 'Ajustando...' : 'Auto-Otimizar'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowBoardDetails(prev => !prev)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <span>{showBoardDetails ? 'Ocultar Raio-X' : 'Raio-X (14 métricas)'}</span>
                      {showBoardDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Indicadores essenciais sempre visíveis (4 métricas principais) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Soma</span>
                    <span className="text-sm font-black text-slate-900">{currentValidation.sum}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Par / Ímpar</span>
                    <span className="text-sm font-black text-slate-900">{currentValidation.evenCount}P / {currentValidation.oddCount}I</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Consecutivas</span>
                    <span className="text-sm font-black text-slate-900">Máx. {currentValidation.maxConsecutive}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    currentPlausibility.classification === 'anomala'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : currentPlausibility.classification === 'alta'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200/80 text-slate-900'
                  }`}>
                    <span className="text-[10px] font-bold uppercase opacity-75 block">Plausibilidade</span>
                    <span className="text-sm font-black">
                      {selectedNumbers.length < 3 ? '-' : `${currentPlausibility.plausibilityScore}/100`}
                    </span>
                  </div>
                </div>

                {/* Detalhamento completo de 14 cards + Diagnóstico (visível sob demanda) */}
                {showBoardDetails && (
                  <div className="pt-2 border-t border-slate-100 space-y-4">
                {currentLottery === 'lotofacil' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    {/* Moldura x Centro */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      (currentValidation as any).molduraValid ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-red-50/70 border-red-200 text-red-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Moldura (9–11)</span>
                        {(currentValidation as any).molduraValid ? <Check size={14} className="text-purple-600 font-bold" /> : <span className="text-[10px] font-bold text-red-600">Ajustar</span>}
                      </div>
                      <p className="text-base font-black">{(currentValidation as any).molduraCount || 0} Moldura / {(currentValidation as any).centroCount || 0} Centro</p>
                      <span className="text-[10px] opacity-75">Ocorre em 81% dos sorteios</span>
                    </div>

                    {/* Par / Ímpar */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      currentValidation.evenOddValid ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-red-50/70 border-red-200 text-red-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Par / Ímpar</span>
                        {currentValidation.evenOddValid ? <Check size={14} className="text-purple-600" /> : <span className="text-[10px] font-bold text-red-600">7P/8I ou 8P/7I</span>}
                      </div>
                      <p className="text-base font-black">{currentValidation.evenCount}P / {currentValidation.oddCount}I</p>
                      <span className="text-[10px] opacity-75">Equilíbrio da cartela</span>
                    </div>

                    {/* Soma */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      currentValidation.sumValid ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-red-50/70 border-red-200 text-red-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Soma (180–220)</span>
                        {currentValidation.sumValid ? <Check size={14} className="text-purple-600 font-bold" /> : <span className="text-[10px] font-bold text-red-600">Ajustar</span>}
                      </div>
                      <p className="text-base font-black">{currentValidation.sum}</p>
                      <span className="text-[10px] opacity-75">
                        {currentValidation.sum < 180 ? 'Abaixo do ideal' : currentValidation.sum > 220 ? 'Acima do ideal' : 'Na Zona de Ouro'}
                      </span>
                    </div>

                    {/* Repetidas do Concurso Anterior */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      currentValidation.repeatValid ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-red-50/70 border-red-200 text-red-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Repetidas (8–10)</span>
                        {currentValidation.repeatValid ? <Check size={14} className="text-purple-600 font-bold" /> : <span className="text-[10px] font-bold text-red-600">8 a 10</span>}
                      </div>
                      <p className="text-base font-black">{currentValidation.repeatedCount} dezenas</p>
                      <span className="text-[10px] opacity-75">Concurso #{latestLotofacilDraw.contestNumber}</span>
                    </div>

                    {/* Números Primos */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      (currentValidation as any).primesValid ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Primos (5–6)</span>
                        {(currentValidation as any).primesValid && <Check size={14} className="text-purple-600" />}
                      </div>
                      <p className="text-base font-black">{(currentValidation as any).primeCount || 0} primos</p>
                      <span className="text-[10px] opacity-75">Dentre os 9 primos</span>
                    </div>

                    {/* Fibonacci */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      (currentValidation as any).fibonacciValid ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Fibonacci (3–5)</span>
                        {(currentValidation as any).fibonacciValid && <Check size={14} className="text-purple-600" />}
                      </div>
                      <p className="text-base font-black">{(currentValidation as any).fibonacciCount || 0} números</p>
                      <span className="text-[10px] opacity-75">Dentre os 7 de Fibo</span>
                    </div>

                    {/* Múltiplos de 3 */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      (currentValidation as any).mult3Valid ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Mult. de 3 (4–6)</span>
                        {(currentValidation as any).mult3Valid && <Check size={14} className="text-purple-600" />}
                      </div>
                      <p className="text-base font-black">{(currentValidation as any).mult3Count || 0} dezenas</p>
                      <span className="text-[10px] opacity-75">Dentre os 8 múltiplos</span>
                    </div>

                    {/* Consecutivas */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      currentValidation.consecutiveValid ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Seq. Consecutiva</span>
                        {currentValidation.consecutiveValid && <Check size={14} className="text-purple-600" />}
                      </div>
                      <p className="text-base font-black">Máx {currentValidation.maxConsecutive} seguidos</p>
                      <span className="text-[10px] opacity-75">Distribuição fluida</span>
                    </div>
                  </div>
                ) : (
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

                    {/* Histórico Oficial (3.071 Concursos) */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      !logicOptions.preferHistoricalHotNumbers ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                      currentValidation.historicalHotValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Histórico (3.071)</span>
                        {logicOptions.preferHistoricalHotNumbers && (currentValidation.historicalHotValid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-amber-600">2 a 4 Top</span>)}
                      </div>
                      <p className="text-base font-black">{currentValidation.historicalHotCount} no Top 20</p>
                      <span className="text-[10px] opacity-75">Média ~{currentValidation.historicalAverageDraws}x sorteios</span>
                    </div>

                    {/* Duque Histórico (Análise Avançada) */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      !logicOptions.useAdvancedDuques ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                      currentValidation.duquesValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50/70 border-slate-200 text-slate-600'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Duque Histórico</span>
                        {logicOptions.useAdvancedDuques && (currentValidation.duquesValid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] text-slate-400">Opcional</span>)}
                      </div>
                      <p className="text-sm font-black truncate">{currentValidation.matchedDuque ? `${currentValidation.matchedDuque[0].toString().padStart(2, '0')} - ${currentValidation.matchedDuque[1].toString().padStart(2, '0')}` : 'Nenhum'}</p>
                      <span className="text-[10px] opacity-75">{currentValidation.matchedDuqueName ? 'Par histórico forte' : 'Sem duque top 10'}</span>
                    </div>

                    {/* Moldura x Centro (Análise Avançada) */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      !logicOptions.frameAndCenterBalance ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                      currentValidation.frameCenterValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Moldura x Centro</span>
                        {logicOptions.frameAndCenterBalance && (currentValidation.frameCenterValid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-amber-600">3M / 3C</span>)}
                      </div>
                      <p className="text-base font-black">{currentValidation.frameCount}M / {currentValidation.centerCount}C</p>
                      <span className="text-[10px] opacity-75">Padrão de 76% dos sorteios</span>
                    </div>

                    {/* Primos & Fibonacci (Análise Avançada) */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      !logicOptions.balancePrimesAndFibonacci ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                      currentValidation.primesValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-200 text-red-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Primos & Fibo</span>
                        {logicOptions.balancePrimesAndFibonacci && (currentValidation.primesValid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-red-600">1 a 3</span>)}
                      </div>
                      <p className="text-base font-black">{currentValidation.primesCount} Primos • {currentValidation.fibonacciCount} Fib</p>
                      <span className="text-[10px] opacity-75">Equilíbrio numérico</span>
                    </div>

                    {/* Top Pareto 80/20 & Ciclo */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      !logicOptions.paretoTopSelection ? 'bg-slate-50/50 border-slate-200 text-slate-400' :
                      currentValidation.paretoValid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Top Pareto & Ciclo</span>
                        {logicOptions.paretoTopSelection && (currentValidation.paretoValid ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-amber-600">1 a 3</span>)}
                      </div>
                      <p className="text-base font-black">{currentValidation.paretoCount} Pareto • {currentValidation.cycleMissingCount} Ciclo</p>
                      <span className="text-[10px] opacity-75">Score Analítico: {currentValidation.advancedScore}%</span>
                    </div>

                    {/* Entropia de Shannon (Dispersão Orgânica) */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      currentValidation.entropyLabel !== 'Baixa' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Entropia (Shannon)</span>
                        {currentValidation.entropyLabel !== 'Baixa' ? <Check size={14} className="text-emerald-600" /> : <span className="text-[10px] font-bold text-amber-600">Dispersar</span>}
                      </div>
                      <p className="text-base font-black">{currentValidation.shannonEntropy} bits</p>
                      <span className="text-[10px] opacity-75">{currentValidation.entropyLabel} Dispersão</span>
                    </div>

                    {/* Pressão de Atraso (Z-Score) */}
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      currentValidation.hasHighPressureDezena ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 'bg-slate-50/70 border-slate-200 text-slate-700'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] uppercase">Pressão de Atraso</span>
                        <span className="text-[10px] font-bold text-blue-700">Z: {currentValidation.delayZScoreMax}</span>
                      </div>
                      <p className="text-sm font-black truncate">{currentValidation.hasHighPressureDezena ? '⚡ Dezenas em Pressão' : 'Normalidade Histórica'}</p>
                      <span className="text-[10px] opacity-75">μ=9.8 concursos</span>
                    </div>
                  </div>
                )}

                {/* Banner de Diagnóstico de Plausibilidade Histórica (Macro-Clusters vs 1,2,3,4,5,6) */}
                {selectedNumbers.length >= 3 && currentPlausibility.classification === 'anomala' && (
                  <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 space-y-2.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-7 h-7 rounded-xl bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          !
                        </span>
                        <div>
                          <span className="text-xs font-black text-rose-950 block">
                            Alerta de Plausibilidade: Combinação Anômala ({currentPlausibility.plausibilityScore}/100)
                          </span>
                          <span className="text-[11px] text-rose-800">
                            {currentPlausibility.summaryVerdict}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoOptimizeSelected}
                        disabled={isOptimizing}
                        className="self-start sm:self-auto px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shrink-0 transition shadow-xs cursor-pointer flex items-center space-x-1"
                      >
                        <Sparkles size={13} className={isOptimizing ? 'animate-spin' : ''} />
                        <span>Centralizar no Cluster Mais Provável</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-rose-800/90 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-rose-200">
                      <strong>Por que sequências como 1,2,3,4,5,6 devem ser evitadas?</strong> Toda aposta unitária possui 1 em 50M de chance matemática teórica no papel, mas os <em>macro-estados estruturais</em> são absurdamente desiguais. Sequências de 4+ consecutivos ou somas extremas somam menos de 0,001% dos concursos da história, enquanto mais de <strong>82% dos sorteios reais da Caixa</strong> ocorrem no Cluster Central equilibrado.
                    </div>
                  </div>
                )}

                {selectedNumbers.length >= (currentLottery === 'lotofacil' ? 10 : 5) && currentPlausibility.classification === 'alta' && (
                  <div className="mt-4 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-300/80 text-emerald-950 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                        ✓
                      </span>
                      <span className="text-xs font-bold text-emerald-950">
                        Cluster de Alta Plausibilidade Histórica ({currentPlausibility.plausibilityScore}/100) • Alinhado com 82% dos sorteios da Caixa
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                      Padrão Ouro
                    </span>
                  </div>
                )}

                {/* Painel Dinâmico de Sugestões de Ajuste em Tempo Real & Diagnóstico Matemático */}
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-slate-50 border border-emerald-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
                        💡
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-emerald-950 flex items-center space-x-2">
                          <span>Diagnóstico Matemático &amp; Dicas de Ouro</span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                            {currentValidation.advancedScore}% Conformidade
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-600 font-medium">
                          Entropia: <strong>{currentValidation.shannonEntropy} bits ({currentValidation.entropyLabel})</strong> • χ² Empírico: <strong>{currentValidation.chiSquareConformity}%</strong> • Lift Médio: <strong>{currentValidation.cooccurrenceLiftAvg}x</strong>
                        </p>
                      </div>
                    </div>

                    {selectedNumbers.length >= 4 && (
                      <button
                        type="button"
                        onClick={handleAutoOptimizeSelected}
                        disabled={isOptimizing}
                        className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                        title="Ajusta e equilibra automaticamente para 100% de conformidade com a Análise Avançada"
                      >
                        <Sparkles size={13} className={isOptimizing ? 'animate-spin' : ''} />
                        <span>{isOptimizing ? 'Otimizando...' : 'Auto-Otimizar Jogo'}</span>
                      </button>
                    )}
                  </div>

                  {/* Dicas e Pontos Fortes */}
                  <div className="space-y-2 text-xs">
                    {currentValidation.smartSuggestions && currentValidation.smartSuggestions.length > 0 && (
                      <div className="space-y-1">
                        {currentValidation.smartSuggestions.map((sug, i) => (
                          <div key={i} className="flex items-start space-x-2 text-amber-900 bg-amber-50/90 border border-amber-200/80 p-2.5 rounded-xl text-[11px] leading-tight">
                            <span className="text-amber-600 font-bold flex-shrink-0">⚠️</span>
                            <span>{sug}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentValidation.strengths && currentValidation.strengths.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {currentValidation.strengths.slice(0, 4).map((str, i) => (
                          <div key={i} className="flex items-center space-x-1.5 text-emerald-900 bg-emerald-50/70 border border-emerald-200/60 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold leading-tight">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span className="truncate">{str}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lado Direito: Central Unificada de Geração + Regras Selecionáveis */}
            <div className="lg:col-span-4 space-y-6">
              {/* Bloco Único Centralizado: Central de Geração de Jogos */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Cabeçalho do Bloco Centralizado */}
                <div className={`p-4 sm:p-5 text-white ${
                  currentLottery === 'lotofacil'
                    ? 'bg-gradient-to-r from-purple-700 to-indigo-800'
                    : currentLottery === 'maismilionaria'
                    ? 'bg-gradient-to-r from-amber-700 to-slate-900'
                    : 'bg-gradient-to-r from-emerald-700 via-emerald-800 to-slate-900'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                        <Zap size={17} className="text-emerald-200" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black tracking-tight">Central de Geração de Jogos</h3>
                        <p className="text-[11px] text-white/80 font-medium">
                          {currentLottery === 'lotofacil' ? 'Lotofácil' : currentLottery === 'maismilionaria' ? '+Milionária' : 'Mega-Sena'} · Base #{activeOfficialDraw.contestNumber}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-white/15 px-2 py-0.5 rounded-md">
                      Todos os Geradores
                    </span>
                  </div>

                  {/* Abas de Modo de Geração em 1 Único Lugar */}
                  <div className="grid grid-cols-3 gap-1.5 mt-4 p-1 bg-black/20 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setGenerationModeTab('portfolio')}
                      className={`py-2 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                        generationModeTab === 'portfolio'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-white/85 hover:bg-white/10'
                      }`}
                    >
                      <Layers size={13} />
                      <span>Carteira</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenerationModeTab('single')}
                      className={`py-2 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                        generationModeTab === 'single'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-white/85 hover:bg-white/10'
                      }`}
                    >
                      <Zap size={13} />
                      <span>1 Jogo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenerationModeTab('ai')}
                      className={`py-2 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                        generationModeTab === 'ai'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-white/85 hover:bg-white/10'
                      }`}
                    >
                      <Sparkles size={13} />
                      <span>IA Gemini</span>
                    </button>
                  </div>
                </div>

                {/* Corpo do Bloco Centralizado */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Seletor de Estratégia Matemática Simplificado + Modo Especialista Recolhível */}
                  {generationModeTab !== 'ai' && (() => {
                    const activeStrategy = logicOptions.calculationStrategy || 'combinatorial_cover';
                    const isExperimentalActive = ['momentum', 'cycle_delay', 'cooccurrence', 'entropy_shannon'].includes(activeStrategy);
                    const activeSubPool = logicOptions.portfolioSubPoolSize ?? 60;

                    const comb = (n: number, r: number): number => {
                      if (r > n || r < 0) return 0;
                      let num = 1;
                      let den = 1;
                      const eff = Math.min(r, n - r);
                      for (let i = 1; i <= eff; i++) {
                        num *= n - i + 1;
                        den *= i;
                      }
                      return num / den;
                    };
                    const total60 = comb(60, 6);
                    let pAtLeast3 = 0;
                    let p6 = 0;
                    if (activeSubPool >= 60) {
                      pAtLeast3 = 100;
                      p6 = 100;
                    } else {
                      for (let hit = 3; hit <= 6; hit++) {
                        pAtLeast3 += (comb(activeSubPool, hit) * comb(60 - activeSubPool, 6 - hit)) / total60;
                      }
                      pAtLeast3 *= 100;
                      p6 = (comb(activeSubPool, 6) / total60) * 100;
                    }

                    return (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                            Estratégia Principal:
                          </label>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Sem Duplicatas + Teto/Dezena
                          </span>
                        </div>

                        {/* Estratégias principais */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                          {(['hybrid_combinatorial', 'combinatorial_cover', 'balanced'] as const).map(id => {
                            const meta = STRATEGY_CATALOG[id];
                            const isActive = activeStrategy === id;
                            const label = id === 'hybrid_combinatorial' ? `🧬 ${meta.shortName} (Nova)` : id === 'combinatorial_cover' ? `🛡️ ${meta.shortName}` : meta.badge;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => setLogicOptions(prev => ({ ...prev, calculationStrategy: id }))}
                                className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                                  isActive
                                    ? 'border-emerald-500 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-500'
                                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-black text-[11px] text-slate-900 truncate">{label}</span>
                                  {isActive && <Check size={12} className="text-emerald-700 shrink-0" />}
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">{meta.description}</p>
                              </button>
                            );
                          })}
                        </div>

                        {/* Perfil Combinatório Auditado (visível quando Mega-Sena + Carteira + Anti-Colisão) */}
                        {generationModeTab === 'portfolio' && currentLottery === 'megasena' && activeStrategy === 'combinatorial_cover' && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-700 block">
                              Perfil Combinatório (Auditado em 1,05M sorteios):
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setLogicOptions(prev => ({ ...prev, strictPlausibilityFilter: true, portfolioSubPoolSize: 60 }))}
                                className={`px-2 py-1.5 rounded-lg text-left border cursor-pointer transition-all ${
                                  logicOptions.strictPlausibilityFilter !== false
                                    ? 'bg-indigo-700 text-white border-indigo-700'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <span className="text-[10px] font-black block">Plausível (Terno 61,61%)</span>
                                <span className={`text-[9px] block ${logicOptions.strictPlausibilityFilter !== false ? 'text-indigo-100' : 'text-slate-500'}`}>
                                  Pares 60,1% · Quadra 3,37%
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setLogicOptions(prev => ({ ...prev, strictPlausibilityFilter: false, portfolioSubPoolSize: 60 }))}
                                className={`px-2 py-1.5 rounded-lg text-left border cursor-pointer transition-all ${
                                  logicOptions.strictPlausibilityFilter === false
                                    ? 'bg-indigo-700 text-white border-indigo-700'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <span className="text-[10px] font-black block">Cobertura Pura (Quadra 3,42%)</span>
                                <span className={`text-[9px] block ${logicOptions.strictPlausibilityFilter === false ? 'text-indigo-100' : 'text-slate-500'}`}>
                                  99,97% quadras · Plaus OFF
                                </span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Gaveta Recolhível: Estratégias Experimentais & Sub-Pool */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60">
                          <button
                            type="button"
                            onClick={() => setShowExperimentalStrategies(prev => !prev)}
                            className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <span>Modo Especialista (Outras 4 Estratégias{currentLottery === 'megasena' && generationModeTab === 'portfolio' ? ' + Sub-Pool' : ''})</span>
                              {(isExperimentalActive || activeSubPool !== 60) && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black">
                                  Ativo
                                </span>
                              )}
                            </span>
                            {showExperimentalStrategies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {showExperimentalStrategies && (
                            <div className="p-2.5 pt-1 space-y-2.5 border-t border-slate-200/80 bg-white">
                              <div className="grid grid-cols-2 gap-1.5">
                                {(['momentum', 'cycle_delay', 'cooccurrence', 'entropy_shannon'] as const).map(id => {
                                  const meta = STRATEGY_CATALOG[id];
                                  const isActive = activeStrategy === id;
                                  return (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() => setLogicOptions(prev => ({ ...prev, calculationStrategy: id }))}
                                      className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                                        isActive
                                          ? 'border-emerald-500 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-500'
                                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-black text-[11px] text-slate-900 truncate">{meta.badge}</span>
                                        {isActive && <Check size={12} className="text-emerald-700 shrink-0" />}
                                      </div>
                                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">{meta.description}</p>
                                    </button>
                                  );
                                })}
                              </div>

                              {currentLottery === 'megasena' && generationModeTab === 'portfolio' && activeStrategy === 'combinatorial_cover' && (
                                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                                    <span>Sub-Pool de Concentração:</span>
                                    <span className="text-emerald-700 font-black">
                                      {activeSubPool === 60 ? '60/60 (Padrão)' : `${activeSubPool}/60 Dez.`}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-5 gap-1">
                                    {[60, 42, 36, 30, 24].map(k => (
                                      <button
                                        key={k}
                                        type="button"
                                        onClick={() => setLogicOptions(prev => ({ ...prev, portfolioSubPoolSize: k }))}
                                        className={`py-1 rounded-lg text-[10px] font-black border cursor-pointer transition-all ${
                                          activeSubPool === k
                                            ? 'bg-emerald-700 text-white border-emerald-700'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {k === 60 ? '60' : k}
                                      </button>
                                    ))}
                                  </div>
                                  {activeSubPool < 60 && (
                                    <p className="text-[10px] text-slate-600 leading-snug">
                                      P(&ge;3 no pool) = <strong>{pAtLeast3.toFixed(1)}%</strong> · P(Sena no pool) = <strong>{p6.toFixed(2)}%</strong> (reduz pares totais vs K=60).
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Aba 1: Carteira Otimizada (Botão Principal de Lote) */}
                  {generationModeTab === 'portfolio' && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Quantidade de Jogos Únicos:</span>
                        <div className="flex items-center gap-1">
                          {[10, 30, 55, 78].map(sz => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setPortfolioBatchSize(sz)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer transition-all ${
                                portfolioBatchSize === sz
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGeneratePortfolioBatch}
                        disabled={isRuleGenerating}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
                      >
                        <Layers size={16} className="text-emerald-400" />
                        <span>GERAR CARTEIRA DE {portfolioBatchSize} JOGOS ÚNICOS</span>
                      </button>

                      {lastBatchCoverage && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-[10px] text-emerald-950 font-semibold space-y-0.5">
                          <div className="flex justify-between">
                            <span>Distintos: <strong>{lastBatchCoverage.distinctGames}/{lastBatchCoverage.totalGames}</strong></span>
                            <span>Dezenas: <strong>{lastBatchCoverage.distinctNumbers}/{lastBatchCoverage.subPoolSize ?? 60}</strong></span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pares Únicos: <strong>{lastBatchCoverage.uniquePairs} ({lastBatchCoverage.pairCoveragePct.toFixed(1)}%)</strong></span>
                            <span>
                              Gini: <strong>{lastBatchCoverage.giniCoefficient.toFixed(3)}</strong>
                              {typeof lastBatchCoverage.maxFreq === 'number' ? <> · Máx: <strong>{lastBatchCoverage.maxFreq}x</strong></> : null}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aba 2: 1 Jogo / Preencher Cartela / Surpresinha */}
                  {generationModeTab === 'single' && (
                    <div className="space-y-2.5 pt-1">
                      <button 
                        type="button"
                        onClick={handleQuickRuleGenerate}
                        disabled={isRuleGenerating}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
                      >
                        <Zap size={16} />
                        <span>GERAR E SALVAR 1 JOGO</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleFillBoardWithRules}
                          disabled={isRuleGenerating}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <Grid3X3 size={14} className="text-emerald-700" />
                          <span>Preencher Cartela</span>
                        </button>

                        <button 
                          type="button"
                          onClick={generateSurpresinha} 
                          className="bg-slate-100 text-slate-800 py-2.5 px-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center space-x-1.5 text-xs cursor-pointer"
                        >
                          <Dice5 size={15} />
                          <span>Surpresinha</span>
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-snug">
                        “Preencher Cartela” marca as dezenas à esquerda sem salvar ainda; “Gerar e Salvar 1 Jogo” e “Surpresinha” já registram no Histórico.
                      </p>
                    </div>
                  )}

                  {/* Aba 3: Geração via Inteligência Artificial (Gemini) */}
                  {generationModeTab === 'ai' && (
                    <div className="space-y-3 pt-1">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                        <p className="font-bold text-slate-900 mb-1">
                          {currentLottery === 'lotofacil'
                            ? 'Zona de Ouro Lotofácil (180–220)'
                            : currentLottery === 'maismilionaria'
                            ? 'Zona de Ouro +Milionária (130–175)'
                            : 'Zona de Ouro Mega-Sena (160–240)'}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Consulta o Concurso Oficial <strong>#{activeOfficialDraw.contestNumber}</strong> ({activeOfficialDraw.numbers.map(n => n.toString().padStart(2, '0')).join(' ')}) e aplica as regras ativas com desduplicação garantida.
                        </p>
                      </div>

                      <button 
                        type="button"
                        onClick={generateAI} 
                        disabled={isLoading || isBatchLoading} 
                        className={`w-full text-white py-3.5 px-4 rounded-2xl font-black shadow-md active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-xs sm:text-sm disabled:opacity-60 cursor-pointer ${
                          currentLottery === 'lotofacil'
                            ? 'bg-purple-700 hover:bg-purple-800'
                            : currentLottery === 'maismilionaria'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-emerald-700 hover:bg-emerald-800'
                        }`}
                      >
                        {isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span className="text-xs font-bold uppercase">{loadingStatus}</span>
                          </div>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>GERAR 1 JOGO COM IA</span>
                          </>
                        )}
                      </button>

                      <button 
                        type="button"
                        onClick={generateBatchAI} 
                        disabled={isLoading || isBatchLoading} 
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isBatchLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Layers size={15} />
                            <span>COMBO 5 JOGOS VARIADOS (IA)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Regras Estatísticas e Análise Avançada Selecionáveis (Recolhível) */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualRules(prev => !prev)}
                    className="flex items-center gap-2 text-left cursor-pointer flex-1"
                  >
                    <SlidersHorizontal size={17} className="text-emerald-600 shrink-0" />
                    <div>
                      <h3 className="text-sm font-black text-emerald-950">
                        Ajustes Finos &amp; Regras Manuais
                      </h3>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        {activeRulesCount} de 15 regras ativas
                        {logicOptions.useTernoStatsBoost && logicOptions.ternoBoostProfile?.lottery === currentLottery ? ' · Reforço Terno+ ON' : ''}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    {showManualRules && (
                      <div className="flex space-x-1">
                        <button 
                          type="button"
                          onClick={() => toggleAllRules(true)}
                          className="text-emerald-700 hover:underline px-1.5 py-0.5 cursor-pointer"
                        >
                          Todas
                        </button>
                        <span className="text-slate-300">|</span>
                        <button 
                          type="button"
                          onClick={() => toggleAllRules(false)}
                          className="text-slate-500 hover:underline px-1.5 py-0.5 cursor-pointer"
                        >
                          Nenhuma
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowManualRules(prev => !prev)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showManualRules ? 'Recolher' : 'Configurar'}</span>
                      {showManualRules ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {showManualRules && (
                  <div className="pt-2 border-t border-slate-100 space-y-4">
                {/* Subseção: Pilares da Análise Avançada (3.071 Concursos) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                    Pilares da Análise Avançada Oficial
                  </span>

                  {/* Avançada 1: Duques */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors bg-amber-50/30 border border-amber-100/60">
                    <input 
                      type="checkbox" 
                      checked={Boolean(logicOptions.useAdvancedDuques)} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, useAdvancedDuques: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Duques da Mega-Sena (Pares Históricos)</span>
                      <span className="text-[10px] text-slate-500">Sorteia duplas com maior afinidade comprovada (ex: 10-53, 33-42, 05-37)</span>
                    </div>
                  </label>

                  {/* Avançada 2: Moldura x Centro */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={Boolean(logicOptions.frameAndCenterBalance)} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, frameAndCenterBalance: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Equilíbrio Moldura x Centro</span>
                      <span className="text-[10px] text-slate-500">Distribui 2–4 na moldura e 2–4 no centro (76% dos sorteios)</span>
                    </div>
                  </label>

                  {/* Avançada 3: Primos e Fibonacci */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={Boolean(logicOptions.balancePrimesAndFibonacci)} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, balancePrimesAndFibonacci: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Primos & Fibonacci Balanceados</span>
                      <span className="text-[10px] text-slate-500">Exige 1 a 3 primos e até 2 de Fibonacci (88% dos sorteios)</span>
                    </div>
                  </label>

                  {/* Avançada 4: Pareto */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={Boolean(logicOptions.paretoTopSelection)} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, paretoTopSelection: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Princípio de Pareto (Top 12 Dezenas)</span>
                      <span className="text-[10px] text-slate-500">Contempla 1 a 3 dezenas do Top 20% histórico que concentra mais prêmios</span>
                    </div>
                  </label>

                  {/* Avançada 5: Ciclo Atual */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={Boolean(logicOptions.includeCycleDezenas)} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, includeCycleDezenas: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Dezenas Faltantes do Ciclo Atual</span>
                      <span className="text-[10px] text-slate-500">Prioriza dezenas em busca do fechamento do ciclo corrente</span>
                    </div>
                  </label>

                  {/* Avançada 6: Múltiplos de 3 */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={Boolean(logicOptions.multiplesOfThreeBalance)} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, multiplesOfThreeBalance: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Múltiplos de Três</span>
                      <span className="text-[10px] text-slate-500">Exige 1 a 3 números múltiplos de 3 (83,4% de frequência)</span>
                    </div>
                  </label>

                  {/* Avançada 7: Linhas e Colunas */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={Boolean(logicOptions.rowAndColDispersion)} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, rowAndColDispersion: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Dispersão em Linhas & Colunas</span>
                      <span className="text-[10px] text-slate-500">No máximo 2 dezenas na mesma linha ou coluna da cartela</span>
                    </div>
                  </label>
                </div>

                {/* Subseção: Regras Clássicas da Cartela */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                    Regras Fundamentais da Cartela
                  </span>

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
                      <span className="text-[10px] text-slate-500">Zona de Ouro onde ocorrem mais de 78% dos prêmios</span>
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

                  {/* Regra 8 - Histórico Oficial */}
                  <label className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-emerald-50/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={Boolean(logicOptions.preferHistoricalHotNumbers)} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, preferHistoricalHotNumbers: e.target.checked })} 
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Priorizar Top Histórico Oficial</span>
                      <span className="text-[10px] text-slate-500">Favorece dezenas mais sorteadas em todos os concursos oficiais</span>
                    </div>
                  </label>

                  {/* Regra 9 - Filtro de Plausibilidade Histórica (Centralizar nos clusters de máxima densidade) */}
                  <label className="flex items-start space-x-2.5 p-2.5 rounded-xl hover:bg-indigo-50/70 cursor-pointer transition-colors border border-indigo-200/80 bg-indigo-50/30 col-span-1 sm:col-span-2">
                    <input 
                      type="checkbox" 
                      checked={logicOptions.strictPlausibilityFilter !== false} 
                      onChange={(e) => setLogicOptions({ ...logicOptions, strictPlausibilityFilter: e.target.checked })} 
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" 
                    />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-black text-indigo-950 block">Filtro de Plausibilidade Histórica (Centralizar nos Clusters Mais Prováveis)</span>
                        <span className="text-[9px] font-black uppercase bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded-full">Recomendado</span>
                      </div>
                      <span className="text-[10px] text-slate-600 block mt-0.5">
                        Descarta automaticamente sequências anômalas (ex: 1,2,3,4,5,6, somas extremas ou assimetrias raras) e centraliza os jogos gerados no cluster que abrange mais de 82% dos resultados reais da Caixa.
                      </span>
                    </div>
                  </label>
                  {/* Regra 10 - Reforço Estatístico das Simulações que Acertaram Terno (3+ dezenas) */}
                  <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 col-span-1 sm:col-span-2 space-y-1.5">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(logicOptions.useTernoStatsBoost && logicOptions.ternoBoostProfile?.lottery === currentLottery)}
                        disabled={!logicOptions.ternoBoostProfile || logicOptions.ternoBoostProfile.lottery !== currentLottery}
                        onChange={(e) => setLogicOptions({ ...logicOptions, useTernoStatsBoost: e.target.checked })}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 disabled:opacity-40"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-black text-emerald-950">
                            Reforço por Simulações de Terno ({currentLottery === 'lotofacil' ? '11+ Acertos' : '3+ Dezenas'})
                          </span>
                          <button
                            type="button"
                            onClick={() => openCompare('backtesting')}
                            className="text-[11px] font-black text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                          >
                            {logicOptions.ternoBoostProfile?.lottery === currentLottery ? 'Recalibrar no Backtesting' : 'Capturar no Backtesting'}
                          </button>
                        </div>
                        {logicOptions.ternoBoostProfile?.lottery === currentLottery ? (
                          <span className="text-[10px] text-slate-600 block mt-0.5 tabular-nums">
                            Base: {logicOptions.ternoBoostProfile.ternoSimulationsCount} de {logicOptions.ternoBoostProfile.sourceSimulationsCount} simulações · Soma {logicOptions.ternoBoostProfile.targetSumMin}–{logicOptions.ternoBoostProfile.targetSumMax} · Foco: {logicOptions.ternoBoostProfile.matchedHotNumbers.slice(0, 6).map(n => n.toString().padStart(2, '0')).join(', ')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Execute o Backtesting (ou use a aba Conferir) para extrair as estatísticas das combinações que acertaram o Terno e usá-las no Gerador e na Análise Avançada.
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Aba: Análises Unificadas (Estatísticas Avançadas, Sequências Consecutivas & IA Coaching) */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setAnalyticsSubTab('stats')}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  analyticsSubTab === 'stats'
                    ? (currentLottery === 'lotofacil' ? 'bg-purple-600 text-white shadow-md' : (currentLottery === 'maismilionaria' ? 'bg-amber-600 text-white shadow-md' : 'bg-emerald-700 text-white shadow-md'))
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BarChart3 size={17} />
                <span>Estatísticas Avançadas</span>
              </button>

              <button
                type="button"
                onClick={() => setAnalyticsSubTab('sequences')}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  analyticsSubTab === 'sequences'
                    ? (currentLottery === 'lotofacil' ? 'bg-purple-600 text-white shadow-md' : (currentLottery === 'maismilionaria' ? 'bg-amber-600 text-white shadow-md' : 'bg-emerald-700 text-white shadow-md'))
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowRight size={17} />
                <span>Sequências Consecutivas</span>
              </button>

              <button
                type="button"
                onClick={() => setAnalyticsSubTab('coaching')}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  analyticsSubTab === 'coaching'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-purple-700 hover:bg-purple-50'
                }`}
              >
                <BrainCircuit size={17} />
                <span>IA Coaching</span>
              </button>
            </div>

            {analyticsSubTab === 'stats' && (
              <AdvancedAnalyticsView 
                latestDraw={activeOfficialDraw} 
                lottery={currentLottery}
                history={history.filter(b => (b.lottery || 'megasena') === currentLottery)}
                ternoBoostProfile={
                  logicOptions.useTernoStatsBoost && logicOptions.ternoBoostProfile?.lottery === currentLottery
                    ? logicOptions.ternoBoostProfile
                    : undefined
                }
                onDisableTernoBoost={() => {
                  setLogicOptions(prev => ({ ...prev, useTernoStatsBoost: false }));
                  showToast("Reforço por simulações de Terno desativado.", 'info');
                }}
                onGoToBacktesting={() => openCompare('backtesting')}
              />
            )}

            {analyticsSubTab === 'sequences' && (
              <SequenceAnalyticsView
                latestDraw={activeOfficialDraw}
                lottery={currentLottery}
                onAddBet={(numbers, type, reasoning) => {
                  saveBet(type as any, numbers, reasoning);
                  showToast("Aposta validada salva na sua carteira com sucesso!", 'success');
                  openMyGames('history');
                }}
              />
            )}

            {analyticsSubTab === 'coaching' && (
              <AICoachingPanel 
                history={history}
                currentLottery={currentLottery}
                latestDraw={activeOfficialDraw}
                onApplyCoachingToGenerator={() => {
                  setLogicOptions(prev => ({ 
                    ...prev, 
                    repeat1to2: true, 
                    balanceEvenOdd: true, 
                    sum160to240: true, 
                    calculationStrategy: 'balanced' 
                  }));
                  showToast("Estratégia balanceada do Coach aplicada ao gerador!");
                }}
                onNavigateToPlay={() => setActiveTab('play')}
              />
            )}
          </div>
        )}

        {/* Aba do Simulador de Fechamentos / Desdobramentos Econômicos */}
        {activeTab === 'wheeling' && (
          <WheelingSimulatorView
            latestDraw={activeOfficialDraw}
            lottery={currentLottery}
            onSaveBatchBets={(games, reason) => {
              games.forEach(g => {
                saveBet('smart_rules', g, reason);
              });
              showToast(`${games.length} jogos do fechamento adicionados à sua carteira com sucesso!`, 'success');
              openMyGames('history');
            }}
          />
        )}

        {/* Aba Unificada: Comparar & Simular (Direta, Probabilidades, Backtesting & Auditoria Prospectiva) */}
        {activeTab === 'compare' && (
          <GameComparatorView
            savedBets={history.filter(b => !b.lottery || b.lottery === currentLottery)}
            lottery={currentLottery}
            logicOptions={logicOptions}
            onUpdateLogicOptions={(updated) => {
              setLogicOptions(updated);
              showToast("Estratégia calibrada aplicada ao Gerador Inteligente!", 'success');
            }}
            latestDraw={activeOfficialDraw}
            betCount={betCount}
            onAddBet={(numbers, type, reasoning, trevos) => {
              saveBet(type, numbers, reasoning, undefined, undefined, trevos);
              showToast("Aposta adicionada à sua carteira com sucesso!", 'success');
            }}
            onSavePortfolioToHistory={(games, label) => {
              saveBetsBatch(
                games.map((numbers, idx) => ({
                  type: 'smart_rules',
                  numbers,
                  reasoning: `${label} • Jogo #${idx + 1}/${games.length}`
                }))
              );
              showToast(`${games.length} jogos salvos no seu histórico!`, 'success');
            }}
            onGoToGenerator={() => setActiveTab('play')}
            requestedSubMode={compareSubModeRequest}
          />
        )}

        {/* Aba Unificada: Meus Jogos (Histórico Permanente, Conferidor Oficial & Ranking) */}
        {activeTab === 'my_games' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setMyGamesSubTab('history')}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  myGamesSubTab === 'history'
                    ? (currentLottery === 'lotofacil' ? 'bg-purple-600 text-white shadow-md' : (currentLottery === 'maismilionaria' ? 'bg-amber-600 text-white shadow-md' : 'bg-emerald-700 text-white shadow-md'))
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <History size={17} />
                <span>Histórico ({filteredHistory.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMyGamesSubTab('checker')}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  myGamesSubTab === 'checker'
                    ? (currentLottery === 'lotofacil' ? 'bg-purple-600 text-white shadow-md' : (currentLottery === 'maismilionaria' ? 'bg-amber-600 text-white shadow-md' : 'bg-emerald-700 text-white shadow-md'))
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Award size={17} />
                <span>Conferidor Oficial</span>
              </button>

              <button
                type="button"
                onClick={() => setMyGamesSubTab('ranking')}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  myGamesSubTab === 'ranking'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <Trophy size={17} />
                <span>Ranking de Jogos</span>
              </button>
            </div>

            {myGamesSubTab === 'history' && (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-slate-100 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-emerald-950 flex items-center space-x-2">
                  <History size={24} className="text-emerald-600" />
                  <span>Seu Histórico de Jogos</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentUser 
                    ? `Sincronização em nuvem Google ativa • ${filteredHistory.length} de ${history.length} apostas disponíveis`
                    : `Armazenamento local • ${filteredHistory.length} de ${history.length} apostas exibidas`}
                </p>
              </div>

              {/* Ações de Backup & Exportação */}
              <div className="flex flex-wrap gap-2 items-center">
                <button 
                  type="button"
                  onClick={() => openCompare('simulator')}
                  disabled={history.length === 0}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center space-x-1.5 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all shadow-sm"
                  title="Simular a chance real de acerto (Quadra, Quina e Sena) para o próximo sorteio"
                >
                  <Calculator size={15} /> <span>SIMULAR PROBABILIDADES</span>
                </button>

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
                  onClick={handleClearHistory} 
                  disabled={history.length === 0}
                  className="text-red-500 hover:text-red-700 font-bold text-xs p-2 rounded-lg hover:bg-red-50 flex items-center space-x-1 disabled:opacity-30 transition-colors"
                  title="Limpar histórico"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Banner de Sincronização em Nuvem Multi-Navegador */}
            <div className={`rounded-2xl p-4 mb-6 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              currentUser && cloudSyncStatus === 'error'
                ? 'bg-rose-50 border-rose-200'
                : currentUser 
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/90' 
                : 'bg-gradient-to-r from-slate-50 to-emerald-50/40 border-slate-200'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-xl mt-0.5 ${
                  currentUser && cloudSyncStatus === 'error'
                    ? 'bg-rose-600 text-white'
                    : currentUser
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  <Cloud size={18} />
                </div>
                <div>
                  <h4 className={`text-xs sm:text-sm font-black flex items-center space-x-1.5 ${
                    currentUser && cloudSyncStatus === 'error' ? 'text-rose-950' : 'text-emerald-950'
                  }`}>
                    <span>
                      {!currentUser
                        ? 'Acesse suas Apostas em Qualquer Navegador'
                        : cloudSyncStatus === 'error'
                        ? 'Falha ao Carregar Apostas da Nuvem'
                        : cloudSyncStatus === 'syncing'
                        ? 'Sincronizando Apostas da Nuvem...'
                        : 'Nuvem Conectada: Apostas Sincronizadas'}
                    </span>
                    {currentUser && cloudSyncStatus === 'synced' && <Check size={14} className="text-emerald-600" />}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 max-w-xl">
                    {!currentUser ? (
                      <>
                        Atualmente suas apostas estão salvas apenas neste navegador. Conecte com o Google para salvar na nuvem e abrir suas apostas salvas em qualquer computador, celular ou navegador!
                      </>
                    ) : cloudSyncStatus === 'error' && cloudSyncError ? (
                      <span className="text-rose-800 font-semibold">{cloudSyncError}</span>
                    ) : (
                      <>
                        Suas apostas estão sincronizadas na conta <strong>{currentUser.email}</strong>. Total salvo: <strong>{history.length}</strong> jogo(s) (Mega-Sena: {lotteryCounts.megasena} • +Milionária: {lotteryCounts.maismilionaria} • Lotofácil: {lotteryCounts.lotofacil}).
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-center">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncingCloud}
                    className="bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
                  >
                    <RefreshCw size={13} className={isSyncingCloud ? 'animate-spin' : ''} />
                    <span>Sincronizar Agora</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSyncingCloud}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
                  >
                    <Cloud size={13} />
                    <span>Conectar Conta Google</span>
                  </button>
                )}
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
                <h3 className="text-sm font-black text-emerald-950">Nenhuma aposta exibida nesta visualização</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {history.length === 0 
                    ? (currentUser
                        ? "Nenhum jogo foi carregado para esta conta ainda. Você pode buscar novamente na nuvem ou gerar novas combinações."
                        : "Monte seu jogo na cartela ou gere combinações para começar.")
                    : `Você tem ${history.length} jogo(s) salvos no total (Mega-Sena: ${lotteryCounts.megasena} • +Milionária: ${lotteryCounts.maismilionaria} • Lotofácil: ${lotteryCounts.lotofacil}), mas nenhum corresponde à loteria/filtros selecionados.`}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {history.length === 0 ? (
                    <>
                      {currentUser && (
                        <button
                          type="button"
                          onClick={handleSyncNow}
                          disabled={isSyncingCloud}
                          className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw size={13} className={isSyncingCloud ? 'animate-spin' : ''} />
                          <span>Buscar Jogos da Nuvem</span>
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={() => setActiveTab('play')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        Ir para o Gerador
                      </button>
                    </>
                  ) : (
                    <>
                      {(filterType !== 'all' || searchTerm.trim() !== '' || onlyPrizes) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilterType('all');
                            setSearchTerm('');
                            setOnlyPrizes(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          Limpar Filtros Ativos
                        </button>
                      )}
                      {(['megasena', 'maismilionaria', 'lotofacil'] as const)
                        .filter(lot => lot !== currentLottery && lotteryCounts[lot] > 0)
                        .map(lot => (
                          <button
                            key={lot}
                            type="button"
                            onClick={() => setCurrentLottery(lot)}
                            className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            Ver {lotteryCounts[lot]} em {lot === 'megasena' ? 'Mega-Sena' : lot === 'maismilionaria' ? '+Milionária' : 'Lotofácil'}
                          </button>
                        ))}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHistory.map((bet) => (
                  <BetCard 
                    key={bet.id} 
                    bet={bet} 
                    drawnNumbers={activeRefNumbers}
                    drawnTrevos={activeRefTrevos}
                    onDelete={handleDeleteBet} 
                    onAnalyze={handleAnalyzeBet} 
                    isAnalyzing={analyzingId === bet.id} 
                  />
                ))}
              </div>
            )}
          </div>
            )}

            {myGamesSubTab === 'ranking' && (
              <GameRankingPanel 
                history={history}
                currentLottery={currentLottery}
                onNavigateToPlay={() => setActiveTab('play')}
              />
            )}

            {myGamesSubTab === 'checker' && (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-4 sm:p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
                <Award size={24} className={currentLottery === 'lotofacil' ? 'text-purple-600' : (currentLottery === 'maismilionaria' ? 'text-amber-600' : 'text-emerald-600')} />
                <span>
                  {currentLottery === 'lotofacil'
                    ? 'Conferidor Automático: Lotofácil (01 a 25)'
                    : currentLottery === 'maismilionaria' 
                    ? 'Conferidor Automático: +Milionária (01 a 50 + Trevos)' 
                    : 'Conferidor Automático: Mega-Sena (01 a 60)'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentLottery === 'lotofacil'
                  ? 'Verifique instantaneamente todas as suas apostas salvas da Lotofácil contra as 5 faixas oficiais (15, 14, 13, 12 e 11 acertos) e contabilize o total acumulado em prêmios.'
                  : currentLottery === 'maismilionaria'
                  ? 'Verifique instantaneamente todas as suas apostas salvas da +Milionária contra as 10 faixas oficiais de premiação da Caixa.'
                  : 'Verifique instantaneamente todas as suas apostas salvas da Mega-Sena (Sena, Quina e Quadra).'}
              </p>
            </div>

            {/* Painel do Concurso de Referência Oficial */}
            <div className={`text-white p-5 sm:p-6 rounded-3xl shadow-md space-y-4 ${
              currentLottery === 'lotofacil'
                ? 'bg-gradient-to-br from-purple-950 via-slate-900 to-fuchsia-950 border border-purple-800'
                : currentLottery === 'maismilionaria'
                ? 'bg-gradient-to-br from-amber-950 via-slate-900 to-yellow-950 border border-amber-800'
                : 'bg-gradient-to-br from-emerald-900 to-teal-950 border border-emerald-800'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    currentLottery === 'lotofacil' ? 'bg-purple-400' : (currentLottery === 'maismilionaria' ? 'bg-amber-400' : 'bg-emerald-400')
                  }`}></span>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-slate-200">
                    {selectedCheckerContest === 'custom'
                      ? 'Conferência • Resultado Personalizado (Manual)'
                      : `Conferência Caixa • Concurso #${selectedCheckerDrawMeta?.contest ?? activeOfficialDraw.contestNumber} (${selectedCheckerDrawMeta?.date ?? activeOfficialDraw.date})`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="checker-past-contest-select" className="text-[11px] font-bold text-slate-300">
                      Concurso passado:
                    </label>
                    <select
                      id="checker-past-contest-select"
                      value={selectedCheckerContest}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') return;
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) handleSelectPastContestInChecker(num);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/25 text-white text-[11px] font-bold outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
                    >
                      {selectedCheckerContest === 'custom' && (
                        <option value="custom" className="text-slate-900">
                          Resultado Personalizado
                        </option>
                      )}
                      {pastContestsForChecker.map(draw => (
                        <option key={draw.contest} value={draw.contest} className="text-slate-900">
                          #{draw.contest} ({draw.date}) — {draw.numbers.slice(0, 6).map(n => n.toString().padStart(2, '0')).join('-')}
                          {draw.numbers.length > 6 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestoreOfficialDrawInChecker}
                    className="text-[11px] font-bold text-amber-300 hover:text-white underline cursor-pointer"
                  >
                    Último Oficial #{activeOfficialDraw.contestNumber}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsCustomizingRef(!isCustomizingRef)}
                    className="text-[11px] font-bold text-slate-200 hover:text-white underline cursor-pointer"
                  >
                    {isCustomizingRef ? 'Cancelar Edição' : 'Digitar Outro Concurso'}
                  </button>
                </div>
              </div>

              {isCustomizingRef ? (
                <div className="bg-white/10 p-3.5 rounded-2xl space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-100 block">
                      Digite as {currentLottery === 'lotofacil' ? '15 dezenas sorteadas (01 a 25)' : `6 dezenas sorteadas (01 a ${currentLottery === 'maismilionaria' ? '50' : '60'})`}:
                    </label>
                    <input 
                      type="text" 
                      value={tempRefInput} 
                      onChange={(e) => setTempRefInput(e.target.value)}
                      placeholder={currentLottery === 'lotofacil' ? "Ex: 01, 02, 05, 06, 09, 10, 11, 13, 14, 17, 18, 20, 21, 23, 25" : (currentLottery === 'maismilionaria' ? "Ex: 05, 14, 23, 31, 42, 48" : "Ex: 05, 12, 26, 33, 44, 58")} 
                      className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 font-bold text-sm outline-none"
                    />
                  </div>

                  {currentLottery === 'maismilionaria' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-200 block">
                        Digite os 2 Trevos sorteados (1 a 6):
                      </label>
                      <input 
                        type="text" 
                        value={tempRefTrevosInput} 
                        onChange={(e) => setTempRefTrevosInput(e.target.value)}
                        placeholder="Ex: 1, 2" 
                        className="w-full px-3 py-2 rounded-xl bg-white text-amber-950 font-bold text-sm outline-none"
                      />
                    </div>
                  )}

                  <button 
                    type="button"
                    onClick={handleSaveReferenceDraw}
                    className={`w-full text-white px-4 py-2.5 rounded-xl font-black text-xs transition-colors cursor-pointer shadow-sm ${
                      currentLottery === 'lotofacil'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : currentLottery === 'maismilionaria' 
                        ? 'bg-amber-600 hover:bg-amber-700' 
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    CONFERIR COM ESTE RESULTADO
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 py-2">
                  <div className="flex flex-wrap gap-2">
                    {activeRefNumbers.map(n => (
                      <span 
                        key={n} 
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full font-black flex items-center justify-center text-sm shadow-md border-2 ${
                          currentLottery === 'lotofacil'
                            ? 'bg-gradient-to-br from-purple-400 to-fuchsia-500 text-purple-950 border-purple-300'
                            : 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 border-yellow-300'
                        }`}
                      >
                        {n.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>

                  {currentLottery === 'maismilionaria' && activeRefTrevos && (
                    <div className="flex items-center gap-1.5 pl-3 border-l border-white/20">
                      <span className="text-xs font-bold text-amber-300 mr-0.5">Trevos:</span>
                      {activeRefTrevos.map(t => (
                        <span 
                          key={t}
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-sm sm:text-base shadow-md border-2 border-emerald-300 font-mono"
                        >
                          🍀{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-300">
                {currentLottery === 'lotofacil'
                  ? 'Resultado oficial da Lotofácil usado para confrontar seus bilhetes e calcular os acertos nas 5 faixas (15, 14, 13, 12 e 11 acertos).'
                  : currentLottery === 'maismilionaria'
                  ? 'Resultado oficial da +Milionária usado para confrontar seus bilhetes e identificar prêmios nas 10 faixas oficiais.'
                  : 'Resultado oficial da Mega-Sena usado para confrontar seus bilhetes e orientar a regra de repetição de 1–2 dezenas.'}
              </p>
            </div>

            {/* Placar de Premiações adaptativo */}
            {currentLottery === 'lotofacil' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3.5 rounded-2xl border border-purple-300 bg-purple-50/90 text-center">
                    <span className="text-[10px] font-black uppercase text-purple-900 tracking-wider">15 Acertos</span>
                    <p className="text-2xl sm:text-3xl font-black text-purple-950 mt-1">{(checkerStats as any).hits15 || 0}</p>
                    <span className="text-[10px] text-purple-700 font-bold">Prêmio Máximo</span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-fuchsia-300 bg-fuchsia-50/80 text-center">
                    <span className="text-[10px] font-black uppercase text-fuchsia-900 tracking-wider">14 Acertos</span>
                    <p className="text-2xl sm:text-3xl font-black text-fuchsia-950 mt-1">{(checkerStats as any).hits14 || 0}</p>
                    <span className="text-[10px] text-fuchsia-700 font-medium">2ª Faixa Oficial</span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/80 text-center">
                    <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">13 Acertos (R$ 30)</span>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">{(checkerStats as any).hits13 || 0}</p>
                    <span className="text-[10px] text-emerald-700 font-semibold">Prêmio Fixo</span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-blue-300 bg-blue-50/80 text-center">
                    <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider">12 Acertos (R$ 12)</span>
                    <p className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">{(checkerStats as any).hits12 || 0}</p>
                    <span className="text-[10px] text-blue-700 font-semibold">Prêmio Fixo</span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-indigo-300 bg-indigo-50/80 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black uppercase text-indigo-900 tracking-wider">11 Acertos (R$ 6)</span>
                    <p className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">{(checkerStats as any).hits11 || 0}</p>
                    <span className="text-[10px] text-indigo-700 font-semibold">Prêmio Fixo</span>
                  </div>
                </div>

                {/* Total Conquistado em Prêmios Fixos da Lotofácil */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-fuchsia-50 to-emerald-50 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
                      💰
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-purple-950">
                        Total Conquistado em Prêmios Fixos (11, 12 e 13 Acertos)
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Soma automática dos valores garantidos pela Caixa Econômica Federal em seus jogos conferidos.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-black text-emerald-700">
                      R$ {((checkerStats as any).totalPrizeFixed || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ) : currentLottery === 'maismilionaria' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/80 text-center">
                  <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Faixa 1 (6 + 2 Trevos)</span>
                  <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-1">{(checkerStats as any).faixa1 || 0}</p>
                  <span className="text-[10px] text-amber-700 font-bold">Prêmio Máximo</span>
                </div>

                <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 text-center">
                  <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">Faixas 2 a 4 (Quinas)</span>
                  <p className="text-2xl sm:text-3xl font-black text-indigo-900 mt-1">{(checkerStats as any).faixa2to4 || 0}</p>
                  <span className="text-[10px] text-indigo-700 font-medium">6 ou 5 Acertos</span>
                </div>

                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 text-center">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Faixas 5 e 6 (Quadras)</span>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">{(checkerStats as any).faixa5to6 || 0}</p>
                  <span className="text-[10px] text-emerald-700 font-medium">4 Acertos</span>
                </div>

                <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/70 text-center">
                  <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider">Faixas 7 a 10 (+Trevos)</span>
                  <p className="text-2xl sm:text-3xl font-black text-teal-900 mt-1">{(checkerStats as any).faixa7to10 || 0}</p>
                  <span className="text-[10px] text-teal-700 font-medium">3 ou 2 + Trevos</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 text-center">
                  <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Sena (6 acertos)</span>
                  <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-1">{(checkerStats as any).sena || 0}</p>
                  <span className="text-[10px] text-amber-700 font-medium">Prêmio Máximo</span>
                </div>

                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/70 text-center">
                  <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Quina (5 acertos)</span>
                  <p className="text-2xl sm:text-3xl font-black text-blue-900 mt-1">{(checkerStats as any).quina || 0}</p>
                  <span className="text-[10px] text-blue-700 font-medium">2º Faixa</span>
                </div>

                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 text-center">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Quadra (4 acertos)</span>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">{(checkerStats as any).quadra || 0}</p>
                  <span className="text-[10px] text-emerald-700 font-medium">3º Faixa</span>
                </div>

                <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/70 text-center">
                  <span className="text-[10px] font-black uppercase text-purple-800 tracking-wider">Terno (3 acertos)</span>
                  <p className="text-2xl sm:text-3xl font-black text-purple-900 mt-1">{(checkerStats as any).terno || 0}</p>
                  <span className="text-[10px] text-purple-700 font-medium">Sem prêmio na Mega</span>
                </div>
              </div>
            )}

            {/* Resumo Automático em Jogos Passados */}
            {betPastComparisons.totalBets > 0 && betPastComparisons.overallBest && (
              <div className="p-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <History size={15} className="text-emerald-600" />
                      Comparação Geral com {pastContestsForChecker.length} Jogos Passados
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {betPastComparisons.betsWithMidOrHigher} de {betPastComparisons.totalBets} apostas com {currentLottery === 'lotofacil' ? '11+' : '3+'} dezenas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Maior pontuação histórica entre suas apostas salvas:{' '}
                    <strong className="text-slate-900">
                      Concurso #{betPastComparisons.overallBest.match.contest} ({betPastComparisons.overallBest.match.date}) — {betPastComparisons.overallBest.match.hits} {betPastComparisons.overallBest.match.hits === 1 ? 'dezena' : 'dezenas'}
                    </strong>
                    {betPastComparisons.overallBest.match.matchedNumbers.length > 0 && (
                      <span className="font-mono text-slate-700 ml-1">
                        ({betPastComparisons.overallBest.match.matchedNumbers.map(n => n.toString().padStart(2, '0')).join(' - ')})
                      </span>
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPastContestInChecker(betPastComparisons.overallBest!.match.contest)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors cursor-pointer shrink-0"
                >
                  Conferir Concurso #{betPastComparisons.overallBest.match.contest}
                </button>
              </div>
            )}

            {/* Gráfico de Visualização de Dados (Recharts) */}
            <FrequencyChart 
              history={history.filter(b => (b.lottery || 'megasena') === currentLottery)} 
              referenceDraw={activeRefNumbers} 
              lottery={currentLottery}
            />

            {/* Filtro por Quantidade de Acertos e Ordenação */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Base do Filtro de Acertos:
                </span>
                <div className="inline-flex rounded-xl bg-slate-200/70 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setCheckerFilterScope('selected_contest')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      checkerFilterScope === 'selected_contest'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {selectedCheckerContest === 'custom'
                      ? 'Resultado Manual'
                      : `Concurso #${selectedCheckerContest}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckerFilterScope('all_past');
                      setCheckerHitsOrder('best_past');
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      checkerFilterScope === 'all_past'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos os Jogos Passados ({pastContestsForChecker.length})
                  </button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1 mr-1">
                    <Filter size={13} /> Filtrar Acertos:
                  </span>

                  {(currentLottery === 'lotofacil'
                    ? [
                        { id: 'all', label: `Todas (${checkerHitCounts.total})` },
                        { id: '11plus', label: `11 a 15 Acertos (${checkerHitCounts.elevenPlus})` },
                        { id: '15', label: `15 Acertos (${checkerHitCounts.byHits[15] || 0})` },
                        { id: '14', label: `14 Acertos (${checkerHitCounts.byHits[14] || 0})` },
                        { id: '13', label: `13 Acertos (${checkerHitCounts.byHits[13] || 0})` },
                        { id: '12', label: `12 Acertos (${checkerHitCounts.byHits[12] || 0})` },
                        { id: '11', label: `11 Acertos (${checkerHitCounts.byHits[11] || 0})` }
                      ]
                    : [
                        { id: 'all', label: `Todas (${checkerHitCounts.total})` },
                        { id: '3plus', label: `3 a 6 Dezenas (${checkerHitCounts.threePlus})` },
                        { id: '6', label: `6 Dezenas (${checkerHitCounts.byHits[6] || 0})` },
                        { id: '5', label: `5 Dezenas (${checkerHitCounts.byHits[5] || 0})` },
                        { id: '4', label: `4 Dezenas (${checkerHitCounts.byHits[4] || 0})` },
                        { id: '3', label: `3 Dezenas (${checkerHitCounts.byHits[3] || 0})` }
                      ]
                  ).map(opt => {
                    const isActive = checkerHitsFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setCheckerHitsFilter(opt.id as typeof checkerHitsFilter);
                          if (opt.id !== 'all' && onlyPrizes) {
                            setOnlyPrizes(false);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? currentLottery === 'lotofacil'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : currentLottery === 'maismilionaria'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown size={14} className="text-slate-500" />
                    <select
                      value={checkerHitsOrder}
                      onChange={(e) => setCheckerHitsOrder(e.target.value as 'hits_desc' | 'hits_asc' | 'best_past' | 'newest')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="hits_desc">
                        {currentLottery === 'lotofacil'
                          ? 'Ordem: Maior Acerto (15 → 11)'
                          : 'Ordem: Maior Acerto (6 → 3)'}
                      </option>
                      <option value="best_past">Ordem: Melhor Acerto em Jogos Passados</option>
                      <option value="hits_asc">
                        {currentLottery === 'lotofacil'
                          ? 'Ordem: Menor Acerto (11 → 15)'
                          : 'Ordem: Menor Acerto (3 → 6)'}
                      </option>
                      <option value="newest">Ordem: Mais Recentes</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={onlyPrizes} 
                    onChange={(e) => {
                      setOnlyPrizes(e.target.checked);
                      if (e.target.checked) setCheckerHitsFilter('all');
                    }} 
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Exibir somente jogos premiados</span>
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  {(currentLottery === 'lotofacil' ? checkerHitCounts.elevenPlus > 0 : checkerHitCounts.threePlus > 0) && (
                    <button
                      type="button"
                      onClick={handleExtractTernoStatsFromChecker}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors cursor-pointer"
                    >
                      {currentLottery === 'lotofacil'
                        ? `Usar Estatísticas dos ${checkerHitCounts.elevenPlus} Jogos (11+) na Análise Avançada`
                        : `Usar Estatísticas dos ${checkerHitCounts.threePlus} Ternos (3+) na Análise Avançada`}
                    </button>
                  )}

                  <span className="text-xs font-semibold text-slate-500">
                    Exibindo {checkerFilteredHistory.length} de {checkerHitCounts.total} apostas nesta modalidade
                  </span>
                </div>
              </div>
            </div>

            {/* Listagem com destaque nos números acertados */}
            {checkerFilteredHistory.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700">
                  Nenhuma aposta encontrada com o filtro de acertos selecionado.
                </p>
                <p className="text-xs text-slate-500">
                  Selecione "Todas" ou outra quantidade de dezenas acertadas acima para visualizar seus jogos conferidos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {checkerFilteredHistory.map((bet) => (
                  <BetCard 
                    key={bet.id} 
                    bet={bet} 
                    drawnNumbers={activeRefNumbers}
                    drawnTrevos={activeRefTrevos}
                    onDelete={handleDeleteBet} 
                    onAnalyze={handleAnalyzeBet} 
                    isAnalyzing={analyzingId === bet.id}
                    pastComparison={betPastComparisons.map.get(bet.id)}
                    onSelectContest={handleSelectPastContestInChecker}
                    selectedContestNumber={selectedCheckerContest}
                  />
                ))}
              </div>
            )}
          </div>
            )}
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

      {/* Modal do Gerenciador de Cache Offline */}
      <CacheManagerModal 
        isOpen={isCacheModalOpen}
        onClose={() => setIsCacheModalOpen(false)}
        onTriggerWarmUp={handleTriggerWarmUp}
        onClearLocalCache={handleClearLocalCache}
      />
    </div>
  );
};

export default App;
