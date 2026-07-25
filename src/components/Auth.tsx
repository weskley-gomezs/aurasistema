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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambient Lights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Top Header & Branding */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-3 bg-gray-800/80 rounded-2xl border border-amber-500/30 mb-4 shadow-xl backdrop-blur-md"
          >
            <img src="https://i.imgur.com/XAhbi19.png" alt="Aura Dourada" className="w-14 h-14 object-contain" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Aura Dourada
          </h1>
          <p className="text-xs text-amber-200/70 uppercase tracking-widest mt-1 font-semibold">
            Sistema de Gestão & Vendas
          </p>
        </div>

        {/* Auth Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Mode Switch Tabs */}
          {mode !== 'forgot' && (
            <div className="flex bg-gray-900/80 p-1 rounded-2xl mb-6 border border-gray-700/50">
              <button
                type="button"
                onClick={() => { setMode('login'); resetForm(); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  mode === 'login'
                    ? 'bg-amber-500 text-gray-950 shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); resetForm(); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  mode === 'register'
                    ? 'bg-amber-500 text-gray-950 shadow-md'
                    : 'text-gray-400 hover:text-white'
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
                      className="inline-flex items-center justify-center px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer self-start"
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
                <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-gray-900/90 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); resetForm(); }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-900/90 border border-gray-700 text-white rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
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
                <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Nome Completo / Nome do Negócio
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Maria Silva Perfumaria"
                    className="w-full bg-gray-900/90 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-gray-900/90 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crie uma senha segura"
                    className="w-full bg-gray-900/90 border border-gray-700 text-white rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full bg-gray-900/90 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-gray-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
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
                <h3 className="text-sm font-bold text-white mb-1">Recuperar Senha</h3>
                <p className="text-xs text-gray-400">
                  Digite seu e-mail cadastrado e enviaremos um link para redefinição.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-gray-900/90 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-gray-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Enviar E-mail de Recuperação'
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); resetForm(); }}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                >
                  &larr; Voltar para a tela de Login
                </button>
              </div>
            </form>
          )}

          {/* Footer Security Badge */}
          <div className="mt-8 pt-4 border-t border-gray-700/50 flex items-center justify-center gap-2 text-[10px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Autenticação protegida via Supabase Auth</span>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
