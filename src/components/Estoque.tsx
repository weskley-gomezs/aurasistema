import React, { useState, FormEvent, useRef, useEffect, ChangeEvent } from 'react';
import { Product, Category, Gender } from '../types';
import { Search, Plus, AlertCircle, XCircle, Edit, Trash2, ArrowUpRight, Folder, Package, DollarSign, Image as ImageIcon, X, Camera, Upload, BookOpen, Copy, Check, Share2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateCatalogPDF } from '../utils/pdfGenerator';

interface EstoqueProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

const CATEGORY_LABELS: Record<Category, string> = {
  perfume: 'Perfume',
  creme: 'Creme/Hidratante',
  kit: 'Kit / Presente',
  outros: 'Outros cosméticos'
};

const GENDER_LABELS: Record<Gender, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino'
};

export default function Estoque({ products, onAddProduct, onEditProduct, onDeleteProduct }: EstoqueProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'todos'>('todos');
  const [selectedGender, setSelectedGender] = useState<Gender | 'todos'>('todos');
  const [selectedBrand, setSelectedBrand] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'baixo' | 'disponivel' | 'esgotado'>('todos');
  
  // Catalog Modal state
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [copiedCatalog, setCopiedCatalog] = useState(false);
  const [ownerWhatsApp, setOwnerWhatsApp] = useState(() => localStorage.getItem('aura_owner_whatsapp') || '');
  const [copiedRealtimeLink, setCopiedRealtimeLink] = useState(false);

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOwnerWhatsApp(val);
    localStorage.setItem('aura_owner_whatsapp', val);
  };

  const handleCopyRealtimeLink = () => {
    const cleaned = ownerWhatsApp.replace(/\D/g, '');
    // Se o número já começar com 55 e tiver 12 ou mais dígitos, evita duplicar o DDI
    const hasCountryCode = cleaned.startsWith('55') && cleaned.length >= 12;
    const phoneParam = cleaned ? (hasCountryCode ? cleaned : `55${cleaned}`) : '';
    
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}?view=catalogo${phoneParam ? `&phone=${phoneParam}` : ''}`;
    
    navigator.clipboard.writeText(shareUrl);
    setCopiedRealtimeLink(true);
    setTimeout(() => setCopiedRealtimeLink(false), 2000);
  };

  const handleCopyTextCatalog = () => {
    // Group products by category
    const grouped: Record<Category, Product[]> = {
      perfume: [],
      creme: [],
      kit: [],
      outros: []
    };
    
    products.forEach(p => {
      if (grouped[p.category]) {
        grouped[p.category].push(p);
      } else {
        grouped.outros.push(p);
      }
    });

    let text = `✨ *CATÁLOGO DE PRODUTOS - AURA DOURADA* ✨\n`;
    text += `🛍️ _Confira nossas fragrâncias e cosméticos exclusivos para você!_\n\n`;

    const categoryHeaders: Record<Category, { title: string, emoji: string }> = {
      perfume: { title: 'PERFUMES', emoji: '🌸' },
      creme: { title: 'CREMES & HIDRATANTES', emoji: '🧴' },
      kit: { title: 'KITS & PRESENTES', emoji: '🎁' },
      outros: { title: 'OUTROS COSMÉTICOS', emoji: '✨' }
    };

    let hasProducts = false;

    (Object.keys(grouped) as Category[]).forEach(cat => {
      const items = grouped[cat];
      if (items.length > 0) {
        hasProducts = true;
        const header = categoryHeaders[cat];
        text += `${header.emoji} *${header.title}*\n`;
        items.forEach(p => {
          const statusText = p.quantity > 0 ? '✓ Pronta Entrega' : '⏳ Sob Encomenda';
          text += `• *${p.brand.toUpperCase()}* - ${p.name}: _R$ ${p.sellPrice.toFixed(2)}_ (${statusText})\n`;
        });
        text += `\n`;
      }
    });

    if (!hasProducts) {
      text += `Nenhum produto cadastrado no momento. Entre em contato para novidades!`;
    } else {
      text += `💖 *Ficou interessado em algum?* É só responder a esta mensagem indicando o produto escolhido! Ficaremos muito felizes em te atender. 🥰✨`;
    }

    navigator.clipboard.writeText(text);
    setCopiedCatalog(true);
    setTimeout(() => setCopiedCatalog(false), 2000);
  };

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Input states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('perfume');
  const [gender, setGender] = useState<Gender>('feminino');
  const [brand, setBrand] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Camera and File Upload States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera when modal is closed
  useEffect(() => {
    if (!isFormOpen) {
      stopCamera();
      setShowUrlInput(false);
    }
  }, [isFormOpen]);

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: 'environment', // back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Erro ao acessar a câmera:", err);
      setCameraError("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Compress and convert to base64 jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoUrl(dataUrl);
      }
      stopCamera();
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("A imagem selecionada é muito grande (limite de 1.5MB para otimização do armazenamento).");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Open form for adding
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setCategory('perfume');
    setGender('feminino');
    setBrand('');
    setCostPrice('');
    setSellPrice('');
    setQuantity('');
    setMinQuantity('2'); // Default minimum
    setPhotoUrl('');
    setIsFormOpen(true);
  };

  // Open form for editing
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setGender(p.gender || 'feminino');
    setBrand(p.brand);
    setCostPrice(p.costPrice.toString());
    setSellPrice(p.sellPrice.toString());
    setQuantity(p.quantity.toString());
    setMinQuantity(p.minQuantity.toString());
    setPhotoUrl(p.photoUrl || '');
    setIsFormOpen(true);
  };

  // Submit form
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !brand || !costPrice || !sellPrice || !quantity || !minQuantity) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const productData = {
      name,
      category,
      gender,
      brand,
      costPrice: parseFloat(costPrice),
      sellPrice: parseFloat(sellPrice),
      quantity: parseInt(quantity),
      minQuantity: parseInt(minQuantity),
      photoUrl: photoUrl.trim() || undefined
    };

    if (editingProduct) {
      onEditProduct({
        ...productData,
        id: editingProduct.id
      });
    } else {
      onAddProduct(productData);
    }

    setIsFormOpen(false);
  };

  // Delete confirmation state
  const [productToDelete, setProductToDelete] = useState<{ id: string, name: string } | null>(null);

  // Delete product wrapper
  const handleDelete = (id: string, name: string) => {
    setProductToDelete({ id, name });
  };

  const confirmDelete = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || p.category === selectedCategory;
    const matchesGender = selectedGender === 'todos' || (p.gender || 'feminino') === selectedGender;
    const matchesBrand = selectedBrand === 'todas' || p.brand.toLowerCase() === selectedBrand.toLowerCase();
    
    let matchesStatus = true;
    if (statusFilter === 'baixo') matchesStatus = p.quantity <= p.minQuantity;
    else if (statusFilter === 'disponivel') matchesStatus = p.quantity > 0;
    else if (statusFilter === 'esgotado') matchesStatus = p.quantity === 0;

    return matchesSearch && matchesCategory && matchesGender && matchesBrand && matchesStatus;
  });

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('todos');
    setSelectedGender('todos');
    setSelectedBrand('todas');
    setStatusFilter('todos');
  };

  return (
    <div id="estoque-section" className="space-y-6">
      {/* Header com botões de ação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Estoque de Produtos</h2>
          <p className="text-xs text-gray-500">Cadastre e gerencie a quantidade e os preços de seus produtos.</p>
        </div>
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setIsCatalogOpen(true)}
            id="btn-open-catalog"
            className="flex items-center gap-2 bg-white hover:bg-gold-50 text-gold-600 border border-gold-200 font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs text-xs md:text-sm cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" /> Catálogo
          </button>
          <button
            onClick={handleOpenAdd}
            id="btn-add-product"
            className="hidden md:flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-gold-500/10 text-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        {/* Input de Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome do produto ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="input-search-product"
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all text-gray-900"
          />
        </div>

        {/* Abas de Categorias */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('todos')}
            id="tab-category-all"
            className={`px-3.5 py-1.5 text-[10px] md:text-xs font-semibold rounded-lg transition-all border whitespace-nowrap ${
              selectedCategory === 'todos'
                ? 'bg-gold-500 text-white border-gold-500 shadow-xs'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todos ({products.length})
          </button>
          {(['perfume', 'creme', 'kit', 'outros'] as Category[]).map(cat => {
            const count = products.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                id={`tab-category-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-[10px] md:text-xs font-semibold rounded-lg transition-all border whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-gold-500 text-white border-gold-500 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>

        {/* Filtro de Gênero e Marca */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-gray-50 pt-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Público:</span>
            <button
              onClick={() => setSelectedGender('todos')}
              className={`px-3 py-1.5 text-[10px] md:text-xs rounded-lg font-bold border transition-all whitespace-nowrap ${
                selectedGender === 'todos' ? 'bg-gold-500 text-white border-gold-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedGender('feminino')}
              className={`px-3 py-1.5 text-[10px] md:text-xs rounded-lg font-bold border transition-all whitespace-nowrap ${
                selectedGender === 'feminino' ? 'bg-gold-500 text-white border-gold-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Feminino
            </button>
            <button
              onClick={() => setSelectedGender('masculino')}
              className={`px-3 py-1.5 text-[10px] md:text-xs rounded-lg font-bold border transition-all whitespace-nowrap ${
                selectedGender === 'masculino' ? 'bg-gold-500 text-white border-gold-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Masculino
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Marca:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="todas">Todas as Marcas</option>
              {Array.from(new Set(products.map(p => p.brand))).filter(Boolean).sort().map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros rápidos adicionais */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 border-t border-gray-50 pt-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <span className="text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider shrink-0">Filtrar:</span>
            
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 text-[10px] md:text-xs rounded-lg font-bold border transition-all whitespace-nowrap ${
                statusFilter === 'todos'
                  ? 'bg-gray-100 text-gray-900 border-gray-200'
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>

            <button
              onClick={() => setStatusFilter('disponivel')}
              className={`px-3 py-1.5 text-[10px] md:text-xs rounded-lg font-bold border flex items-center gap-1.5 transition-all whitespace-nowrap ${
                statusFilter === 'disponivel'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
              }`}
            >
              <Check className="w-3 h-3" /> Em Estoque ({products.filter(p => p.quantity > 0).length})
            </button>

            <button
              onClick={() => setStatusFilter('baixo')}
              className={`px-3 py-1.5 text-[10px] md:text-xs rounded-lg font-bold border flex items-center gap-1.5 transition-all whitespace-nowrap ${
                statusFilter === 'baixo'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className="w-3 h-3" /> Baixo ({products.filter(p => p.quantity <= p.minQuantity && p.quantity > 0).length})
            </button>

            <button
              onClick={() => setStatusFilter('esgotado')}
              className={`px-3 py-1.5 text-[10px] md:text-xs rounded-lg font-bold border flex items-center gap-1.5 transition-all whitespace-nowrap ${
                statusFilter === 'esgotado'
                  ? 'bg-red-50 text-red-700 border-red-200 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
              }`}
            >
              <X className="w-3 h-3" /> Esgotados ({products.filter(p => p.quantity === 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {filteredProducts.map(product => {
          const isSoldOut = product.quantity === 0;
          const isLowStock = !isSoldOut && product.quantity <= product.minQuantity;
          const profit = product.sellPrice - product.costPrice;
          const marginPercent = ((profit / product.sellPrice) * 100).toFixed(0);

          return (
            <motion.div
              layout
              key={product.id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                isSoldOut ? 'border-red-500 ring-2 ring-red-100' : isLowStock ? 'border-amber-200 ring-2 ring-amber-100/50' : 'border-gray-100 hover:border-gold-200'
              }`}
            >
              <div>
                {/* Imagem do Produto */}
                <div className="aspect-[16/10] sm:aspect-video lg:aspect-square bg-gray-50 relative overflow-hidden flex items-center justify-center border-b border-gray-50">
                  {product.photoUrl ? (
                    <img
                      src={product.photoUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-300 gap-1">
                      <ImageIcon className="w-10 h-10 stroke-1" />
                      <span className="text-xs">Sem foto cadastrada</span>
                    </div>
                  )}

                  {/* Badge de categoria */}
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-gold-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-xs border border-gold-100">
                    {CATEGORY_LABELS[product.category]}
                  </span>

                  {/* Alerta de estoque baixo ou esgotado */}
                  {isSoldOut ? (
                    <span className="absolute top-3 right-3 bg-red-600 text-white px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1 animate-pulse">
                      <XCircle className="w-3.5 h-3.5" /> Esgotado
                    </span>
                  ) : isLowStock && (
                    <span className="absolute top-3 right-3 bg-amber-500 text-white px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Baixo Estoque
                    </span>
                  )}
                </div>

                {/* Info do produto */}
                <div className="p-4 space-y-2">
                  <div>
                    <p className="text-[11px] font-bold text-rose-gold-500 uppercase tracking-widest">{product.brand}</p>
                    <h3 className="font-serif text-base font-bold text-gray-900 mt-0.5 line-clamp-1">{product.name}</h3>
                  </div>

                  {/* Preços e Margem */}
                  <div className="grid grid-cols-2 gap-2 bg-gold-50/40 p-2.5 rounded-xl border border-gold-100/30">
                    <div>
                      <span className="text-[10px] font-medium text-gray-500 block uppercase">Preço Venda</span>
                      <span className="text-sm font-extrabold text-gray-900">R$ {product.sellPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-gray-500 block uppercase">Preço Custo</span>
                      <span className="text-xs font-semibold text-gray-400">R$ {product.costPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Lucro e Quantidade */}
                  <div className="flex justify-between items-center text-xs pt-1">
                    <div className="text-gray-500 flex items-center gap-1">
                      <Package className="w-4 h-4 text-gold-500" />
                      <span>Em estoque: <b className={isSoldOut ? 'text-red-600' : ''}>{product.quantity} un</b></span>
                    </div>
                    <div className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-bold flex items-center gap-0.5">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>+{marginPercent}% margem</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="border-t border-gray-50 p-3 bg-gray-50/50 flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-400">Mínimo: {product.minQuantity} un</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(product)}
                    id={`btn-edit-product-${product.id}`}
                    title="Editar produto"
                    className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-gold-600 hover:border-gold-300 rounded-lg transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    id={`btn-delete-product-${product.id}`}
                    title="Excluir produto"
                    className="p-2 bg-white border border-red-100 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum produto encontrado.</p>
            <p className="text-gray-400 text-xs mt-1 mb-6">Experimente ajustar o termo de busca ou limpar os filtros.</p>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2 bg-gold-500 text-white rounded-xl font-bold text-sm shadow-md shadow-gold-500/20 hover:bg-gold-600 transition-all cursor-pointer"
            >
              Limpar Todos os Filtros
            </button>
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

      {/* Modal Form de Produto (Add/Edit) */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-gold-500 to-rose-gold-500 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold">
                  {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  id="btn-close-product-modal"
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Nome */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Perfume Chanel No 5"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    id="product-input-name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Categoria */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Categoria *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      id="product-input-category"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
                    >
                      <option value="perfume">Perfume</option>
                      <option value="creme">Creme / Hidratante</option>
                      <option value="kit">Kit / Presente</option>
                      <option value="outros">Outros cosméticos</option>
                    </select>
                  </div>

                  {/* Gênero */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Gênero / Público *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender)}
                      id="product-input-gender"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
                    >
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                    </select>
                  </div>
                </div>

                {/* Marca */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">Marca *</label>
                  <input
                    type="text"
                    required
                    list="modal-brands-list"
                    placeholder="Ex: Natura, Avon, Chanel, Eudora"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    id="product-input-brand"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
                  />
                  <datalist id="modal-brands-list">
                    {Array.from(new Set(products.map(p => p.brand))).filter(Boolean).map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Preço Custo */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Preço de Custo (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 120.00"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      id="product-input-cost"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
                    />
                  </div>

                  {/* Preço Venda */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Preço de Venda (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 249.90"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      id="product-input-sell"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Qtd Estoque */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Qtd em Estoque *</label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 10"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      id="product-input-qty"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
                    />
                  </div>

                  {/* Qtd Mínima Alerta */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Qtd Mínima (Alerta) *</label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 2"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      id="product-input-min"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900"
                    />
                  </div>
                </div>

                {/* Imagem do Produto: Câmera, Upload ou URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase block">Imagem do Produto (opcional)</label>
                  
                  {/* Container de visualização */}
                  <div className="border border-dashed border-gray-200 rounded-xl p-3 bg-gray-50/50 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                    {isCameraActive ? (
                      <div className="w-full flex flex-col items-center relative animate-fade-in">
                        <video 
                          ref={videoRef} 
                          playsInline 
                          muted 
                          className="w-full max-h-[220px] object-cover rounded-lg bg-black"
                        />
                        <div className="flex gap-2 mt-2 w-full">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            id="btn-capture-photo"
                            className="flex-1 py-1.5 bg-gold-500 hover:bg-gold-600 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                          >
                            Tirar Foto
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            id="btn-stop-camera"
                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : photoUrl ? (
                      <div className="w-full text-center space-y-2">
                        <div className="relative inline-block group max-w-[200px] mx-auto rounded-lg overflow-hidden border border-gray-100">
                          <img 
                            src={photoUrl} 
                            alt="Preview do produto" 
                            className="max-h-[160px] object-contain mx-auto"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setPhotoUrl('')}
                            id="btn-remove-photo"
                            title="Remover foto"
                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-xs transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono break-all line-clamp-1">
                          {photoUrl.startsWith('data:') ? 'Imagem Base64 Capturada/Enviada' : photoUrl}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-4 space-y-1">
                        <ImageIcon className="w-10 h-10 text-gray-300 mx-auto stroke-1" />
                        <p className="text-xs text-gray-500 font-medium">Sem foto selecionada</p>
                        <p className="text-[10px] text-gray-400">Tire uma foto agora ou suba uma imagem</p>
                      </div>
                    )}
                    
                    {cameraError && (
                      <div className="text-[10px] text-red-500 mt-2 text-center bg-red-50 p-1.5 rounded-lg border border-red-100">
                        {cameraError}
                      </div>
                    )}
                  </div>

                  {/* Botões de Ações de Imagem */}
                  {!isCameraActive && (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={startCamera}
                          id="btn-launch-camera"
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 hover:border-gold-300 hover:bg-gold-50/20 text-gray-700 hover:text-gold-700 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-gold-500" />
                          Tirar Foto na Hora
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          id="btn-trigger-upload"
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 hover:border-gold-300 hover:bg-gold-50/20 text-gray-700 hover:text-gold-700 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-gold-500" />
                          Subir Foto Existente
                        </button>
                      </div>

                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="hidden-file-input"
                      />

                      {/* Botão para colar link */}
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          id="btn-toggle-url-input"
                          className="text-[10px] text-gray-500 hover:text-gold-600 underline font-medium"
                        >
                          {showUrlInput ? 'Ocultar campo de Link' : 'Deseja inserir um Link/URL de imagem?'}
                        </button>
                      </div>

                      {showUrlInput && (
                        <input
                          type="url"
                          placeholder="https://exemplo.com/foto.jpg"
                          value={photoUrl.startsWith('data:') ? '' : photoUrl}
                          onChange={(e) => setPhotoUrl(e.target.value)}
                          id="product-input-photo-url"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white text-gray-900 mt-1"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Submit and Cancel Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    id="btn-cancel-product-modal"
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-product-modal"
                    className="w-full py-3 bg-gradient-to-r from-gold-500 to-rose-gold-500 hover:from-gold-600 hover:to-rose-gold-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md"
                  >
                    Salvar Produto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {productToDelete && (
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
                  <h3 className="font-serif text-base font-bold">Excluir Produto</h3>
                </div>
                <button
                  onClick={() => setProductToDelete(null)}
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
                    Você está prestes a excluir <span className="font-bold text-gray-700">"{productToDelete.name}"</span>. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-4 flex gap-2">
                <button
                  onClick={() => setProductToDelete(null)}
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

      {/* Modal de Catálogo para Clientes */}
      <AnimatePresence>
        {isCatalogOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header do Modal */}
              <div className="bg-gradient-to-r from-gold-500 to-rose-gold-500 text-white px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <h3 className="font-serif text-lg font-bold">Catálogo de Vendas (Modo Cliente)</h3>
                </div>
                <button
                  onClick={() => setIsCatalogOpen(false)}
                  id="btn-close-catalog-modal"
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Informação / Alerta de Privacidade */}
              <div className="bg-gold-50 border-b border-gold-100 p-4 shrink-0">
                <p className="text-xs text-gold-800 leading-relaxed font-medium">
                  🔒 <b>Visualização Segura:</b> Os preços de custo foram <b>totalmente removidos</b> deste catálogo. Você pode compartilhar este catálogo de forma 100% segura com suas clientes!
                </p>
              </div>

              {/* Compartilhamento Online em Tempo Real */}
              <div className="bg-gradient-to-r from-gold-50/50 to-rose-gold-50/30 p-5 border-b border-gray-100 flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-gold-700">
                  <Sparkles className="w-4 h-4 text-gold-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">Compartilhar Catálogo Online (Fotos + Preços)</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Seus clientes podem abrir o catálogo no celular de forma interativa com todas as fotos e preços atualizados em tempo real! Ao clicar em "Pedir", eles enviam uma mensagem automática para o seu WhatsApp.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Seu WhatsApp de Atendimento:</label>
                    <input
                      type="password"
                      value={ownerWhatsApp}
                      onChange={handlePhoneChange}
                      placeholder="Ex: 11987654321 (apenas números)"
                      className="w-full text-xs font-semibold px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-hidden focus:border-gold-500 transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyRealtimeLink}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                      copiedRealtimeLink
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gold-500 hover:bg-gold-600 text-white border-gold-500 shadow-md shadow-gold-500/10'
                    }`}
                  >
                    {copiedRealtimeLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 animate-bounce" /> Link Copiado!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" /> Copiar Link do Catálogo Real-Time
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Listagem de Produtos */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Nenhum produto cadastrado para catálogo.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(['perfume', 'creme', 'kit', 'outros'] as Category[]).map(cat => {
                      const catProducts = products.filter(p => p.category === cat);
                      if (catProducts.length === 0) return null;

                      return (
                        <div key={cat} className="space-y-3">
                          <h4 className="font-serif text-sm font-bold text-gray-800 border-b border-gray-100 pb-1 flex items-center gap-1.5 uppercase tracking-wider">
                            <span className="text-gold-500">★</span> {CATEGORY_LABELS[cat]}s
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {catProducts.map(p => (
                              <div key={p.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                                {p.photoUrl ? (
                                  <img
                                    src={p.photoUrl}
                                    alt={p.name}
                                    className="w-12 h-12 object-cover rounded-lg bg-white border border-gray-100 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-white rounded-lg border border-gray-100 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-6 h-6 text-gray-300" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-bold text-rose-gold-500 uppercase tracking-wider">{p.brand}</p>
                                  <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                                  <p className="text-sm font-extrabold text-gold-600 mt-0.5">R$ {p.sellPrice.toFixed(2)}</p>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  p.quantity > 0 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {p.quantity > 0 ? 'Em Estoque' : 'Encomenda'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botões de Compartilhamento */}
              <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => setIsCatalogOpen(false)}
                  className="px-4 py-3 bg-white hover:bg-gray-100 text-gray-500 text-xs font-bold rounded-xl border border-gray-200 transition-all cursor-pointer"
                >
                  Fechar Catálogo
                </button>
                <div className="flex-1 flex gap-2">
                  <button
                    onClick={handleCopyTextCatalog}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                      copiedCatalog
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white hover:bg-gold-50 text-gold-600 border-gold-200'
                    }`}
                  >
                    {copiedCatalog ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" /> Catálogo Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copiar p/ WhatsApp (Texto)
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => generateCatalogPDF(products)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-gold-500/20 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" /> Baixar Catálogo PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
