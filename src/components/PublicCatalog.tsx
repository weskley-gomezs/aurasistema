import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { Search, MessageCircle, Sparkles, Image as ImageIcon, Heart, Eye, ArrowLeft, Loader2, ShoppingCart, RefreshCw, X, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PublicCatalogProps {
  products: Product[];
  isLoading: boolean;
}

interface HeroSlide {
  desktop: string;
  mobile: string;
  alt: string;
  linkMessage?: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    desktop: 'https://i.imgur.com/WzfV5HP.png',
    mobile: 'https://i.imgur.com/lfJwldz.png',
    alt: 'Banner Aura Dourada Slide 1'
  },
  {
    desktop: 'https://i.imgur.com/H0OIeiE.png',
    mobile: 'https://i.imgur.com/q0Ak3CE.png',
    alt: 'Kit Natura Homem Identidade Slide 2',
    linkMessage: 'Olá! ✨ Tenho interesse no *Kit Natura Homem Identidade* (R$ 299,00) que vi no seu catálogo online da Aura Dourada! Gostaria de verificar informações e como faço para encomendar! 🎁🛍️'
  }
];

const CATEGORY_LABELS: Record<Category, string> = {
  perfume: 'Perfumes',
  creme: 'Cremes & Hidratantes',
  kit: 'Kits & Presentes',
  outros: 'Outros Cosméticos'
};

const CATEGORY_EMOJIS: Record<Category, string> = {
  perfume: '🌸',
  creme: '🧴',
  kit: '🎁',
  outros: '✨'
};

