import { useState, FormEvent } from 'react';
import { Customer, Sale } from '../types';
import { Search, Plus, User, MessageCircle, AlertCircle, Calendar, PlusCircle, Edit, Trash2, X, FileDown, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateCustomerStatementPDF, getWhatsAppShareText } from '../utils/pdfGenerator';

interface ClientesProps {
  customers: Customer[];
  sales: Sale[];
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export default function Clientes({ customers, sales, onAddCustomer, onEditCustomer, onDeleteCustomer }: ClientesProps) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'todos' | 'reativacao'>('todos');
  const [selectedCustomerIdForHistory, setSelectedCustomerIdForHistory] = useState<string | null>(null);

  // Statement PDF States
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  const [showStatementSuccessModal, setShowStatementSuccessModal] = useState(false);
  const [lastGeneratedStatementInfo, setLastGeneratedStatementInfo] = useState<{
    customerName: string;
    totalAmount: number;
    salesCount: number;
    pendingAmount: number;
    whatsappUrl: string;
  } | null>(null);

  const handleExportStatement = async (customer: Customer, customerSales: Sale[]) => {
    setIsGeneratingStatement(true);
    try {
      await generateCustomerStatementPDF(customer, customerSales);

      const totalSpent = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalPending = customerSales
        .filter(s => s.status === 'pendente')
        .reduce((sum, s) => sum + s.totalAmount, 0);

      const shareText = getWhatsAppShareText(
        'statement',
        customer.name,
        totalSpent,
        customerSales.length,
        totalPending
      );

      const whatsappUrl = `https://wa.me/55${customer.whatsapp}?text=${shareText}`;

      setLastGeneratedStatementInfo({
        customerName: customer.name,
        totalAmount: totalSpent,
        salesCount: customerSales.length,
        pendingAmount: totalPending,
        whatsappUrl
      });
      setShowStatementSuccessModal(true);
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar o extrato do cliente em PDF.');
    } finally {
      setIsGeneratingStatement(false);
    }
  };

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Input states
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');

  // Helpers
  const getDaysSinceLastPurchase = (customerId: string): number | null => {
    const customerSales = sales.filter(s => s.customerId === customerId);
    if (customerSales.length === 0) return null; // Never purchased

    // Find the latest sale date
    const latestSale = customerSales.reduce((latest, current) => {
      return new Date(current.date + 'T12:00:00') > new Date(latest.date + 'T12:00:00') ? current : latest;
    });

    const diffTime = Math.abs(new Date().getTime() - new Date(latestSale.date + 'T12:00:00').getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Open forms
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setWhatsapp('');
    setNotes('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setWhatsapp(c.whatsapp);
    setNotes(c.notes);
    setIsFormOpen(true);
  };

  // Submit
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !whatsapp) {
      alert('Por favor, preencha o Nome e WhatsApp.');
      return;
    }

    const cleanedWhatsapp = whatsapp.replace(/\D/g, ''); // numbers only

    const customerData = {
      name,
      whatsapp: cleanedWhatsapp,
      notes
    };

    if (editingCustomer) {
      onEditCustomer({
        ...customerData,
        id: editingCustomer.id
      });
    } else {
      onAddCustomer(customerData);
    }

    setIsFormOpen(false);
  };

