import { useState, ChangeEvent } from 'react';
import { Sale, Product, Customer } from '../types';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  DollarSign, 
  Calendar, 
  ChevronRight, 
  AlertTriangle, 
  FileDown, 
  Share2, 
  MessageCircle, 
  CheckCircle, 
  X, 
  Loader2,
  Cloud,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateSalesReportPDF, getWhatsAppShareText } from '../utils/pdfGenerator';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  onNavigate: (tab: string) => void;
  onBackupExport?: () => void;
  onBackupImport?: (e: ChangeEvent<HTMLInputElement>) => void;
  onForceSync?: () => void;
  isAutosaving?: boolean;
}

export default function Dashboard({ 
  sales, 
  products, 
  customers, 
  onNavigate,
  onBackupExport,
  onBackupImport,
  onForceSync,
  isAutosaving
}: DashboardProps) {
  const [timeRange, setTimeRange] = useState<'month' | 'total'>('month');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showReportSuccessModal, setShowReportSuccessModal] = useState(false);
  const [lastGeneratedReportInfo, setLastGeneratedReportInfo] = useState<{
    revenue: number;
    count: number;
    whatsappUrl: string;
  } | null>(null);

  const handleGenerateReport = async () => {
    setIsGeneratingPdf(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filter sales based on selected range
      const salesToReport = sales.filter(sale => {
        if (timeRange === 'total') return true;
        const saleDate = new Date(sale.date + 'T12:00:00'); // avoid time zone shift
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
      });

      await generateSalesReportPDF(salesToReport, products, timeRange);
      
      const revenue = salesToReport.reduce((sum, s) => sum + s.totalAmount, 0);
      const shareText = getWhatsAppShareText('report', '', revenue, salesToReport.length);
      const whatsappUrl = `https://wa.me/?text=${shareText}`;

      setLastGeneratedReportInfo({
        revenue,
        count: salesToReport.length,
        whatsappUrl
      });
      setShowReportSuccessModal(true);
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar o relatório em PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Helpers for dates
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter sales based on selected range
  const filteredSalesForMetrics = sales.filter(sale => {
    if (timeRange === 'total') return true;
    const saleDate = new Date(sale.date + 'T12:00:00'); // avoid time zone shift
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
  });

  // Calculate Metrics
  const totalRevenue = filteredSalesForMetrics.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfit = filteredSalesForMetrics.reduce((sum, s) => sum + s.profitAmount, 0);

  // Active Customers: customers with at least one purchase in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeCustomersCount = customers.filter(c => {
    const customerSales = sales.filter(s => s.customerId === c.id);
    if (customerSales.length === 0) return false;
    // Check if any sale is in the last 30 days
    return customerSales.some(s => new Date(s.date + 'T12:00:00') >= thirtyDaysAgo);
  }).length;

  // Best Selling Product
  const productQuantities: { [key: string]: { name: string; qty: number } } = {};
  filteredSalesForMetrics.forEach(sale => {
    sale.items.forEach(item => {
      if (!productQuantities[item.productId]) {
        productQuantities[item.productId] = { name: item.productName, qty: 0 };
      }
      productQuantities[item.productId].qty += item.quantity;
    });
  });

  let bestSeller = 'Nenhum';
  let bestSellerQty = 0;
  Object.keys(productQuantities).forEach(id => {
    if (productQuantities[id].qty > bestSellerQty) {
      bestSellerQty = productQuantities[id].qty;
      bestSeller = productQuantities[id].name;
    }
  });

  // Low stock alert products count
  const lowStockProducts = products.filter(p => p.quantity <= p.minQuantity);

  // Prepare chart data for the last 30 days
  const getChartData = () => {
    const dataPoints: { dateLabel: string; displayDate: string; amount: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyymmdd = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      const daySales = sales.filter(s => s.date === yyyymmdd);
      const totalAmount = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
      
      dataPoints.push({
        dateLabel: yyyymmdd,
        displayDate,
        amount: totalAmount,
      });
    }
    return dataPoints;
  };

  const chartData = getChartData();
  const maxSalesAmount = Math.max(...chartData.map(d => d.amount), 500); // minimum 500 to scale nicely

  return (
    <div id="dashboard-section" className="space-y-6">
      {/* Header com slogan da marca */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between md:block">
          <div>
            <h2 className="text-xl md:text-2xl font-serif text-gray-900">Olá, Bem-vinda!</h2>
            <p className="text-[10px] md:text-sm text-gray-400">Confira o resumo do seu negócio hoje.</p>
          </div>
          <div className="md:hidden w-12 h-12 bg-white rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <img src="https://i.imgur.com/XAhbi19.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-xs border border-gray-200">
            <button
              onClick={() => setTimeRange('month')}
              id="btn-metrics-month"
              className={`px-3 py-1.5 text-[10px] md:text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                timeRange === 'month'
                  ? 'bg-gold-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setTimeRange('total')}
              id="btn-metrics-total"
              className={`px-3 py-1.5 text-[10px] md:text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                timeRange === 'total'
                  ? 'bg-gold-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Total
            </button>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingPdf}
            id="btn-generate-report-pdf"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gold-500 to-rose-gold-500 hover:from-gold-600 hover:to-rose-gold-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold text-[10px] md:text-xs rounded-lg transition-all shadow-xs cursor-pointer h-[32px] whitespace-nowrap"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Gerando...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                PDF
              </>
            )}
          </button>

          <div className="hidden md:flex gap-3 items-center">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold leading-none">Faturamento</p>
              <p className="text-lg font-bold text-gold-500 mt-1 leading-none">
                R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 bg-white rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
              <img src="https://i.imgur.com/XAhbi19.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </header>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total em Caixa / Vendas */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] border border-gray-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-tighter">Vendas</span>
            <div className="p-1.5 md:p-2 bg-gold-100 rounded-lg md:rounded-xl text-gold-500">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-base md:text-2xl font-bold text-gold-500">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Total vendido</p>
          </div>
        </motion.div>

        {/* Lucro Estimado */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] border border-gray-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-tighter">Lucro</span>
            <div className="p-1.5 md:p-2 bg-emerald-50 rounded-lg md:rounded-xl text-emerald-600">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-base md:text-2xl font-bold text-gray-900">
              R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Margem: {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(0) : 0}%</p>
          </div>
        </motion.div>

        {/* Produto Mais Vendido */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-gold-100 p-4 md:p-5 rounded-2xl md:rounded-[32px] border border-gray-200 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-[10px] md:text-xs font-semibold text-gold-500 uppercase tracking-tighter">Top Item</span>
            <div className="p-1.5 md:p-2 bg-white rounded-lg md:rounded-xl text-gold-500 shadow-xs">
              <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-sm md:text-lg font-bold text-gray-900 line-clamp-1 font-serif" title={bestSeller}>
              {bestSeller}
            </h3>
            <p className="text-[10px] text-gray-600 mt-1">
              {bestSellerQty > 0 ? `${bestSellerQty} unidades` : 'Sem vendas'}
            </p>
          </div>
        </motion.div>

        {/* Clientes Ativos */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] border border-gray-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-tighter">Ativos</span>
            <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg md:rounded-xl text-blue-600">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-base md:text-2xl font-bold text-gray-900">
              {activeCustomersCount} <span className="text-[10px] font-normal text-gray-400">/ {customers.length}</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Últimos 30 dias</p>
          </div>
        </motion.div>
      </div>

      {/* Alertas Rápidos */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[2xl] p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">Produtos com Estoque Baixo!</p>
              <p className="text-xs text-amber-700">{lowStockProducts.length} itens estão abaixo do nível mínimo definido.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('estoque')}
            id="btn-go-to-stock-alert"
            className="text-xs font-bold text-amber-950 flex items-center gap-1 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            Ver estoque <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Gráfico customizado de vendas por dia (Últimos 30 Dias) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-lg font-bold text-gray-900">Vendas nos Últimos 30 Dias</h2>
            <p className="text-xs text-gray-500">Acompanhamento diário do faturamento (R$)</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
            <Calendar className="w-3.5 h-3.5" />
            <span>Últimos 30 dias</span>
          </div>
        </div>

        {/* Custom SVG Line Chart */}
        <div className="h-64 w-full relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 240" preserveAspectRatio="none">
            <defs>
              {/* Gold & Rosé Gradient for the area under the curve */}
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c5a059" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#d49a89" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = 200 * ratio + 10;
              const val = maxSalesAmount * (1 - ratio);
              return (
                <g key={index} className="opacity-40">
                  <line
                    x1="40"
                    y1={y}
                    x2="980"
                    y2={y}
                    stroke="#eadcb2"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="5"
                    y={y + 4}
                    fill="#967132"
                    fontSize="10"
                    fontWeight="500"
                    fontFamily="monospace"
                  >
                    R$ {val.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Path Drawing */}
            {(() => {
              const paddingLeft = 60;
              const paddingRight = 20;
              const width = 1000 - paddingLeft - paddingRight;
              const pointsCount = chartData.length;
              const stepX = width / (pointsCount - 1);

              const coords = chartData.map((d, index) => {
                const x = paddingLeft + index * stepX;
                // invert because SVG y-axis starts at top
                const y = 210 - (d.amount / maxSalesAmount) * 200;
                return { x, y, displayDate: d.displayDate, amount: d.amount };
              });

              const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
              const areaPath = `${linePath} L ${coords[coords.length - 1].x} 210 L ${coords[0].x} 210 Z`;

              return (
                <>
                  {/* Shaded Area */}
                  <path d={areaPath} fill="url(#chartGradient)" />

                  {/* Main Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ stroke: '#c5a059' }}
                  />

                  {/* Highlight points where sales occurred */}
                  {coords.map((c, i) => {
                    if (c.amount === 0) return null;
                    return (
                      <g key={i} className="group cursor-pointer">
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r="5"
                          fill="#c5a059"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all duration-200 group-hover:r-7"
                        />
                        <title>{`${c.displayDate}: R$ ${c.amount.toFixed(2)}`}</title>
                      </g>
                    );
                  })}

                  {/* X-axis dates (show every 4th day to avoid overlap) */}
                  {coords.map((c, i) => {
                    if (i % 4 !== 0 && i !== coords.length - 1) return null;
                    return (
                      <text
                        key={i}
                        x={c.x}
                        y="232"
                        fill="#967132"
                        fontSize="10"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {c.displayDate}
                      </text>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        </div>

        {/* Rodapé informativo */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gold-100/50 pt-4 mt-4">
          <div className="flex gap-4 text-xs font-medium text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gold-500 inline-block" />
              Dias com vendas registradas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gold-200 inline-block" />
              Dias sem vendas
            </span>
          </div>
          <button
            onClick={() => onNavigate('vendas')}
            id="btn-new-sale-shortcut"
            className="text-xs font-bold bg-gradient-to-r from-gold-500 to-rose-gold-500 hover:from-gold-600 hover:to-rose-gold-600 text-white px-4 py-2 rounded-xl transition-all shadow-xs"
          >
            + Registrar Nova Venda
          </button>
        </div>
      </div>

      {/* Seção de Sincronização e Backup em Nuvem */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gold-50 text-gold-500 rounded-2xl border border-gold-100">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-gray-900">Sincronização e Backup em Nuvem</h3>
            <p className="text-xs text-gray-500">Mantenha seus dados seguros e sincronizados em outros aparelhos (celular/computador).</p>
          </div>
        </div>

        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">💡 Como sincronizar no celular:</p>
          <p>1. No seu computador, clique em <strong>Sincronizar Agora ☁️</strong> para enviar os dados atuais para a nuvem.</p>
          <p>2. Abra o sistema no seu celular (utilizando o mesmo link). Os dados serão carregados automaticamente!</p>
          <p>3. Se preferir, baixe o arquivo de backup abaixo e importe-o em qualquer outro aparelho para transferir tudo instantaneamente.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={onForceSync}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-gold-500/10 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isAutosaving ? 'animate-spin' : ''}`} />
            Sincronizar Agora ☁️
          </button>

          <button
            onClick={onBackupExport}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-gold-500" />
            Baixar Backup 💾
          </button>

          <label className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold text-xs rounded-xl transition-all cursor-pointer text-center">
            <Upload className="w-4 h-4 text-gray-500" />
            <span>Restaurar Backup 📂</span>
            <input
              type="file"
              accept=".json"
              onChange={onBackupImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Modal de confirmação e compartilhamento de relatório de vendas */}
      <AnimatePresence>
        {showReportSuccessModal && lastGeneratedReportInfo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gold-100"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-gold-500 to-rose-gold-500 text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <h3 className="font-serif text-base font-bold">Relatório PDF Gerado!</h3>
                </div>
                <button
                  onClick={() => setShowReportSuccessModal(false)}
                  id="btn-close-success-report-modal"
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
                  ✓
                </div>
                <div>
                  <h4 className="font-serif font-bold text-gray-800 text-base">Relatório pronto com sucesso!</h4>
                  <p className="text-xs text-gray-400 mt-1">O arquivo PDF foi baixado ou compartilhado no seu dispositivo.</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 text-left border border-gray-100 text-xs space-y-1.5 max-w-xs mx-auto">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Período:</span>
                    <span className="font-bold text-gray-800">{timeRange === 'month' ? 'Este Mês' : 'Histórico Total'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total de Vendas:</span>
                    <span className="font-bold text-gray-800">{lastGeneratedReportInfo.count}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200/50 pt-1.5">
                    <span className="text-gray-500 font-semibold">Faturamento total:</span>
                    <span className="font-bold text-gold-600">R$ {lastGeneratedReportInfo.revenue.toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  Deseja também abrir o WhatsApp para enviar o texto de resumo do relatório?
                </p>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportSuccessModal(false)}
                  id="btn-dismiss-report-modal"
                  className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <a
                  href={lastGeneratedReportInfo.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowReportSuccessModal(false)}
                  id="link-send-report-whatsapp"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  Compartilhar WhatsApp
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
