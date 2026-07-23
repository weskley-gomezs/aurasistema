import { useState, FormEvent } from 'react';
import { Sale, Product, Customer, PaymentMethod, SaleItem } from '../types';
import { Search, Plus, Calendar, User, ShoppingBag, FileSpreadsheet, Trash2, X, ChevronDown, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportSalesToCSV } from '../utils/csv';

interface VendasProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  onAddSale: (sale: Omit<Sale, 'id'>) => void;
  onDeleteSale: (id: string) => void;
}

export default function Vendas({ sales, products, customers, onAddSale, onDeleteSale }: VendasProps) {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'todos' | PaymentMethod>('todos');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);

  // Cart/New Sale state
  const [selectedCustomerId, setSelectedCustomerId] = useState('venda_avulsa');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Pix');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);

  // Temporary selectors for adding products to cart
  const [tempProductId, setTempProductId] = useState('');
  const [tempQuantity, setTempQuantity] = useState(1);

  // Add item to active cart
  const handleAddToCart = () => {
    if (!tempProductId) return;
    const product = products.find(p => p.id === tempProductId);
    if (!product) return;

    if (product.quantity <= 0) {
      alert('Aviso: Este produto não possui unidades em estoque.');
    }

    // Check if product already exists in cart
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += tempQuantity;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product, quantity: tempQuantity }]);
    }

    setTempProductId('');
    setTempQuantity(1);
  };

  // Remove from cart
  const handleRemoveFromCart = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  // Delete confirmation state
  const [saleToDelete, setSaleToDelete] = useState<{ id: string } | null>(null);

  const confirmDelete = () => {
    if (saleToDelete) {
      onDeleteSale(saleToDelete.id);
      setSaleToDelete(null);
    }
  };

  // Finalize sale submission
  const handleSubmitSale = (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Por favor, adicione pelo menos um produto ao carrinho.');
      return;
    }

    // Calculate totals
    const items: SaleItem[] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      costPrice: item.product.costPrice,
      sellPrice: item.product.sellPrice
    }));

    const totalAmount = items.reduce((sum, item) => sum + (item.sellPrice * item.quantity), 0);
    const totalCost = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    const profitAmount = totalAmount - totalCost;

    // Resolve customer name
    let customerName = 'Cliente Avulso';
    if (selectedCustomerId !== 'venda_avulsa') {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) customerName = cust.name;
    }

    onAddSale({
      date: saleDate,
      customerId: selectedCustomerId,
      customerName,
      items,
      totalAmount,
      profitAmount,
      paymentMethod: selectedPaymentMethod,
      status: selectedPaymentMethod === 'Fiado' ? 'pendente' : 'pago',
      paidDate: selectedPaymentMethod === 'Fiado' ? undefined : saleDate,
      dueDate: selectedPaymentMethod === 'Fiado' ? dueDate : undefined
    });

    // Reset Form
    setCart([]);
    setSelectedCustomerId('venda_avulsa');
    setSelectedPaymentMethod('Pix');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setIsNewSaleOpen(false);
  };

  // Filter Sales list
  const filteredSales = sales.filter(s => {
    const matchesSearch = s.customerName.toLowerCase().includes(search.toLowerCase()) ||
                          s.items.some(item => item.productName.toLowerCase().includes(search.toLowerCase()));
    const matchesPayment = paymentFilter === 'todos' || s.paymentMethod === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  // Calculate current metrics based on all sales
  const getPeriodMetrics = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Helper for relative date checking
    const nowLocal = new Date();
    
    const getWeekRange = () => {
      const start = new Date(nowLocal);
      start.setDate(nowLocal.getDate() - nowLocal.getDay()); // Sunday
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
      return { start, end };
    };

    const getMonthRange = () => {
      const start = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1);
      const end = new Date(nowLocal.getFullYear(), nowLocal.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    };

    const weekRange = getWeekRange();
    const monthRange = getMonthRange();

    const todaySales = sales.filter(s => s.date === todayStr);
    const weekSales = sales.filter(s => {
      const sDate = new Date(s.date + 'T12:00:00');
      return sDate >= weekRange.start && sDate <= weekRange.end;
    });
    const monthSales = sales.filter(s => {
      const sDate = new Date(s.date + 'T12:00:00');
      return sDate >= monthRange.start && sDate <= monthRange.end;
    });

    return {
      today: {
        total: todaySales.reduce((sum, s) => sum + s.totalAmount, 0),
        profit: todaySales.reduce((sum, s) => sum + s.profitAmount, 0)
      },
      week: {
        total: weekSales.reduce((sum, s) => sum + s.totalAmount, 0),
        profit: weekSales.reduce((sum, s) => sum + s.profitAmount, 0)
      },
      month: {
        total: monthSales.reduce((sum, s) => sum + s.totalAmount, 0),
        profit: monthSales.reduce((sum, s) => sum + s.profitAmount, 0)
      }
    };
  };

  const periodMetrics = getPeriodMetrics();

  return (
    <div id="vendas-section" className="space-y-6">
      {/* Header com botões de ação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Histórico de Vendas</h2>
          <p className="text-xs text-gray-400">Registre vendas, dê baixa automática no estoque e emita relatórios.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportSalesToCSV(sales)}
            id="btn-export-csv"
            className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold px-4 py-2.5 rounded-xl transition-all border border-gray-200 text-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-gold-500" /> <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <button
            onClick={() => setIsNewSaleOpen(true)}
            id="btn-new-sale-modal"
            className="hidden md:flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-gold-500/10 text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Registrar Venda
          </button>
        </div>
      </div>

      {/* Cards de Métricas Periódicas Rápidas */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-white p-3 md:p-5 rounded-2xl md:rounded-[32px] border border-gray-200 shadow-sm">
          <span className="text-[8px] md:text-[10px] font-bold text-gray-400 block uppercase tracking-tighter">Hoje</span>
          <span className="text-xs md:text-lg font-extrabold text-gray-900 block mt-0.5">R$ {periodMetrics.today.total.toFixed(0)}</span>
          <span className="hidden sm:block text-[10px] text-gold-500 font-medium">Lucro: R$ {periodMetrics.today.profit.toFixed(0)}</span>
        </div>
        <div className="bg-white p-3 md:p-5 rounded-2xl md:rounded-[32px] border border-gray-200 shadow-sm">
          <span className="text-[8px] md:text-[10px] font-bold text-gray-400 block uppercase tracking-tighter">Semana</span>
          <span className="text-xs md:text-lg font-extrabold text-gray-900 block mt-0.5">R$ {periodMetrics.week.total.toFixed(0)}</span>
          <span className="hidden sm:block text-[10px] text-gold-500 font-medium">Lucro: R$ {periodMetrics.week.profit.toFixed(0)}</span>
        </div>
        <div className="bg-gold-100 p-3 md:p-5 rounded-2xl md:rounded-[32px] border border-gray-200 shadow-sm">
          <span className="text-[8px] md:text-[10px] font-bold text-gold-500 block uppercase tracking-tighter">Mês</span>
          <span className="text-xs md:text-lg font-extrabold text-gray-900 block mt-0.5">R$ {periodMetrics.month.total.toFixed(0)}</span>
          <span className="hidden sm:block text-[10px] text-gold-500 font-bold block mt-0.5">Lucro: R$ {periodMetrics.month.profit.toFixed(0)}</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3">
        {/* Busca por Cliente ou Produto */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por cliente ou produto vendido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="sale-search-input"
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
          />
        </div>

        {/* Filtro por Forma de Pagamento */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setPaymentFilter('todos')}
            id="filter-payment-all"
            className={`px-3.5 py-2 text-[10px] md:text-xs font-semibold rounded-lg transition-all border whitespace-nowrap ${
              paymentFilter === 'todos'
                ? 'bg-gold-500 text-white border-gold-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          {(['Pix', 'Dinheiro', 'Cartão', 'Fiado'] as PaymentMethod[]).map(method => (
            <button
              key={method}
              id={`filter-payment-${method}`}
              onClick={() => setPaymentFilter(method)}
              className={`px-3.5 py-2 text-[10px] md:text-xs font-semibold rounded-lg transition-all border whitespace-nowrap ${
                paymentFilter === method
                  ? 'bg-gold-500 text-white border-gold-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Histórico / Lista de Vendas */}
      <div className="bg-white md:rounded-2xl md:border md:border-gray-100 md:shadow-xs overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gold-50/50 border-b border-gold-100/40 text-[11px] font-bold text-gold-800 uppercase tracking-wider">
                <th className="p-4">Data</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Produtos</th>
                <th className="p-4">Pagamento</th>
                <th className="p-4">Valor Total</th>
                <th className="p-4">Lucro</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs text-gray-700">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gold-50/10 transition-colors">
                  <td className="p-4 font-mono font-medium whitespace-nowrap">
                    {new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 font-semibold text-gray-900 whitespace-nowrap">
                    {sale.customerName}
                  </td>
                  <td className="p-4 max-w-xs">
                    <div className="space-y-1">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between gap-4">
                          <span className="font-medium text-gray-950 truncate" title={item.productName}>
                            {item.productName}
                          </span>
                          <span className="text-gray-400 font-bold whitespace-nowrap">
                            {item.quantity}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="bg-gray-100 px-2 py-1 rounded-md font-semibold text-gray-600 text-[10px]">
                      {sale.paymentMethod}
                    </span>
                    {sale.paymentMethod === 'Fiado' && sale.dueDate && (
                      <span className="block text-[9px] text-amber-600 font-bold mt-1">
                        Venc: {new Date(sale.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-gray-900 whitespace-nowrap">
                    R$ {sale.totalAmount.toFixed(2)}
                  </td>
                  <td className="p-4 text-emerald-600 font-bold whitespace-nowrap">
                    R$ {sale.profitAmount.toFixed(2)}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {sale.status === 'pago' ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3.5 h-3.5" /> Pago
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                        <Clock className="w-3.5 h-3.5" /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => setSaleToDelete({ id: sale.id })}
                      id={`btn-delete-sale-${sale.id}`}
                      title="Excluir registro de venda"
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-3">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-gray-400">
                    {new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">{sale.customerName}</h4>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-black text-gray-900">R$ {sale.totalAmount.toFixed(2)}</span>
                  {sale.status === 'pago' ? (
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold">Pago</span>
                  ) : (
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-bold">Pendente</span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50 space-y-1">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="text-gray-600 truncate mr-2">{item.productName}</span>
                    <span className="text-gray-400 font-bold shrink-0">{item.quantity}x</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <span className="text-[10px] bg-gold-50 text-gold-700 px-2 py-0.5 rounded-md font-bold">
                    {sale.paymentMethod}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    Lucro: R$ {sale.profitAmount.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => setSaleToDelete({ id: sale.id })}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredSales.length === 0 && (
          <div className="p-12 text-center text-gray-400 text-sm">
            Nenhuma venda registrada que corresponda aos filtros.
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      <button
        onClick={() => setIsNewSaleOpen(true)}
        className="md:hidden fixed bottom-20 right-6 w-14 h-14 bg-gold-500 text-white rounded-full shadow-lg shadow-gold-500/40 flex items-center justify-center z-40 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal - Registrar Nova Venda */}
      <AnimatePresence>
        {isNewSaleOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-gold-500 to-rose-gold-500 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold">Registrar Nova Venda</h3>
                <button
                  onClick={() => setIsNewSaleOpen(false)}
                  id="btn-close-sale-modal"
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmitSale} className="p-4 md:p-6 space-y-4">
                {/* Seleção do Cliente e Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Cliente *</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      id="sale-customer-select"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-gray-900"
                    >
                      <option value="venda_avulsa">Cliente Avulso (Sem cadastro)</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gold-500" /> Data da Venda *
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSaleDate(new Date().toISOString().split('T')[0])}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                            saleDate === new Date().toISOString().split('T')[0]
                              ? 'bg-gold-500 text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Hoje
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            setSaleDate(yesterday.toISOString().split('T')[0]);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                            saleDate === (() => {
                              const y = new Date();
                              y.setDate(y.getDate() - 1);
                              return y.toISOString().split('T')[0];
                            })()
                              ? 'bg-gold-500 text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Ontem
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      required
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      id="sale-date-input"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-gray-900 font-medium"
                    />
                  </div>
                </div>

                {/* Seção Adicionar Itens ao Carrinho */}
                <div className="bg-gold-50/40 p-4 rounded-xl border border-gold-200/20 space-y-3">
                  <h4 className="text-xs font-bold text-gold-800 uppercase tracking-wider">Adicionar Itens à Venda</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Seleção de Produto */}
                    <div className="md:col-span-2 space-y-2">
                      <select
                        value={tempProductId}
                        onChange={(e) => setTempProductId(e.target.value)}
                        id="sale-product-select"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 text-gray-900"
                      >
                        <option value="">-- Selecione o Produto --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                            {p.name} - R$ {p.sellPrice.toFixed(2)} (Em estoque: {p.quantity} un)
                          </option>
                        ))}
                      </select>

                      {/* Preview do produto selecionado */}
                      <AnimatePresence>
                        {tempProductId && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gold-100/50"
                          >
                            <div className="w-12 h-12 rounded-md bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                              {products.find(p => p.id === tempProductId)?.photoUrl ? (
                                <img 
                                  src={products.find(p => p.id === tempProductId)?.photoUrl} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <ShoppingBag className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-gray-900 truncate">
                                {products.find(p => p.id === tempProductId)?.name}
                              </p>
                              <p className="text-[9px] text-gold-600 font-bold">
                                R$ {products.find(p => p.id === tempProductId)?.sellPrice.toFixed(2)}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Quantidade e Botão Adicionar */}
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={tempQuantity}
                        onChange={(e) => setTempQuantity(parseInt(e.target.value) || 1)}
                        id="sale-quantity-input"
                        className="w-20 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 text-center text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        id="btn-add-to-cart"
                        className="flex-1 bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs px-3 rounded-lg transition-all"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista do Carrinho */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-700 uppercase">Carrinho / Itens Selecionados</span>
                  {cart.length > 0 ? (
                    <div className="border border-gray-100 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                      <div className="divide-y divide-gray-50 text-xs">
                        {cart.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-white overflow-hidden border border-gray-100 shrink-0">
                                {item.product.photoUrl ? (
                                  <img src={item.product.photoUrl} alt={item.product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                                    <ShoppingBag className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{item.product.name}</p>
                                <p className="text-gray-500 text-[10px]">
                                  {item.quantity}x de R$ {item.product.sellPrice.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-gray-900">
                                R$ {(item.product.sellPrice * item.quantity).toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(index)}
                                id={`btn-remove-cart-${index}`}
                                className="text-red-500 hover:text-red-700 p-1 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-200 p-6 rounded-xl text-center text-gray-400 text-xs">
                      O carrinho está vazio. Adicione produtos acima para iniciar a venda.
                    </div>
                  )}
                </div>

                {/* Pagamento e Total */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 uppercase">Forma de Pagamento *</label>
                      <select
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
                        id="sale-payment-select"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-gray-900"
                      >
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão">Cartão de Crédito/Débito</option>
                        <option value="Fiado">Fiado (Ficará pendente de pagamento)</option>
                      </select>
                    </div>

                    {selectedPaymentMethod === 'Fiado' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1 bg-amber-50 p-3 rounded-xl border border-amber-200"
                      >
                        <label className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Data Combinada para Pagamento *
                        </label>
                        <input
                          type="date"
                          required
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          id="sale-due-date-input"
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900"
                        />
                      </motion.div>
                    )}
                  </div>

                  <div className="bg-rose-gold-50/30 p-4 rounded-xl border border-rose-gold-200/20 flex flex-col justify-center items-end text-right">
                    <span className="text-xs font-bold text-rose-gold-600 uppercase">Valor Total</span>
                    <span className="text-2xl font-black text-gray-900 mt-1">
                      R$ {cart.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Submit and Cancel Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsNewSaleOpen(false)}
                    id="btn-cancel-sale-modal"
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-sale-modal"
                    disabled={cart.length === 0}
                    className="w-full py-3 bg-gradient-to-r from-gold-500 to-rose-gold-500 hover:from-gold-600 hover:to-rose-gold-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-md"
                  >
                    Finalizar Venda
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão de Venda */}
      <AnimatePresence>
        {saleToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border border-red-100"
            >
              <div className="bg-red-500 text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  <h3 className="font-serif text-base font-bold">Excluir Venda</h3>
                </div>
                <button
                  onClick={() => setSaleToDelete(null)}
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-900 font-bold">Tem certeza?</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Você está prestes a excluir este registro de venda. Esta ação removerá o lucro e o faturamento do histórico, mas não devolverá os itens ao estoque automaticamente.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-4 flex gap-2">
                <button
                  onClick={() => setSaleToDelete(null)}
                  className="flex-1 py-2.5 bg-white text-gray-500 text-xs font-bold rounded-xl border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all cursor-pointer"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
