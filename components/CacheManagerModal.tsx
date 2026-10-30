import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Wifi, 
  WifiOff, 
  Zap, 
  RefreshCw, 
  Trash2, 
  Download, 
  Upload, 
  HardDrive, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Layers,
  Sparkles,
  Info,
  Smartphone
} from 'lucide-react';
import { offlineCacheManager } from '../services/offlineCacheManager';
import { usePWAInstall } from './usePWAInstall';
import { CacheStats } from '../types';

interface CacheManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerWarmUp: () => Promise<void>;
  onClearLocalCache: () => void;
}

export const CacheManagerModal: React.FC<CacheManagerModalProps> = ({
  isOpen,
  onClose,
  onTriggerWarmUp,
  onClearLocalCache
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [stats, setStats] = useState<CacheStats>(() => offlineCacheManager.getCacheStats());
  const [isWarming, setIsWarming] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStats(offlineCacheManager.getCacheStats());

    const unsubscribe = offlineCacheManager.subscribeNetworkStatus(() => {
      setStats(offlineCacheManager.getCacheStats());
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleWarmUp = async () => {
    setIsWarming(true);
    setActionFeedback("Calculando e gravando todas as estatísticas no cache L1/L2...");
    try {
      await onTriggerWarmUp();
      setStats(offlineCacheManager.getCacheStats());
      setActionFeedback("Todas as análises e dados históricos foram otimizados e cacheados!");
      setTimeout(() => setActionFeedback(null), 4000);
    } catch {
      setActionFeedback("Erro ao pré-carregar cache.");
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setIsWarming(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("Deseja realmente limpar o cache de análises? Os dados serão recalculados automaticamente.")) {
      onClearLocalCache();
      setStats(offlineCacheManager.getCacheStats());
      setActionFeedback("Cache limpo com sucesso! Os dados foram reindexados.");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const handleExportBackup = () => {
    try {
      const rawBets = localStorage.getItem('mega_sorte_bets') || '[]';
      const rawLogic = localStorage.getItem('mega_sorte_logic_v2') || '{}';
      const exportData = {
        app: "Mega Sorte",
        exportedAt: new Date().toISOString(),
        bets: JSON.parse(rawBets),
        logicSettings: JSON.parse(rawLogic),
        statsReport: stats
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mega_sorte_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setActionFeedback("Backup local exportado com sucesso!");
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback("Erro ao exportar backup.");
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.bets)) {
          localStorage.setItem('mega_sorte_bets', JSON.stringify(parsed.bets));
          if (parsed.logicSettings) {
            localStorage.setItem('mega_sorte_logic_v2', JSON.stringify(parsed.logicSettings));
          }
          setStats(offlineCacheManager.getCacheStats());
          setActionFeedback(`Backup restaurado! ${parsed.bets.length} jogos carregados.`);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setActionFeedback("Arquivo de backup inválido.");
        }
      } catch {
        setActionFeedback("Erro ao ler o arquivo de backup.");
      }
    };
    reader.readAsText(file);
  };

  const totalHits = stats.hitCount;
  const totalMisses = stats.missCount;
  const totalRequests = totalHits + totalMisses;
  const hitRatio = totalRequests > 0 ? Math.round((totalHits / totalRequests) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-700/50 rounded-xl border border-emerald-500/30">
              <Database className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Gerenciador de Cache & Operação Offline
              </h2>
              <p className="text-xs text-emerald-200">
                Garante alta performance (&lt;5ms) e funcionamento 100% autônomo sem internet
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status de Conexão e Service Worker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              stats.isOnline 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50/80 border-amber-300 text-amber-900'
            }`}>
              <div className={`p-2.5 rounded-lg shrink-0 ${stats.isOnline ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                {stats.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Status da Rede</span>
                <div className="text-sm font-bold">
                  {stats.isOnline ? '🟢 Conectado (Online)' : '🟠 Modo Offline Ativo'}
                </div>
                <p className="text-[11px] opacity-80">
                  {stats.isOnline ? 'Sincronização em tempo real' : 'Executando 100% no cache local'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 text-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-teal-600 text-white shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Service Worker</span>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  PWA Cache Operacional
                </div>
                <p className="text-[11px] text-slate-500">
                  Recursos e scripts pré-carregados
                </p>
              </div>
            </div>
          </div>

          {/* Cards de Métricas e Eficiência */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              Inventário do Armazenamento Local
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-center">
                <span className="text-[10px] text-gray-500 font-semibold block">Mega-Sena</span>
                <span className="text-base font-black text-gray-800">{stats.megaSenaDrawsCount}</span>
                <span className="text-[10px] text-emerald-600 block font-medium">concursos salvos</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-center">
                <span className="text-[10px] text-gray-500 font-semibold block">+Milionária</span>
                <span className="text-base font-black text-gray-800">{stats.maisMilionariaDrawsCount}</span>
                <span className="text-[10px] text-emerald-600 block font-medium">concursos salvos</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-center">
                <span className="text-[10px] text-gray-500 font-semibold block">Apostas Salvas</span>
                <span className="text-base font-black text-gray-800">{stats.cachedBetsCount}</span>
                <span className="text-[10px] text-gray-500 block font-medium">armazenadas</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-center">
                <span className="text-[10px] text-gray-500 font-semibold block">Taxa de Acerto</span>
                <span className="text-base font-black text-emerald-700">{hitRatio}%</span>
                <span className="text-[10px] text-gray-500 block font-medium">eficiência de RAM</span>
              </div>
            </div>
          </div>

          {/* Status Detalhado dos Módulos Pré-computados */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Módulos Estatísticos em Memória L1/L2</span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Latência: &lt; 5ms
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-150">
                <span className="text-slate-600 font-medium">20 Análises Mega-Sena:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Em Cache
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-150">
                <span className="text-slate-600 font-medium">20 Análises +Milionária:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Em Cache
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-150">
                <span className="text-slate-600 font-medium">Pares e Trincas Consecutivas:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Em Cache
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-150">
                <span className="text-slate-600 font-medium">Desdobramentos Econômicos:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Offline
                </span>
              </div>
            </div>
          </div>

          {/* Como Funciona a Tecnologia Offline */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 text-xs text-emerald-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Como a tecnologia de cache garante seu uso sem internet?
            </div>
            <p className="text-emerald-900/90 leading-relaxed">
              O <strong>Mega Sorte</strong> utiliza uma arquitetura híbrida de computação local: toda a base oficial de <strong>3.069 sorteios da Mega-Sena</strong> e <strong>401 sorteios da +Milionária</strong> é processada diretamente pelo processador do seu dispositivo. 
            </p>
            <p className="text-emerald-900/90 leading-relaxed">
              Você pode abrir o app em modo avião, em viagens ou locais sem sinal e usar livremente o gerador de palpites, o simulador de Monte Carlo, a conferência de jogos e todas as 20 abas de análise estatística.
            </p>
          </div>

          {/* Instalação do App PWA no Dispositivo */}
          {!isInstalled && (isInstallable || isIOS) && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-lg">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Instalar Aplicativo no Dispositivo</h4>
                  <p className="text-[11px] text-slate-500">
                    Instale como aplicativo nativo para acesso offline instantâneo na tela inicial
                  </p>
                </div>
              </div>

              {isInstallable && (
                <button
                  type="button"
                  onClick={install}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Instalar App
                </button>
              )}

              {isIOS && (
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(true)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Instalar no iPhone / iPad
                </button>
              )}
            </div>
          )}

          {showIOSGuide && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold">Para instalar no Safari do iPhone / iPad:</p>
              <p>1. Toque no botão de <strong>Compartilhar</strong> (ícone com quadrado e seta para cima).</p>
              <p>2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</p>
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="mt-1 text-[11px] font-bold text-amber-800 underline cursor-pointer"
              >
                Entendi, fechar instrução
              </button>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleWarmUp}
                disabled={isWarming}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Zap className={`w-4 h-4 ${isWarming ? 'animate-spin' : ''}`} />
                {isWarming ? 'Otimizando Cache...' : '⚡ Otimizar & Pré-carregar Tudo'}
              </button>

              <button
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600" />
                Exportar Backup
              </button>

              <label className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-slate-600" />
                Importar Backup
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleImportBackup} 
                />
              </label>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleClear}
                className="text-[11px] text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Cache de Análises & Recalcular
              </button>

              <span className="text-[10px] text-gray-400">
                Cache v2 • Armazenamento Local: ~{stats.estimatedSizeKb} KB
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CacheManagerModal;