export default function PublicCatalog({ products, isLoading }: PublicCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'todos'>('todos');
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);

  // Hero banner slideshow state (8s auto-transition)
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 8000);
    return () => clearInterval(slideTimer);
  }, []);

  // Get seller's phone number from URL query parameter 'phone' or hash parameter
  const [phoneParam, setPhoneParam] = useState<string>('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    const phone = searchParams.get('phone') || hashParams.get('phone') || '';
    // Clean phone number (keep only digits)
    const cleaned = phone.replace(/\D/g, '');
    setPhoneParam(cleaned);
  }, []);

  // Filter products based on search & category
  const filteredProducts = (products || []).filter(p => {
    if (!p) return false;
    const name = p.name || '';
    const brand = p.brand || '';
    const category = p.category || 'outros';

    const matchesSearch = 
      name.toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      brand.toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getSlideWhatsAppLink = (slide: HeroSlide) => {
    if (!slide.linkMessage) return null;
    const phone = phoneParam || '5561992096078';
    return `https://wa.me/${phone}?text=${encodeURIComponent(slide.linkMessage)}`;
  };

  const getWhatsAppLink = (product: Product) => {
    if (!product) return '#';
    const brand = (product.brand || 'Aura').toUpperCase();
    const name = product.name || 'Produto';
    const price = typeof product.sellPrice === 'number' ? product.sellPrice.toFixed(2) : '0.00';
    
    const textMessage = `Olá! ✨ Vi o produto *${brand} - ${name}* no valor de *R$ ${price}* no seu catálogo online e gostaria de saber mais / encomendar! 🥰🛒`;
    
    // If a phone is specified in the URL, redirect to that specific chat
    if (phoneParam) {
      return `https://wa.me/${phoneParam}?text=${encodeURIComponent(textMessage)}`;
    }
    // Fallback: Open general WhatsApp share sheet
    return `https://wa.me/?text=${encodeURIComponent(textMessage)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-20 font-sans selection:bg-gold-200">
      {/* Top Luxury Banner */}
      <header className="bg-gradient-to-b from-gray-950 to-gray-900 text-white border-b border-gold-500/30 overflow-hidden relative">
        {/* Subtle Decorative Elements */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 via-rose-gold-400 to-gold-600"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.1),transparent_40%)] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-8 text-center flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <img 
              src="https://i.imgur.com/XAhbi19.png" 
              alt="Aura Dourada Logo" 
              className="w-24 h-24 object-contain filter drop-shadow-[0_4px_12px_rgba(197,160,89,0.3)] bg-white/5 p-2 rounded-full border border-gold-500/20" 
            />
          </motion.div>

          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="font-serif text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-100 to-rose-gold-300 italic"
          >
            AURA DOURADA
          </motion.h1>

          <p className="text-gold-200/90 text-xs font-semibold tracking-widest uppercase mt-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-gold-400" /> Catálogo Digital de Pronta Entrega
          </p>

          <p className="text-gray-400 text-xs max-w-md mt-3 leading-relaxed">
            Seja bem-vinda(o)! Navegue pelas nossas melhores fragrâncias e cosméticos exclusivos. Clique para fazer seu pedido pelo WhatsApp.
          </p>

          {/* Hero Banner Slideshow (8-second fade animation with mobile 600x600 & desktop formats) */}
          <div className="w-full max-w-6xl mt-6 relative rounded-2xl md:rounded-3xl overflow-hidden border border-gold-500/30 shadow-2xl bg-black/40 aspect-square sm:aspect-[2.8/1] md:aspect-[3/1]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
                className="w-full h-full"
              >
                {getSlideWhatsAppLink(HERO_SLIDES[currentSlide]) ? (
                  <a
                    href={getSlideWhatsAppLink(HERO_SLIDES[currentSlide])!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full group relative cursor-pointer"
                    title="Clique para pedir este Kit pelo WhatsApp"
                  >
                    <picture className="w-full h-full block">
                      <source media="(max-width: 639px)" srcSet={HERO_SLIDES[currentSlide].mobile} />
                      <img
                        src={HERO_SLIDES[currentSlide].desktop}
                        alt={HERO_SLIDES[currentSlide].alt}
                        className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
                      />
                    </picture>
                    <div className="absolute bottom-12 sm:bottom-4 right-4 bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all group-hover:scale-105 z-10">
                      <MessageCircle className="w-4 h-4 text-white" />
                      <span>Pedir no WhatsApp</span>
                    </div>
                  </a>
                ) : (
                  <picture className="w-full h-full block">
                    <source media="(max-width: 639px)" srcSet={HERO_SLIDES[currentSlide].mobile} />
                    <img
                      src={HERO_SLIDES[currentSlide].desktop}
                      alt={HERO_SLIDES[currentSlide].alt}
                      className="w-full h-full object-cover object-center"
                    />
                  </picture>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Slide Navigation Buttons */}
            <button
              type="button"
              onClick={() => setCurrentSlide(prev => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white/90 hover:text-white p-2.5 rounded-full backdrop-blur-md border border-white/20 transition-all cursor-pointer opacity-90 hover:opacity-100 z-10"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-5 h-5 text-gold-300" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white/90 hover:text-white p-2.5 rounded-full backdrop-blur-md border border-white/20 transition-all cursor-pointer opacity-90 hover:opacity-100 z-10"
              aria-label="Próximo slide"
            >
              <ChevronRight className="w-5 h-5 text-gold-300" />
            </button>

            {/* Slide Indicators Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    currentSlide === idx ? 'w-7 bg-gold-400' : 'w-2.5 bg-white/40 hover:bg-white/80'
                  }`}
                  aria-label={`Ir para slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        {/* Search & Filters */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xl shadow-gray-200/50 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar perfume, hidratante, marca ou produto..."
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-5 px-5 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedCategory === 'todos'
                  ? 'bg-gold-500 text-white shadow-md shadow-gold-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              🏷️ Todos os Produtos
            </button>
            {(['perfume', 'creme', 'kit', 'outros'] as Category[]).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-gold-500 text-white shadow-md shadow-gold-500/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                }`}
              >
                <span>{CATEGORY_EMOJIS[cat]}</span>
                <span>{CATEGORY_LABELS[cat]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Products Loading/Listing State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Carregando catálogo em tempo real...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs max-w-md mx-auto mt-8 space-y-4">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
            <div>
              <p className="text-gray-900 font-bold text-sm">Nenhum produto encontrado</p>
              <p className="text-xs text-gray-500 mt-1">Tente ajustar seus termos de busca ou mude de categoria.</p>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-gold-100 text-gold-700 font-bold text-xs rounded-xl"
              >
                Limpar Busca
              </button>
            )}
          </div>
        ) : (
          /* Grid list of catalog products */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((p, index) => {
                const isAvailable = p.quantity > 0;
                
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(0.15, index * 0.04), duration: 0.3 }}
                    className="bg-white rounded-3xl border border-gray-100/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Image Area with luxury overlay effects */}
                    <div className="relative aspect-square w-full bg-gray-50 overflow-hidden border-b border-gray-50">
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 cursor-pointer"
                          referrerPolicy="no-referrer"
                          onClick={() => setSelectedProductForImage(p)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-gold-50/20">
                          <ImageIcon className="w-12 h-12 text-gray-200" />
                          <span className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-wider">Aura Dourada</span>
                        </div>
                      )}

                      {/* Stock availability label on photo */}
                      <span className={`absolute top-3 left-3 text-[9px] px-2.5 py-1.5 rounded-full font-black shadow-sm ${
                        isAvailable 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-amber-500 text-white'
                      }`}>
                        {isAvailable ? 'PRONTA ENTREGA' : 'POR ENCOMENDA'}
                      </span>

                      {/* Photo Click Zoom Button */}
                      {p.photoUrl && (
                        <button
                          onClick={() => setSelectedProductForImage(p)}
                          className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                          title="Visualizar foto"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Meta data / Info */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-rose-gold-500 uppercase tracking-widest">{p.brand || 'Aura'}</p>
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{p.name || 'Produto'}</h3>
                      </div>

                      <div className="pt-2 border-t border-gray-50 flex items-end justify-between">
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Preço</p>
                          <p className="text-lg font-black text-gold-600">
                            R$ {(p.sellPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        
                        <a
                          href={getWhatsAppLink(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/15"
                        >
                          <MessageCircle className="w-4 h-4 fill-current" /> Pedir
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="text-center py-10 text-gray-400 text-xs space-y-2 border-t border-gray-100 mt-16">
        <p className="font-serif italic font-bold text-gray-700">✨ Aura Dourada © 2026 ✨</p>
        <p>Fragrâncias que marcam momentos especiais.</p>
      </footer>

      {/* Lightbox / Zoom Photo Modal */}
      <AnimatePresence>
        {selectedProductForImage && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50">
            {/* Close Button on Top */}
            <button
              onClick={() => setSelectedProductForImage(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Product Image and Details in Lightbox */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl relative"
            >
              <div className="aspect-square bg-gray-900 overflow-hidden relative">
                <img
                  src={selectedProductForImage.photoUrl}
                  alt={selectedProductForImage.name || 'Produto'}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-rose-gold-500 uppercase tracking-widest">{selectedProductForImage.brand || 'Aura'}</span>
                  <h4 className="text-gray-900 font-bold text-base leading-snug">{selectedProductForImage.name || 'Produto'}</h4>
                  <p className="text-lg font-black text-gold-600 mt-1">
                    R$ {(selectedProductForImage.sellPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedProductForImage(null)}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-bold rounded-xl"
                  >
                    Voltar
                  </button>
                  <a
                    href={getWhatsAppLink(selectedProductForImage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/10"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" /> Fazer Pedido
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
