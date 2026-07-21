import { useState } from 'react';
import { Sale, Customer, PaymentMethod } from '../types';
import { DollarSign, MessageCircle, CheckCircle, AlertCircle, Copy, Check, ExternalLink, Calendar, HelpCircle, Trash2, CreditCard, X, Clock, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FiadoProps {
  sales: Sale[];
  customers: Customer[];
  onMarkAsPaid: (saleId: string, newMethod?: PaymentMethod) => void;
  onEditSale: (saleId: string, updates: Partial<Sale>) => void;
  onDeleteSale: (id: string) => void;
}

export default function Fiado({ sales, customers, onMarkAsPaid, onEditSale, onDeleteSale }: FiadoProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'gentil' | 'direta' | 'lembrete'>('gentil');
  const [saleToPay, setSaleToPay] = useState<{ id: string, amount: number } | null>(null);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [paymentMethodForPaid, setPaymentMethodForPaid] = useState<PaymentMethod>('Pix');
  const [saleToDelete, setSaleToDelete] = useState<{ id: string } | null>(null);

  // Edit form state
  const [editStatus, setEditStatus] = useState<'pago' | 'pendente'>('pendente');
  const [editMethod, setEditMethod] = useState<PaymentMethod>('Fiado');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editCustomerId, setEditCustomerId] = useState('venda_avulsa');
  const [editCustomerName, setEditCustomerName] = useState('Cliente Avulso');

  const confirmPayment = () => {
    if (saleToPay) {
      onMarkAsPaid(saleToPay.id, paymentMethodForPaid);
      setSaleToPay(null);
    }
  };

  const handleOpenEdit = (sale: Sale) => {
    setSaleToEdit(sale);
    setEditStatus(sale.status);
    setEditMethod(sale.paymentMethod);
    setEditDueDate(sale.dueDate || '');
    setEditAmount(sale.totalAmount);
    setEditCustomerId(sale.customerId || 'venda_avulsa');
    setEditCustomerName(sale.customerName || 'Cliente Avulso');
  };

  const saveEdit = () => {
    if (saleToEdit) {
      onEditSale(saleToEdit.id, {
        status: editStatus,
        paymentMethod: editMethod,
        dueDate: editDueDate || undefined,
        totalAmount: editAmount,
        customerId: editCustomerId,
        customerName: editCustomerName
      });
      setSaleToEdit(null);
    }
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      onDeleteSale(saleToDelete.id);
      setSaleToDelete(null);
    }
  };

  // Filter out pending/debt sales
  const pendingSales = sales.filter(s => s.status === 'pendente');

  // Calculate general total open amount
  const totalOpenAmount = pendingSales.reduce((sum, s) => sum + s.totalAmount, 0);

  // Group pending sales by customer
  const customerDebtsMap: { [key: string]: { customerName: string; whatsapp: string; totalDebt: number; salesList: Sale[] } } = {};

  pendingSales.forEach(sale => {
    const custId = sale.customerId;
    const resolvedName = sale.customerName;

    // Try to find whatsapp
    let whatsapp = '';
    const originalCust = customers.find(c => c.id === custId);
    if (originalCust) {
      whatsapp = originalCust.whatsapp;
    }

    // Do not group "Cliente Avulso" together. Each gets its own card (use sale.id).
    const groupKey = custId === 'venda_avulsa' ? sale.id : custId;

    if (!customerDebtsMap[groupKey]) {
      customerDebtsMap[groupKey] = {
        customerName: resolvedName,
        whatsapp,
        totalDebt: 0,
        salesList: []
      };
    }

    customerDebtsMap[groupKey].totalDebt += sale.totalAmount;
    customerDebtsMap[groupKey].salesList.push(sale);
  });

  const customerDebtsList = Object.keys(customerDebtsMap).map(id => ({
    groupKey: id,
    customerId: customerDebtsMap[id].salesList[0].customerId,
    ...customerDebtsMap[id]
  }));

  // Message template generator
  const getCollectionMessage = (customerName: string, amount: number, salesList: Sale[]) => {
    const formattedAmount = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Group items by sale date for clearer messaging
    const salesSummary = salesList.map(s => {
      const date = new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR');
      const items = s.items.map(it => it.productName).join(', ');
      return `📅 ${date}: ${items}`;
    }).join('\n');

    const dueDates = salesList.map(s => s.dueDate).filter(Boolean) as string[];
    const firstDueDate = dueDates.length > 0 ? dueDates[0] : null;
    const formattedDueDate = firstDueDate 
      ? new Date(firstDueDate + 'T12:00:00').toLocaleDateString('pt-BR') 
      : null;

    switch (selectedTemplate) {
      case 'gentil':
        return `Olá, ${customerName}! Tudo bem? 🌸 Passei para lembrar das suas pendências na Aura Dourada Sistema:\n\n${salesSummary}\n\nO valor total em aberto é de *R$ ${formattedAmount}*${formattedDueDate ? `. Tínhamos combinado para o dia ${formattedDueDate}` : ''}.\n\nSe precisar, me avisa para combinarmos o Pix. Muito obrigada! 🥰✨`;
      case 'direta':
        return `Olá, ${customerName}! Passando para fazer o acerto da sua pendência de *R$ ${formattedAmount}* na Aura Dourada Sistema referente a:\n\n${salesSummary}\n\nVocê prefere realizar o pagamento via Pix ou dinheiro? Me avise para eu poder dar baixa aqui no sistema. Aguardo seu retorno! 👍`;
      case 'lembrete':
      default:
        return `Olá, ${customerName}! Lembrete rápido do acerto do seu fiado no valor de *R$ ${formattedAmount}*.\n\nItens pendentes:\n${salesSummary}\n\nChave Pix para pagamento: (Insira sua chave Pix aqui).\nQualquer dúvida estou à disposição! 🌟`;
    }
  };

  const isOverdue = (dueDateStr?: string) => {
    if (!dueDateStr) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return todayStr > dueDateStr;
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Calculate overdue count
  const overdueCount = pendingSales.filter(s => isOverdue(s.dueDate)).length;
  const overdueAmount = pendingSales.filter(s => isOverdue(s.dueDate)).reduce((sum, s) => sum + s.totalAmount, 0);

  return (
    <div id="fiado-section" className="space-y-6">
      {/* Header com indicador de total */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-red-50 to-rose-gold-50 p-4 md:p-6 rounded-2xl border border-red-100/50">
        <div>
          <h2 className="font-serif text-xl md:text-2xl font-bold text-gray-900">Fiado / Pendências</h2>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1">Gerencie mensagens de cobrança e pendências.</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {overdueCount > 0 && (
            <div className="flex-1 md:flex-none bg-red-600 px-3 md:px-4 py-2 md:py-3 rounded-xl shadow-lg shadow-red-500/20 flex flex-col items-end animate-pulse">
              <span className="text-[8px] md:text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
                <Clock className="w-3 md:w-3.5 h-3 md:h-3.5" /> Vencidos
              </span>
              <span className="text-sm md:text-xl font-black text-white mt-0.5">
                R$ {overdueAmount.toFixed(0)}
              </span>
            </div>
          )}
          <div className="flex-1 md:flex-none bg-white px-3 md:px-5 py-2 md:py-3 rounded-xl border border-red-200/50 shadow-xs flex flex-col items-end">
            <span className="text-[8px] md:text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
              <AlertCircle className="w-3 md:w-3.5 h-3 md:h-3.5" /> A Receber
            </span>
            <span className="text-sm md:text-2xl font-black text-red-600 mt-0.5">
              R$ {totalOpenAmount.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Seletor de Modelo de Mensagem de Cobrança */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Selecione o Tom da Mensagem de Cobrança:</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedTemplate('gentil')}
            id="template-btn-gentle"
            className={`px-3 py-2.5 text-xs font-semibold rounded-xl transition-all border text-center cursor-pointer ${
              selectedTemplate === 'gentil'
                ? 'bg-gold-500 text-white border-gold-500 shadow-md shadow-gold-500/10'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            🌸 Tom Amigável / Gentil
          </button>
          <button
            onClick={() => setSelectedTemplate('direta')}
            id="template-btn-direct"
            className={`px-3 py-2.5 text-xs font-semibold rounded-xl transition-all border text-center cursor-pointer ${
              selectedTemplate === 'direta'
                ? 'bg-gold-500 text-white border-gold-500 shadow-md shadow-gold-500/10'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            👍 Tom Direto / Comercial
          </button>
          <button
            onClick={() => setSelectedTemplate('lembrete')}
            id="template-btn-reminder"
            className={`px-3 py-2.5 text-xs font-semibold rounded-xl transition-all border text-center cursor-pointer ${
              selectedTemplate === 'lembrete'
                ? 'bg-gold-500 text-white border-gold-500 shadow-md shadow-gold-500/10'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            🌟 Apenas Chave Pix / Dados
          </button>
        </div>
      </div>

      {/* Lista de Clientes devedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customerDebtsList.map(item => {
          const messageText = getCollectionMessage(item.customerName, item.totalDebt, item.salesList);
          const whatsappUrl = item.whatsapp 
            ? `https://wa.me/55${item.whatsapp}?text=${encodeURIComponent(messageText)}`
            : null;

          return (
            <div key={item.groupKey} className="bg-white rounded-2xl border border-red-100 p-5 flex flex-col justify-between shadow-2xs">
              <div className="space-y-4">
                {/* Nome e Total Devedor */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-gray-900">{item.customerName}</h3>
                    {item.whatsapp ? (
                      <p className="text-[10px] font-mono text-gray-400">WhatsApp: {item.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) *****-$3")}</p>
                    ) : (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1 font-semibold">
                        <HelpCircle className="w-3.5 h-3.5" /> Sem WhatsApp cadastrado
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block uppercase font-semibold">Em aberto</span>
                    <span className="text-base font-extrabold text-red-600">R$ {item.totalDebt.toFixed(2)}</span>
                  </div>
                </div>

                {/* Lista de Vendas em Aberto */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Vendas Pendentes Individualizadas:</span>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {item.salesList.map((sale, idx) => {
                      const overdue = isOverdue(sale.dueDate);
                      return (
                        <div key={sale.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-2 transition-all hover:border-gold-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-gold-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <p className="font-bold text-gray-800 text-xs">
                                Venda de {new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <span className="font-black text-gray-900 text-sm">R$ {sale.totalAmount.toFixed(2)}</span>
                          </div>

                          <div className="pl-7">
                            <p className="text-gray-500 text-[11px] leading-relaxed italic">
                              {sale.items.map(it => `${it.quantity}x ${it.productName}`).join(', ')}
                            </p>
                            
                            {sale.dueDate && (
                              <div className={`text-[10px] font-bold flex items-center gap-1.5 mt-2 p-1.5 rounded-lg ${overdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {overdue ? 'Vencido em: ' : 'Vencimento: '}
                                {new Date(sale.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-3 justify-end">
                              <button
                                onClick={() => handleOpenEdit(sale)}
                                id={`btn-edit-sale-${sale.id}`}
                                title="Editar esta venda"
                                className="px-3 py-1.5 bg-white text-gold-600 hover:bg-gold-50 rounded-lg border border-gold-100 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Edit className="w-3 h-3" /> Editar
                              </button>
                              <button
                                onClick={() => setSaleToDelete({ id: sale.id })}
                                id={`btn-delete-sale-${sale.id}`}
                                title="Excluir esta venda"
                                className="px-3 py-1.5 bg-white text-red-500 hover:bg-red-50 rounded-lg border border-red-100 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Excluir
                              </button>
                              <button
                                onClick={() => setSaleToPay({ id: sale.id, amount: sale.totalAmount })}
                                id={`btn-pay-sale-${sale.id}`}
                                title="Dar baixa nesta venda"
                                className="px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg text-[10px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" /> Baixar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Preview de Mensagem */}
                <div className="bg-gold-50/20 p-3 rounded-xl border border-gold-200/20 space-y-1">
                  <span className="text-[10px] font-bold text-gold-700 uppercase block tracking-wider">Preview de Cobrança:</span>
                  <p className="text-xs text-gray-600 italic line-clamp-3">
                    "{messageText}"
                  </p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 border-t border-gray-50 pt-3 mt-4">
                <button
                  onClick={() => handleCopyToClipboard(messageText, item.groupKey)}
                  id={`btn-copy-msg-${item.groupKey}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all border border-gray-200"
                >
                  {copiedId === item.groupKey ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar Mensagem
                    </>
                  )}
                </button>

                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={`link-whatsapp-debt-${item.groupKey}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" /> Enviar p/ WhatsApp
                  </a>
                ) : (
                  <button
                    disabled
                    id={`btn-whatsapp-disabled-${item.groupKey}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 text-gray-400 font-bold text-xs rounded-xl transition-all border border-gray-200 cursor-not-allowed"
                    title="Cadastre o WhatsApp do cliente para enviar diretamente"
                  >
                    Sem WhatsApp
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {customerDebtsList.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
            Parabéns! Não existem pendências ou contas em aberto no momento. 🎉
          </div>
        )}
      </div>

      {/* Modal de Edição de Venda/Fiado */}
      <AnimatePresence>
        {saleToEdit && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gold-100"
            >
              <div className="bg-gold-500 text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  <h3 className="font-serif text-base font-bold">Editar Pendência</h3>
                </div>
                <button onClick={() => setSaleToEdit(null)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Seleção do Cliente */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cliente Associado</label>
                  <select
                    value={editCustomerId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditCustomerId(val);
                      if (val === 'venda_avulsa') {
                        setEditCustomerName('Cliente Avulso');
                      } else {
                        const c = customers.find(cust => cust.id === val);
                        if (c) setEditCustomerName(c.name);
                      }
                    }}
                    className="w-full p-2 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold"
                  >
                    <option value="venda_avulsa">Cliente Avulso (Sem cadastro)</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status do Pagamento</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full p-2 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Forma de Pagamento</label>
                    <select
                      value={editMethod}
                      onChange={(e) => setEditMethod(e.target.value as any)}
                      className="w-full p-2 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold"
                    >
                      <option value="Fiado">Fiado</option>
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão">Cartão</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data de Vencimento</label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full p-2 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor Total (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(Number(e.target.value))}
                      className="w-full p-2 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-gold-50 rounded-xl border border-gold-100">
                  <p className="text-[10px] font-bold text-gold-700 uppercase mb-1">Itens da Venda:</p>
                  <p className="text-[11px] text-gold-800 italic">
                    {saleToEdit.items.map(it => `${it.quantity}x ${it.productName}`).join(', ')}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-4 flex gap-2">
                <button
                  onClick={() => setSaleToEdit(null)}
                  className="flex-1 py-3 bg-white text-gray-500 text-xs font-bold rounded-xl border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-gold-500/20 transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Pagamento com Escolha de Método */}
      <AnimatePresence>
        {saleToPay && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border border-emerald-100"
            >
              {/* Header */}
              <div className="bg-emerald-500 text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="font-serif text-base font-bold">Confirmar Recebimento</h3>
                </div>
                <button
                  onClick={() => setSaleToPay(null)}
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 text-center">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Valor a ser recebido:</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {saleToPay.amount.toFixed(2)}</p>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Como o cliente pagou?</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Pix', 'Dinheiro', 'Cartão'] as PaymentMethod[]).map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethodForPaid(method)}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1.5 ${
                          paymentMethodForPaid === method
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 opacity-70" />
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-5 py-4 flex gap-2">
                <button
                  onClick={() => setSaleToPay(null)}
                  className="flex-1 py-3 bg-white text-gray-500 text-xs font-bold rounded-xl border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmPayment}
                  className="flex-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  Baixar Pendência
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão de Pendência */}
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
                  <h3 className="font-serif text-base font-bold">Excluir Pendência</h3>
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
                    Você está prestes a excluir esta pendência de pagamento. O registro da venda será removido permanentemente.
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
