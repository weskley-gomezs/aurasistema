import React, { useState } from 'react';
import { Encomenda } from '../types';
import { ShoppingBag, Search, MessageCircle, Calendar, Trash2, CheckCircle, Clock, Truck, X, Edit, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EncomendasProps {
  encomendas: Encomenda[];
  onUpdateEncomenda: (encomenda: Encomenda) => void;
  onDeleteEncomenda: (id: string) => void;
}

export default function Encomendas({ encomendas, onUpdateEncomenda, onDeleteEncomenda }: EncomendasProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'chegou' | 'concluido'>('todos');
  
  // Edit modal or inline expected date
  const [editingEncomenda, setEditingEncomenda] = useState<Encomenda | null>(null);
  const [expectedDateInput, setExpectedDateInput] = useState('');
  const [statusInput, setStatusInput] = useState<'pendente' | 'chegou' | 'concluido'>('pendente');
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [paymentMethodInput, setPaymentMethodInput] = useState<string>('Pix');

  const filteredEncomendas = (encomendas || []).filter(e => {
    const matchesSearch = 
      (e.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.customerPhone || '').includes(searchTerm) ||
      (e.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || e.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getWhatsAppMessageUrl = (enc: Encomenda) => {
    const phone = (enc.customerPhone || '').replace(/\D/g, '');
    const formattedDate = enc.expectedDate 
      ? new Date(enc.expectedDate + 'T12:00:00').toLocaleDateString('pt-BR') 
      : 'em breve';
    
    const qty = enc.quantity || 1;
    const payMethod = enc.paymentMethodOnArrival || 'Pix';
    const message = `Olá, ${enc.customerName}! ✨ Passando para avisar que sua encomenda de *${qty}x ${enc.productName}* na Aura Dourada (Forma de pagamento escolhida ao chegar: *${payMethod}*) tem previsão de chegada para *${formattedDate}*. Qualquer dúvida estou à disposição! 🛍️`;
    
    return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleOpenEdit = (enc: Encomenda) => {
    setEditingEncomenda(enc);
    setExpectedDateInput(enc.expectedDate || '');
    setStatusInput(enc.status || 'pendente');
    setQuantityInput(enc.quantity || 1);
    setPaymentMethodInput(enc.paymentMethodOnArrival || 'Pix');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEncomenda) return;

    onUpdateEncomenda({
      ...editingEncomenda,
      expectedDate: expectedDateInput || undefined,
      status: statusInput,
      quantity: Number(quantityInput) || 1,
      paymentMethodOnArrival: paymentMethodInput
    });
    setEditingEncomenda(null);
  };

  const [encomendaToDelete, setEncomendaToDelete] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Gerenciamento de Encomendas</h2>
          <p className="text-xs text-gray-500">Pedidos feitos diretamente pelos clientes através do catálogo online.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-gold-100 text-gold-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            {encomendas.filter(e => e.status === 'pendente').length} Pendentes
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome do cliente, telefone ou produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-gray-900"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              statusFilter === 'todos' ? 'bg-gold-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas ({encomendas.length})
          </button>
          <button
            onClick={() => setStatusFilter('pendente')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              statusFilter === 'pendente' ? 'bg-amber-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pendentes ({encomendas.filter(e => e.status === 'pendente').length})
          </button>
          <button
            onClick={() => setStatusFilter('chegou')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              statusFilter === 'chegou' ? 'bg-blue-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Chegaram ({encomendas.filter(e => e.status === 'chegou').length})
          </button>
          <button
            onClick={() => setStatusFilter('concluido')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              statusFilter === 'concluido' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Concluídas ({encomendas.filter(e => e.status === 'concluido').length})
          </button>
        </div>
      </div>

      {/* Orders List / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEncomendas.map(enc => {
          const isPending = enc.status === 'pendente';
          const isArrived = enc.status === 'chegou';
          const isCompleted = enc.status === 'concluido';

          return (
            <motion.div
              key={enc.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-xs transition-all ${
                isPending ? 'border-amber-200/60 bg-amber-50/10' : isArrived ? 'border-blue-200/60 bg-blue-50/10' : 'border-gray-100'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center font-serif font-bold text-base">
                      {enc.customerName ? enc.customerName.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-gray-900">{enc.customerName}</h3>
                      <p className="text-[10px] font-mono text-gray-400">Tel: {enc.customerPhone}</p>
                    </div>
                  </div>

                  <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                    isPending ? 'bg-amber-100 text-amber-800' : isArrived ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isPending ? 'Pendente' : isArrived ? 'Chegou!' : 'Concluído'}
                  </span>
                </div>

                {/* Product Info */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Produto Encomendado</span>
                    <span className="text-[10px] font-extrabold bg-gold-100 text-gold-800 px-2 py-0.5 rounded-md">
                      Qtd: {enc.quantity || 1}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-800">{enc.productName}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/50">
                    {enc.productPrice && (
                      <p className="text-xs font-black text-emerald-600">R$ {enc.productPrice.toFixed(2)} (Unit.)</p>
                    )}
                    <p className="text-[11px] font-semibold text-gray-600">
                      Pgto ao chegar: <strong className="text-gold-700">{enc.paymentMethodOnArrival || 'Pix'}</strong>
                    </p>
                  </div>
                </div>

                {/* Expected arrival date */}
                <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gold-500" />
                    Previsão: <strong className="text-gray-900">{enc.expectedDate ? new Date(enc.expectedDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não definida'}</strong>
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Pedido em: {new Date(enc.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-4">
                <button
                  onClick={() => handleOpenEdit(enc)}
                  className="text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1 bg-gold-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> Editar / Previsão
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEncomendaToDelete(enc.id)}
                    title="Excluir Encomenda"
                    className="p-2 bg-white border border-red-100 text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={getWhatsAppMessageUrl(enc)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" /> WhatsApp
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredEncomendas.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 space-y-2">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-700">Nenhuma encomenda encontrada</p>
            <p className="text-xs text-gray-400">As encomendas feitas pelos clientes no catálogo online aparecerão aqui.</p>
          </div>
        )}
      </div>

      {/* Edit Encomenda Modal */}
      <AnimatePresence>
        {editingEncomenda && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-gold-500 to-rose-gold-500 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold">Atualizar Encomenda</h3>
                <button
                  onClick={() => setEditingEncomenda(null)}
                  className="p-1 text-white/80 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">Cliente</label>
                  <input
                    type="text"
                    disabled
                    value={editingEncomenda.customerName}
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">Produto</label>
                  <input
                    type="text"
                    disabled
                    value={editingEncomenda.productName}
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-gray-900 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Pgto ao Chegar</label>
                    <select
                      value={paymentMethodInput}
                      onChange={(e) => setPaymentMethodInput(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-gray-900 font-semibold"
                    >
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Fiado">Fiado</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">Previsão de Chegada</label>
                  <input
                    type="date"
                    value={expectedDateInput}
                    onChange={(e) => setExpectedDateInput(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-gray-900 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">Status da Encomenda</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-gray-900 font-semibold"
                  >
                    <option value="pendente">Pendente (Aguardando)</option>
                    <option value="chegou">Chegou (Disponível)</option>
                    <option value="concluido">Concluído (Entregue)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingEncomenda(null)}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {encomendaToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border border-red-100"
            >
              <div className="bg-red-500 text-white px-5 py-4 flex items-center justify-between">
                <h3 className="font-serif text-base font-bold">Excluir Encomenda</h3>
                <button onClick={() => setEncomendaToDelete(null)} className="p-1 text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 text-center space-y-3">
                <p className="text-gray-900 font-bold">Tem certeza que deseja excluir esta encomenda?</p>
                <p className="text-xs text-gray-500">Esta ação não poderá ser desfeita.</p>
              </div>

              <div className="bg-gray-50 px-5 py-4 flex gap-2">
                <button
                  onClick={() => setEncomendaToDelete(null)}
                  className="flex-1 py-2.5 bg-white text-gray-500 text-xs font-bold rounded-xl border border-gray-200 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onDeleteEncomenda(encomendaToDelete);
                    setEncomendaToDelete(null);
                  }}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-md"
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
