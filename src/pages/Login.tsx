/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ShieldCheck, Wine, Key, Lock, Mail, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { sendPasswordReset } from '../services/authService';

export default function Login() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.ADMIN);
  const [password, setPassword] = useState('AmbarClub123!'); // Standard default pass
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor ingrese su nombre de usuario o correo.');
      return;
    }
    const lowerEmail = email.trim().toLowerCase();
    if (lowerEmail === 'caja' || lowerEmail === 'mesero') {
      setError('Los usuarios genéricos "caja" y "mesero" han sido desactivados. Por favor, use un usuario específico como caja1...caja4 o mesero1...mesero8.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await login(email, selectedRole, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPass = async () => {
    if (!email) {
      setError('Por favor escriba su correo primero para enviarle instrucciones.');
      return;
    }
    if (!email.includes('@')) {
      setError('Recuperación por correo requiere un correo electrónico válido.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      setForgotSent(true);
      setTimeout(() => {
        setForgotSent(false);
      }, 7000);
    } catch (err: any) {
      setError(`Error al enviar recuperación: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const lower = val.trim().toLowerCase();
    const cleanKey = lower.replace(/\s+/g, '');

    if (cleanKey === 'aisha' || cleanKey === 'aishaarteaga' || cleanKey === 'aisha.arteaga' || cleanKey === 'aisha@ambar.club') {
      setPassword('10061111');
      setSelectedRole(UserRole.MESERO);
    } else if (cleanKey === 'mauricio' || cleanKey === 'mauriciosebastian' || cleanKey === 'mauricio.sebastian' || cleanKey === 'mauricio@ambar.club') {
      setPassword('10929665');
      setSelectedRole(UserRole.ALMACENERO);
    } else if (cleanKey === 'valeria' || cleanKey === 'valeria@ambar.club') {
      setPassword('8316260');
      setSelectedRole(UserRole.MESERO);
    } else if (cleanKey === 'vianca' || cleanKey === 'vianca@ambar.club') {
      setPassword('Munec@77');
      setSelectedRole(UserRole.ALMACENERO);
    } else if (cleanKey === 'caja1' || cleanKey === 'caja1@ambar.club') {
      setPassword('caja1');
      setSelectedRole(UserRole.CAJA);
    } else if (cleanKey === 'caja2' || cleanKey === 'caja2@ambar.club') {
      setPassword('caja2');
      setSelectedRole(UserRole.CAJA);
    } else if (cleanKey === 'caja3' || cleanKey === 'caja3@ambar.club') {
      setPassword('caja3');
      setSelectedRole(UserRole.CAJA);
    } else if (cleanKey === 'caja4' || cleanKey === 'caja4@ambar.club') {
      setPassword('caja4');
      setSelectedRole(UserRole.CAJA);
    } else if (cleanKey === 'gerente' || cleanKey === 'gerente@ambar.club') {
      setPassword('123456789');
      setSelectedRole(UserRole.GERENTE);
    } else if (cleanKey === 'almacenero1' || cleanKey === 'almacenero1@ambar.club') {
      setPassword('almacenero1');
      setSelectedRole(UserRole.ALMACENERO);
    } else if (cleanKey.startsWith('mesero') && /^mesero[1-8](@ambar\.club)?$/.test(cleanKey)) {
      const userPart = cleanKey.replace('@ambar.club', '');
      setPassword(userPart);
      setSelectedRole(UserRole.MESERO);
    } else if (cleanKey === 'cristianbacarreza29@gmail.com' || cleanKey === 'cristianbacarreza1999@gmail.com' || cleanKey === 'cristian') {
      setPassword('78937703');
      setSelectedRole(UserRole.ADMIN);
    } else if (cleanKey === 'admin' || cleanKey === 'admin@ambar.club') {
      setPassword('123456789');
      setSelectedRole(UserRole.ADMIN);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4 relative overflow-hidden" id="login-screen">
      {/* Absolute Decorative Premium Red Ambient Background Light */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] bg-red-950/20 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] bg-red-900/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-zinc-950/80 border border-red-950/40 backdrop-blur-md p-8 rounded-2xl shadow-2xl shadow-red-950/10 relative z-10"
        id="login-card"
      >
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-8" id="login-brand-header">
          <div className="w-16 h-16 bg-red-950/40 border border-red-600/30 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/20 mb-4 animate-pulse">
            <Wine className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-white font-sans uppercase">
             Ámbar <span className="text-red-600 font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">Club</span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 tracking-wider">ENTERPRISE ERP & POS SYSTEM</p>
        </div>

        {error && (
          <div className="mb-5 bg-red-950/30 border border-red-800/40 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2" id="login-error-alert">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {forgotSent && (
          <div className="mb-5 bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2" id="login-forgot-alert">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Instrucciones de recuperación enviadas a {email}.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
          {/* Email field */}
          <div id="field-email">
            <label className="block text-xs font-mono font-medium text-zinc-400 mb-2 uppercase tracking-wider">Usuario o Correo</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                required
                className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                placeholder="admin, mesero1, caja1, etc."
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
              />
            </div>
          </div>

          {/* Role selector field */}
          <div id="field-role">
            <label className="block text-xs font-mono font-medium text-zinc-400 mb-2 uppercase tracking-wider">Rol de Operación</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <select
                className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none transition-colors appearance-none"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              >
                {Object.values(UserRole).map(role => (
                  <option key={role} value={role} className="bg-zinc-950 text-white">
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password field */}
          <div id="field-password">
            <div className="flex justify-between mb-2">
              <label className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">Contraseña</label>
              <button 
                type="button" 
                onClick={handleForgotPass}
                className="text-xs font-mono text-zinc-500 hover:text-red-400 transition-colors"
              >
                ¿Olvidó la clave?
              </button>
            </div>
            <div className="relative">
              <Key className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input 
                type="password"
                required
                className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-red-950 to-red-800 hover:from-red-900 hover:to-red-700 border border-red-800/50 text-white text-sm font-sans font-medium py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
            id="login-btn"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Acceder al Sistema</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
