import { useState, useEffect, ChangeEvent } from 'react';
import { Product, Customer, Sale, PaymentMethod } from './types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SALES } from './utils/initialData';
import Dashboard from './components/Dashboard';
import Estoque from './components/Estoque';
import Vendas from './components/Vendas';
import Clientes from './components/Clientes';
import Fiado from './components/Fiado';
import PublicCatalog from './components/PublicCatalog';
import { 
  isSupabaseConfigured,
  supabaseClient,
  fetchProducts,
  fetchCustomers,
  fetchSales,
  saveProductToSupabase, 
  deleteProductFromSupabase, 
  saveCustomerToSupabase, 
  deleteCustomerFromSupabase, 
  saveSaleToSupabase, 
  deleteSaleFromSupabase,
  resetSupabaseWithData,
  subscribeToProducts,
  subscribeToCustomers,
  subscribeToSales
} from './utils/supabase';
import { 
  Sparkles, 
  LayoutDashboard, 
  Package, 
  Receipt, 
  Users, 
  CreditCard, 
  RefreshCw, 
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  AlertCircle,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isPublicCatalog, setIsPublicCatalog] = useState<boolean>(false);

  // Core Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Loading and feedback states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Autosave and Sync Status States
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>('');

  // Check URL parameters for catalog mode on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') || '';
    const isCat = view === 'catalogo' || view === 'catalog' || params.has('catalogo') || params.has('catalog');
    setIsPublicCatalog(isCat);
  }, []);

  // 1. Initial Load from Supabase
  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      console.log('[App Debug] Supabase configurado, carregando dados...');
      setIsLoading(true);
      try {
        const [prods, custs, sls] = await Promise.all([
          fetchProducts(),
          fetchCustomers(),
          fetchSales()
        ]);
        setProducts(prods);
        setCustomers(custs);
        setSales(sls);
        setIsLoading(false);
        setLastSavedAt(new Date().toLocaleTimeString('pt-BR'));
      } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // 2. Real-time Subscriptions via Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const unsubProducts = subscribeToProducts((prods) => {
      setProducts(prods);
      setIsLoading(false);
      setLastSavedAt(new Date().toLocaleTimeString('pt-BR'));
    });

    const unsubCustomers = subscribeToCustomers((custs) => {
      setCustomers(custs);
    });

    const unsubSales = subscribeToSales((sls) => {
      setSales(sls);
    });

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubSales();
    };
  }, []);

  // Toast Helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Inventory actions
  const handleAddProduct = async (newProd: Omit<Product, 'id'>) => {
    try {
      const saved = await saveProductToSupabase(newProd as Product);
      setProducts(prev => [...prev, saved]);
      triggerToast('Produto cadastrado com sucesso! ✨');
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      triggerToast('Erro ao cadastrar produto.');
    }
  };

  const handleEditProduct = async (updatedProd: Product) => {
    try {
      const saved = await saveProductToSupabase(updatedProd);
      setProducts(prev => prev.map(p => p.id === saved.id ? saved : p));
      triggerToast('Produto atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
      triggerToast('Erro ao atualizar produto.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProductFromSupabase(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      triggerToast('Produto excluído do estoque.');
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      triggerToast('Erro ao excluir produto.');
    }
  };

  // 2. Sales actions (including stock deduction)
  const handleAddSale = async (newSale: Omit<Sale, 'id'>) => {
    try {
      const savedSale = await saveSaleToSupabase(newSale as Sale);

      // Deduct stock quantities in Supabase for affected products
      const updatedProducts = [...products];
      for (const item of newSale.items) {
        const prod = updatedProducts.find(p => p.id === item.productId);
        if (prod) {
          const newQty = Math.max(0, prod.quantity - item.quantity);
          const updatedProd = { ...prod, quantity: newQty };
          await saveProductToSupabase(updatedProd);
          const idx = updatedProducts.findIndex(p => p.id === prod.id);
          if (idx !== -1) updatedProducts[idx] = updatedProd;
        }
      }

      setProducts(updatedProducts);
      setSales(prev => [savedSale, ...prev]);
      triggerToast('Venda registrada e estoque atualizado! 🏷️');
    } catch (err) {
      console.error('Erro ao registrar venda:', err);
      triggerToast('Erro ao registrar venda.');
    }
  };

  // 3. Customer actions
  const handleAddCustomer = async (newCust: Omit<Customer, 'id'>) => {
    try {
      const saved = await saveCustomerToSupabase(newCust as Customer);
      setCustomers(prev => [...prev, saved]);
      triggerToast('Cliente cadastrado com sucesso! 👤');
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      triggerToast('Erro ao cadastrar cliente.');
    }
  };

  const handleEditCustomer = async (updatedCust: Customer) => {
    try {
      const saved = await saveCustomerToSupabase(updatedCust);
      setCustomers(prev => prev.map(c => c.id === saved.id ? saved : c));
      triggerToast('Cadastro do cliente atualizado!');
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      triggerToast('Erro ao atualizar cliente.');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      await deleteCustomerFromSupabase(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      triggerToast('Cliente excluído do cadastro.');
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      triggerToast('Erro ao excluir cliente.');
    }
  };

  // 4. Fiado actions
  const handleMarkAsPaid = async (saleId: string, newMethod?: PaymentMethod) => {
    const saleToUpdate = sales.find(s => s.id === saleId);
    if (!saleToUpdate) return;

    const updatedSale: Sale = {
      ...saleToUpdate,
      status: 'pago',
      paidDate: new Date().toISOString().split('T')[0],
      paymentMethod: newMethod || saleToUpdate.paymentMethod
    };

    try {
      const saved = await saveSaleToSupabase(updatedSale);
      setSales(prev => prev.map(s => s.id === saved.id ? saved : s));
      triggerToast('Pagamento recebido com sucesso! 🎉');
    } catch (err) {
      console.error('Erro ao marcar venda como paga:', err);
      triggerToast('Erro ao atualizar pagamento.');
    }
  };

  const handleEditSale = async (saleId: string, updates: Partial<Sale>) => {
    const saleToUpdate = sales.find(s => s.id === saleId);
    if (!saleToUpdate) return;

    const updatedSale: Sale = { ...saleToUpdate, ...updates };

    try {
      const saved = await saveSaleToSupabase(updatedSale);
      setSales(prev => prev.map(s => s.id === saved.id ? saved : s));
      triggerToast('Venda atualizada com sucesso! 📝');
    } catch (err) {
      console.error('Erro ao editar venda:', err);
      triggerToast('Erro ao atualizar venda.');
    }
  };

  const handleDeleteSale = async (id: string) => {
    try {
      await deleteSaleFromSupabase(id);
      setSales(prev => prev.filter(s => s.id !== id));
      triggerToast('Registro de venda excluído.');
    } catch (err) {
      console.error('Erro ao excluir venda:', err);
      triggerToast('Erro ao excluir venda.');
    }
  };

  // Backup & Restore System
  const handleBackupExport = () => {
    const backupData = {
      products,
      customers,
      sales,
      version: '1.0',
      exportedAt: new Date().toISOString()
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aura_dourada_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Backup exportado com sucesso! 💾');
  };

  const handleBackupImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.products && parsed.customers && parsed.sales) {
          setIsLoading(true);
          await resetSupabaseWithData(parsed.products, parsed.customers, parsed.sales);
          const [prods, custs, sls] = await Promise.all([
            fetchProducts(),
            fetchCustomers(),
            fetchSales()
          ]);
          setProducts(prods);
          setCustomers(custs);
          setSales(sls);
          setIsLoading(false);
          triggerToast('Backup restaurado no Supabase com sucesso! 🔄');
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao processar o arquivo de backup.');
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleForceSync = async () => {
    setIsAutosaving(true);
    try {
      const [prods, custs, sls] = await Promise.all([
        fetchProducts(),
        fetchCustomers(),
        fetchSales()
      ]);
      setProducts(prods);
      setCustomers(custs);
      setSales(sls);
      triggerToast('Sincronização com Supabase concluída! ⚡');
    } catch (err) {
      console.error('Erro na sincronização:', err);
      triggerToast('Erro ao sincronizar.');
    } finally {
      setIsAutosaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (confirm('Atenção: Isso substituirá todos os dados no Supabase pelos dados demonstrativos de fábrica. Deseja continuar?')) {
      try {
        setIsLoading(true);
        await resetSupabaseWithData(INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SALES);
        setProducts(INITIAL_PRODUCTS);
        setCustomers(INITIAL_CUSTOMERS);
        setSales(INITIAL_SALES);
        setIsLoading(false);
        triggerToast('Dados demonstrativos restaurados no Supabase.');
      } catch (err) {
        console.error('Erro ao redefinir dados:', err);
        setIsLoading(false);
        triggerToast('Erro ao restaurar dados padrão.');
      }
    }
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [overdueSummary, setOverdueSummary] = useState({ 
    todayCount: 0, 
    todayTotal: 0,
    totalPendingCount: 0,
    totalPendingAmount: 0,
    overdueCount: 0,
    overdueAmount: 0
  });

  useEffect(() => {
    if (!isLoading && sales.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      
      const pendingSales = sales.filter(s => s.status === 'pendente');
      const dueToday = pendingSales.filter(s => s.dueDate === today);
      const overdueSales = pendingSales.filter(s => s.dueDate && s.dueDate < today);
      
      const todayTotal = dueToday.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalPendingAmount = pendingSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const overdueAmount = overdueSales.reduce((sum, s) => sum + s.totalAmount, 0);

      setOverdueSummary({
        todayCount: dueToday.length,
        todayTotal,
        totalPendingCount: pendingSales.length,
        totalPendingAmount,
        overdueCount: overdueSales.length,
        overdueAmount
      });
      
      if (dueToday.length > 0 || overdueSales.length > 0) {
        const sessionKey = `notified_overdue_${today}`;
        if (!sessionStorage.getItem(sessionKey)) {
          setShowOverdueModal(true);
          sessionStorage.setItem(sessionKey, 'true');
        }
      }
    }
  }, [isLoading, sales]);

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'vendas', label: 'Vendas', icon: Receipt },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { 
      id: 'fiado', 
      label: 'Fiado / Pendências', 
      icon: CreditCard, 
      badge: sales.filter(s => s.status === 'pendente').length,
      hasOverdue: sales.some(s => s.status === 'pendente' && s.paymentMethod === 'Fiado' && s.dueDate && new Date().toISOString().split('T')[0] > s.dueDate)
    },
  ];

  // If Supabase is NOT configured, show clear configuration error screen
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
            <Database className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Supabase Não Configurado</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Esta aplicação requer o Supabase como banco de dados principal. Por favor, configure as variáveis de ambiente <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-xs">VITE_SUPABASE_URL</code> e <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> no arquivo <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-mono text-xs">.env</code>.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left text-xs text-amber-800 mb-6">
            <p className="font-bold mb-1">Passos para configurar:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Crie um projeto no Supabase.</li>
              <li>Copie a URL do projeto e a chave Anon/Public.</li>
              <li>Adicione em <code className="font-mono">.env</code>.</li>
              <li>Reinicie a aplicação.</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors shadow-lg"
          >
            Verificar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (isPublicCatalog) {
    return <PublicCatalog products={products} isLoading={isLoading} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <img src="https://i.imgur.com/XAhbi19.png" alt="Logo Aura Dourada" className="w-20 h-20 mb-4 object-contain" />
        <h2 className="text-xl font-serif text-gray-900 mb-1">Carregando dados do Supabase...</h2>
        <p className="text-xs text-gray-400">Aura Dourada Sistema</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col md:flex-row">
      
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white font-medium text-xs px-5 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 border border-gold-200/20"
          >
            <CheckCircle2 className="w-4 h-4 text-gold-500" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
  
      {/* Offline Alert Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-600 text-white overflow-hidden sticky top-0 z-[60] shadow-md"
          >
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <WifiOff className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-none">Você está Offline</p>
                  <p className="text-[10px] opacity-80 mt-1">Conexão com a nuvem indisponível no momento.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Tentar Reconectar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overdue Reminder Modal */}
      <AnimatePresence>
        {showOverdueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
              onClick={() => setShowOverdueModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gold-100"
            >
              <div className="bg-gold-500 p-8 text-center relative">
                <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => setShowOverdueModal(false)}
                    className="text-white/60 hover:text-white p-1 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">
                  <Clock className="w-10 h-10 text-white animate-pulse" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-white mb-2 italic">Resumo Financeiro</h2>
                <p className="text-white/80 text-sm">Existem pendências que precisam de sua atenção!</p>
              </div>
              
              <div className="p-6 space-y-4">
                {overdueSummary.overdueCount > 0 && (
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-red-400">Vencidos</p>
                        <p className="text-lg font-bold text-red-700">{overdueSummary.overdueCount}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-red-400">Total Vencido</p>
                      <p className="text-xl font-black text-red-600">
                        R$ {overdueSummary.overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-gold-50/50 rounded-2xl border border-gold-100/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center text-gold-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-gold-400">Vence Hoje</p>
                      <p className="text-lg font-bold text-gold-700">{overdueSummary.todayCount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gold-400">Total Hoje</p>
                    <p className="text-xl font-black text-gold-600">
                      R$ {overdueSummary.todayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Total Pendente</p>
                      <p className="text-lg font-bold text-gray-900">{overdueSummary.totalPendingCount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Valor Geral</p>
                    <p className="text-xl font-black text-gray-900">
                      R$ {overdueSummary.totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setActiveTab('fiado');
                      setShowOverdueModal(false);
                    }}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                    Ver Pendências <ArrowRight className="w-4 h-4 text-gold-500" />
                  </button>
                  <button
                    onClick={() => setShowOverdueModal(false)}
                    className="w-full py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Ver mais tarde
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation (Desktop) */}
      <nav className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 p-6 justify-between shrink-0 overflow-y-auto">
        <div className="space-y-8">
          {/* Brand Logo & Name */}
          <div className="mb-10 text-center border-b border-gray-200 pb-4 flex flex-col items-center">
            <img src="https://i.imgur.com/XAhbi19.png" alt="Logo" className="w-16 h-16 mb-2 object-contain" />
            <h1 className="text-xl font-serif italic text-gold-500">Aura Dourada Sistema</h1>
            <p className="text-[10px] uppercase tracking-widest mt-1 opacity-60 text-gray-500">Gestão de Cosméticos</p>
            <div className="flex flex-col items-center gap-1.5 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
                <Wifi className="w-3 h-3" />
                Supabase Ativo
              </span>
              
              <div className="flex flex-col items-center mt-1">
                <span className="inline-flex items-center gap-1 text-[9px] text-gray-500 font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full ${isAutosaving ? 'bg-gold-500 animate-ping' : 'bg-emerald-400'}`}></span>
                  {isAutosaving ? 'Sincronizando...' : 'Tempo Real'}
                </span>
                {lastSavedAt && (
                  <span className="text-[8px] text-gray-400 font-mono mt-0.5">Atualizado: {lastSavedAt}</span>
                )}
              </div>
            </div>
          </div>

          {/* Nav list */}
          <div className="space-y-2">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gold-100 text-gold-500 font-bold'
                      : 'text-gray-800 hover:bg-gold-100/50 hover:text-gold-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-gold-500' : 'bg-gray-300'}`}></span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.id === 'fiado' && (item as any).hasOverdue 
                        ? 'bg-red-600 text-white animate-pulse shadow-sm shadow-red-500/50' 
                        : (isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600')
                    }`}>
                      {item.id === 'fiado' && (item as any).hasOverdue ? `Atrasados!` : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer with backup and reset controls */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <button
            onClick={() => setActiveTab('vendas')}
            className="w-full py-3 bg-gold-500 text-white rounded-2xl font-semibold shadow-lg shadow-gold-500/20 hover:shadow-xl transition-all text-xs cursor-pointer"
          >
            Nova Venda +
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                sales={sales} 
                products={products} 
                customers={customers} 
                onNavigate={setActiveTab} 
                onBackupExport={handleBackupExport}
                onBackupImport={handleBackupImport}
                onForceSync={handleForceSync}
                isAutosaving={isAutosaving}
              />
            )}
            {activeTab === 'estoque' && (
              <Estoque 
                products={products} 
                onAddProduct={handleAddProduct} 
                onEditProduct={handleEditProduct} 
                onDeleteProduct={handleDeleteProduct} 
              />
            )}
            {activeTab === 'vendas' && (
              <Vendas 
                sales={sales} 
                products={products} 
                customers={customers} 
                onAddSale={handleAddSale} 
                onDeleteSale={handleDeleteSale}
              />
            )}
            {activeTab === 'clientes' && (
              <Clientes 
                customers={customers} 
                sales={sales} 
                onAddCustomer={handleAddCustomer} 
                onEditCustomer={handleEditCustomer} 
                onDeleteCustomer={handleDeleteCustomer} 
              />
            )}
            {activeTab === 'fiado' && (
              <Fiado 
                sales={sales} 
                customers={customers} 
                onMarkAsPaid={handleMarkAsPaid} 
                onEditSale={handleEditSale}
                onDeleteSale={handleDeleteSale}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-2 pb-[env(safe-area-inset-bottom)] pt-2 flex justify-around items-center z-[100] shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center p-1 rounded-lg relative cursor-pointer flex-1"
            >
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20 scale-110 -translate-y-1' 
                  : 'text-gray-400'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[8px] mt-1 font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-gold-600' : 'text-gray-400'}`}>
                {item.id === 'fiado' ? 'Fiado' : item.label}
              </span>

              {item.badge !== undefined && item.badge > 0 && (
                <span className={`absolute top-0 right-1/4 translate-x-1/2 font-extrabold text-[8px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow-xs border border-white ${
                  item.id === 'fiado' && (item as any).hasOverdue ? 'bg-red-600 text-white animate-pulse' : 'bg-red-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Floating autosave status on mobile */}
      <div className="md:hidden fixed top-4 right-4 z-40 bg-white/90 backdrop-blur-xs shadow-md rounded-xl border border-gold-100 p-1.5 flex gap-1.5 items-center">
        <div className="flex items-center gap-1.5 pl-1 pr-2">
          {!isOnline && <WifiOff className="w-3 h-3 text-red-500 animate-pulse" />}
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isAutosaving ? 'bg-gold-500 animate-ping' : 'bg-emerald-400'}`}></span>
              {lastSavedAt && (
                <span className="text-[8px] text-gray-500 font-mono font-bold">{lastSavedAt.substring(0, 5)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