  // Delete confirmation state
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string, name: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    setCustomerToDelete({ id, name });
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      onDeleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    }
  };

  // Filter clients
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.whatsapp.includes(search) ||
                          c.notes.toLowerCase().includes(search.toLowerCase());

    if (filterMode === 'reativacao') {
      const days = getDaysSinceLastPurchase(c.id);
      // Reativação: has never bought or last bought > 30 days ago
      return matchesSearch && (days === null || days > 30);
    }

    return matchesSearch;
  });

  // Calculate purchase summaries for each customer
  const getCustomerSummary = (customerId: string) => {
    const customerSales = sales.filter(s => s.customerId === customerId);
    const totalSpent = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const lastPurchaseDays = getDaysSinceLastPurchase(customerId);

    return {
      salesCount: customerSales.length,
      totalSpent,
      lastPurchaseDays
    };
  };

  return (
    <div id="clientes-section" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Cadastro de Clientes</h2>
          <p className="text-xs text-gray-500">Mantenha as preferências de seus clientes arquivadas e ative-os via WhatsApp.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          id="btn-add-customer"
          className="hidden md:flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-gold-500/10 text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Busca e Abas de Filtro */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        {/* Input de Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou observação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="customer-search-input"
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
          />
        </div>

        {/* Abas */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode('todos')}
            id="tab-customers-all"
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
              filterMode === 'todos'
                ? 'bg-gold-500 text-white border-gold-500 shadow-xs'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todos Clientes ({customers.length})
          </button>
          <button
            onClick={() => setFilterMode('reativacao')}
            id="tab-customers-reactivate"
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center gap-1.5 ${
              filterMode === 'reativacao'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" /> Sem Compras há 30+ Dias
          </button>
        </div>
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.map(customer => {
          const summary = getCustomerSummary(customer.id);
          const needsReactivation = summary.lastPurchaseDays === null || summary.lastPurchaseDays > 30;

          // Message template for reactivation
          const encodedMessage = encodeURIComponent(
            `Olá, ${customer.name}! Tudo bem? 🌟\n\nHá algum tempo não conversamos sobre os seus perfumes e cosméticos favoritos! Passando para contar que chegaram novidades incríveis na Aura Dourada Sistema. ✨\n\nQue tal dar uma olhadinha no que temos para realçar ainda mais o seu brilho? Se quiser, posso te mandar fotos!`
          );
          const whatsappUrl = `https://wa.me/55${customer.whatsapp}?text=${encodedMessage}`;

          return (
            <div
              key={customer.id}
              className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                needsReactivation ? 'border-amber-100 bg-amber-50/10' : 'border-gray-100 hover:border-gold-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-100/50 text-gold-700 flex items-center justify-center font-serif text-lg font-bold">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-gray-900">{customer.name}</h3>
                      <p className="text-[10px] font-mono text-gray-400">WhatsApp: {customer.whatsapp}</p>
                    </div>
                  </div>
                  {needsReactivation && (
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm tracking-wider">
                      Reativar
                    </span>
                  )}
                </div>

                {/* Observações */}
                {customer.notes && (
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100/30 italic">
                    "{customer.notes}"
                  </p>
                )}

                {/* Estatísticas de Compras */}
                <div className="grid grid-cols-3 gap-2 text-center bg-gold-50/20 p-2 rounded-xl border border-gold-100/20">
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-semibold">Compras</span>
                    <span className="text-sm font-extrabold text-gray-900">{summary.salesCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-semibold">Total Gasto</span>
                    <span className="text-sm font-extrabold text-gray-900">R$ {summary.totalSpent.toFixed(0)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-semibold">Última compra</span>
                    <span className="text-xs font-bold text-gray-900 block mt-0.5">
                      {summary.lastPurchaseDays === null 
                        ? 'Nunca' 
                        : `${summary.lastPurchaseDays}d atrás`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-4">
                <button
                  onClick={() => setSelectedCustomerIdForHistory(customer.id)}
                  id={`btn-view-history-${customer.id}`}
                  className="text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1 bg-gold-50 px-3 py-1.5 rounded-lg transition-all"
                >
                  <Calendar className="w-3.5 h-3.5" /> Histórico de Compras
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(customer)}
                    id={`btn-edit-customer-${customer.id}`}
                    title="Editar Cadastro"
                    className="p-1.5 bg-white border border-gray-200 text-gray-600 hover:text-gold-600 hover:border-gold-300 rounded-lg transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id, customer.name)}
                    id={`btn-delete-customer-${customer.id}`}
                    title="Excluir Cliente"
                    className="p-1.5 bg-white border border-red-100 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={`link-whatsapp-${customer.id}`}
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" /> WhatsApp
                  </a>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
            Nenhum cliente cadastrado correspondendo aos filtros.
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      <button
        onClick={handleOpenAdd}
        className="md:hidden fixed bottom-20 right-6 w-14 h-14 bg-gold-500 text-white rounded-full shadow-lg shadow-gold-500/40 flex items-center justify-center z-40 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Drawer / Modal Histórico de Compras Detalhado */}
      <AnimatePresence>
        {selectedCustomerIdForHistory && (() => {
          const customer = customers.find(c => c.id === selectedCustomerIdForHistory);
          const customerSales = sales.filter(s => s.customerId === selectedCustomerIdForHistory);
          if (!customer) return null;

          return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-gold-500 to-rose-gold-500 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <div>
                      <h3 className="font-serif text-base font-bold">Histórico de Compras</h3>
                      <p className="text-[10px] text-white/80">{customer.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomerIdForHistory(null)}
                    id="btn-close-history-modal"
                    className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Histórico Body */}
                <div className="p-6 max-h-96 overflow-y-auto space-y-4">
                  {customerSales.length > 0 ? (
                    customerSales.map(sale => (
                      <div key={sale.id} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">
                            Data: {new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sale.status === 'pago' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {sale.status === 'pago' ? 'Pago' : 'Pendente (Fiado)'}
                          </span>
                        </div>

                        {/* Itens */}
                        <div className="space-y-1 bg-white p-2.5 rounded-lg border border-gray-100">
                          {sale.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-gray-800">{item.productName}</span>
                              <span className="text-gray-500 font-bold">{item.quantity}x de R$ {item.sellPrice.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center text-xs font-bold pt-1">
                          <span className="text-gray-500">Forma: {sale.paymentMethod}</span>
                          <span className="text-gray-900 text-sm">Total: R$ {sale.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      Este cliente ainda não realizou nenhuma compra.
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center">
                  <button
                    onClick={() => handleExportStatement(customer, customerSales)}
                    disabled={isGeneratingStatement}
                    id={`btn-export-statement-${customer.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-gold-500 to-rose-gold-500 hover:from-gold-600 hover:to-rose-gold-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    {isGeneratingStatement ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <FileDown className="w-3.5 h-3.5" />
                        Gerar Extrato (PDF)
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedCustomerIdForHistory(null)}
                    id="btn-close-history-modal-footer"
                    className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Fechar Histórico
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Modal - Cadastrar/Editar Cliente */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-gold-500 to-rose-gold-500 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold">
                  {editingCustomer ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  id="btn-close-customer-modal"
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Nome */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mariana Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    id="customer-input-name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">WhatsApp (Apenas números) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 11999998888"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    id="customer-input-whatsapp"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
                  />
                  <p className="text-[10px] text-gray-400">Insira com o DDD, ex: 11999998888</p>
                </div>

                {/* Observações */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">Preferências / Aniversário</label>
                  <textarea
                    placeholder="Ex: Faz aniversário dia 15/09, adora perfumes florais cítricos e embalagens luxuosas."
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    id="customer-input-notes"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900 resize-none"
                  />
                </div>

                {/* Submit and Cancel */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    id="btn-cancel-customer-modal"
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-customer-modal"
                    className="w-full py-3 bg-gradient-to-r from-gold-500 to-rose-gold-500 hover:from-gold-600 hover:to-rose-gold-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de confirmação e compartilhamento de Extrato do Cliente */}
      <AnimatePresence>
        {showStatementSuccessModal && lastGeneratedStatementInfo && (
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
                  <h3 className="font-serif text-base font-bold">Extrato PDF Gerado!</h3>
                </div>
                <button
                  onClick={() => setShowStatementSuccessModal(false)}
                  id="btn-close-success-statement-modal"
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
                  <h4 className="font-serif font-bold text-gray-800 text-base">Extrato pronto com sucesso!</h4>
                  <p className="text-xs text-gray-400 mt-1">O histórico de {lastGeneratedStatementInfo.customerName} foi exportado.</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 text-left border border-gray-100 text-xs space-y-1.5 max-w-xs mx-auto">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente:</span>
                    <span className="font-bold text-gray-800">{lastGeneratedStatementInfo.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total de Compras:</span>
                    <span className="font-bold text-gray-800">{lastGeneratedStatementInfo.salesCount}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200/50 pt-1.5">
                    <span className="text-gray-500 font-semibold">Saldo Pendente (Fiado):</span>
                    <span className={`font-bold ${lastGeneratedStatementInfo.pendingAmount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      R$ {lastGeneratedStatementInfo.pendingAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  Deseja abrir o WhatsApp para enviar a mensagem de resumo de cobrança/prestação de contas com o link do extrato?
                </p>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowStatementSuccessModal(false)}
                  id="btn-dismiss-statement-modal"
                  className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <a
                  href={lastGeneratedStatementInfo.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowStatementSuccessModal(false)}
                  id="link-send-statement-whatsapp"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  Enviar WhatsApp
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de Confirmação de Exclusão de Cliente */}
      <AnimatePresence>
        {customerToDelete && (
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
                  <h3 className="font-serif text-base font-bold">Excluir Cliente</h3>
                </div>
                <button
                  onClick={() => setCustomerToDelete(null)}
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
                    Você está prestes a excluir <span className="font-bold text-gray-700">"{customerToDelete.name}"</span>. Todos os dados de contato e histórico vinculados a este cadastro serão perdidos.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-4 flex gap-2">
                <button
                  onClick={() => setCustomerToDelete(null)}
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
