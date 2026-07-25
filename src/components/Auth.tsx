import React, { useState } from 'react';
import { supabaseClient, isSupabaseConfigured } from '../utils/supabase';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthProps {
  onSuccess?: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const resetForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEmailNotConfirmed(false);
  };

  const handleResendConfirmation = async () => {
    if (!email.trim() || !supabaseClient) return;
    setResendingEmail(true);
    try {
      const { error } = await supabaseClient.auth.resend({
        type: 'signup',
        email: email.trim()
      });
      if (error) throw error;
      setSuccessMsg(`E-mail de confirmação reenviado para ${email.trim()}. Verifique sua caixa de entrada e spam.`);
      setErrorMsg(null);
    } catch (err: any) {
      console.error('[Resend Confirmation Error]:', err);
      setErrorMsg(handleTranslateError(err));
    } finally {
      setResendingEmail(false);
    }
  };

  const handleTranslateError = (error: any): string => {
    const msg = error?.message || '';
    if (msg.includes('Invalid login credentials')) {
      return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
    }
    if (msg.includes('User already registered') || msg.includes('already exists')) {
      return 'Este e-mail já está cadastrado no sistema.';
    }
    if (msg.includes('Password should be at least')) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (msg.includes('Unable to validate email address') || msg.includes('invalid email')) {
      return 'Por favor, insira um e-mail válido.';
    }
    if (msg.includes('Email not confirmed')) {
      setIsEmailNotConfirmed(true);
      return 'O seu e-mail ainda não foi confirmado. Verifique a caixa de entrada/spam do seu e-mail para clicar no link de confirmação do Supabase.';
    }
    if (msg.includes('rate limit') || msg.includes('Too many requests') || msg.includes('exceeded')) {
      return 'Limite de requisições de e-mail atingido no Supabase. Por favor, aguarde de 1 a 5 minutos antes de tentar novamente.';
    }
    return msg || 'Ocorreu um erro na autenticação. Tente novamente.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    if (!email || !password) {
      setErrorMsg('Preencha o e-mail e a senha para entrar.');
      return;
    }

    if (!supabaseClient) {
      setErrorMsg('Configuração do Supabase ausente.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      if (data.user) {
        setSuccessMsg('Login realizado com sucesso! Redirecionando...');
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error('[Auth Login Error]:', err);
      setErrorMsg(handleTranslateError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    if (!fullName.trim()) {
      setErrorMsg('Por favor, informe seu nome completo ou nome do negócio.');
      return;
    }

    if (!email.trim() || !password) {
      setErrorMsg('Preencha o e-mail e a senha para criar sua conta.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite novamente.');
      return;
    }

    if (!supabaseClient) {
      setErrorMsg('Configuração do Supabase ausente.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            display_name: fullName.trim(),
            store_name: fullName.trim(),
          }
        }
      });

      if (error) throw error;

      if (data.session) {
        setSuccessMsg('Conta criada e autenticada com sucesso! Bem-vindo(a).');
        if (onSuccess) onSuccess();
      } else if (data.user) {
        setSuccessMsg('Conta criada com sucesso! Se a confirmação por e-mail estiver ativa no Supabase, verifique sua caixa de entrada para ativar.');
        setMode('login');
      }
    } catch (err: any) {
      console.error('[Auth Register Error]:', err);
      setErrorMsg(handleTranslateError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    if (!email.trim()) {
      setErrorMsg('Informe o e-mail cadastrado para redefinir a senha.');
      return;
    }

    if (!supabaseClient) {
      setErrorMsg('Configuração do Supabase ausente.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });

      if (error) throw error;

      setSuccessMsg('Enviamos as instruções de recuperação para o seu e-mail.');
    } catch (err: any) {
      console.error('[Auth Reset Error]:', err);
      setErrorMsg(handleTranslateError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-950 via-slate-950 to-amber-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambient Lights - Gold & Rose Tones */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-400/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Top Header & Branding */}
        <div className="text-center mb-6 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-2 relative inline-flex items-center justify-center"
          >
            {/* Soft Ambient Glow behind free logo */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/30 via-pink-400/30 to-rose-400/30 rounded-full blur-2xl scale-125 -z-10" />
            <img 
              src="https://i.imgur.com/2uqM34W.png" 
              alt="Aura Dourada" 
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain filter drop-shadow-[0_8px_20px_rgba(244,114,182,0.35)] hover:scale-105 transition-transform duration-300" 
            />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-200 to-rose-200 tracking-tight">
            Aura Dourada
          </h1>
          <p className="text-xs text-rose-200/80 uppercase tracking-widest mt-1 font-semibold">
            Sistema de Gestão & Vendas
          </p>
        </div>

        {/* Auth Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-slate-900/85 backdrop-blur-2xl border border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(225,29,72,0.15)] relative overflow-hidden"
        >
          {/* Mode Switch Tabs */}
          {mode !== 'forgot' && (
            <div className="flex bg-slate-950/80 p-1 rounded-2xl mb-6 border border-pink-500/20">
              <button
                type="button"
                onClick={() => { setMode('login'); resetForm(); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-amber-400 via-pink-400 to-rose-400 text-slate-950 shadow-md shadow-pink-500/20 font-extrabold'
                    : 'text-rose-200/60 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); resetForm(); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-amber-400 via-pink-400 to-rose-400 text-slate-950 shadow-md shadow-pink-500/20 font-extrabold'
                    : 'text-rose-200/60 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>
          )}

          {/* Feedback Banners */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col gap-2 text-red-300 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
                {isEmailNotConfirmed && (
                  <div className="mt-1 pl-6 pt-2 border-t border-red-500/20 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resendingEmail || !email}
                      className="inline-flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-amber-400 to-pink-400 hover:from-amber-300 hover:to-pink-300 text-slate-950 font-bold rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer self-start"
                    >
                      {resendingEmail ? 'Reenviando...' : 'Reenviar E-mail de Confirmação'}
                    </button>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      Dica: Para desativar a confirmação obrigatória de e-mail no Supabase, vá no Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Email e desmarque &quot;Confirm email&quot;.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5 text-emerald-300 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-rose-200/90 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-pink-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-slate-950/80 border border-pink-500/30 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors placeholder:text-rose-200/30"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-semibold text-rose-200/90 uppercase tracking-wider">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); resetForm(); }}
                    className="text-[11px] text-amber-300 hover:text-pink-300 transition-colors font-medium cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-pink-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-pink-500/30 text-white rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors placeholder:text-rose-200/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-pink-300/70 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-amber-400 via-pink-400 to-rose-400 hover:from-amber-300 hover:via-pink-300 hover:to-rose-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Acessar Sistema <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-rose-200/90 uppercase tracking-wider mb-1.5">
                  Nome Completo / Nome do Negócio
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-pink-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Maria Silva Perfumaria"
                    className="w-full bg-slate-950/80 border border-pink-500/30 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors placeholder:text-rose-200/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-200/90 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-pink-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-slate-950/80 border border-pink-500/30 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors placeholder:text-rose-200/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-200/90 uppercase tracking-wider mb-1.5">
                  Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-pink-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crie uma senha segura"
                    className="w-full bg-slate-950/80 border border-pink-500/30 text-white rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors placeholder:text-rose-200/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-pink-300/70 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-200/90 uppercase tracking-wider mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-pink-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full bg-slate-950/80 border border-pink-500/30 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors placeholder:text-rose-200/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-amber-400 via-pink-400 to-rose-400 hover:from-amber-300 hover:via-pink-300 hover:to-rose-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Cadastrar e Entrar <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-pink-200 mb-1">Recuperar Senha</h3>
                <p className="text-xs text-rose-200/70">
                  Digite seu e-mail cadastrado e enviaremos um link para redefinição.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-200/90 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-pink-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-slate-950/80 border border-pink-500/30 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors placeholder:text-rose-200/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-pink-400 to-rose-400 hover:from-amber-300 hover:via-pink-300 hover:to-rose-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Enviar E-mail de Recuperação'
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); resetForm(); }}
                  className="text-xs text-amber-300 hover:text-pink-300 font-medium cursor-pointer"
                >
                  &larr; Voltar para a tela de Login
                </button>
              </div>
            </form>
          )}

          {/* Footer Security Badge */}
          <div className="mt-8 pt-4 border-t border-pink-500/20 flex items-center justify-center gap-2 text-[10px] text-rose-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Autenticação protegida via Supabase Auth</span>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
