/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useDebounce } from '../hooks/useDebounce';
import { Client } from '../types';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  Cake, 
  Sparkles, 
  CreditCard,
  UserCheck
} from 'lucide-react';

export default function ClientDirectory() {
  const { clients, config, saveClient } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [preferences, setPreferences] = useState('');

  const filteredClients = useMemo(() => {
    const term = debouncedSearchQuery.toLowerCase().trim();
    if (!term) return clients;
    return clients.filter(c => 
      (c.name || '').toLowerCase().includes(term) ||
      (c.phone || '').includes(term) ||
      (c.email || '').toLowerCase().includes(term)
    );
  }, [clients, debouncedSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newId = `cli-${Date.now()}`;
    const newClient: Client = {
      id: newId,
      name: name.trim(),
      phone: phone.trim() || 'Sin teléfono',
      email: email.trim() || 'Sin correo',
      birthday: birthday || '',
      preferences: preferences.trim() || 'Ninguna',
      points: 0,
      createdAt: new Date().toISOString()
    };

    try {
      saveClient(newClient);
      
      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setBirthday('');
      setPreferences('');
      setIsModalOpen(false);
      alert(`Cliente "${newClient.name}" registrado correctamente.`);
    } catch (err: any) {
      console.error("Error creating client:", err);
      alert(`Error al registrar cliente: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="client-directory-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide font-sans">Directorio de Clientes VIP y Consumos</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">REGISTRE CLIENTES PARA EMISIÓN DE FACTURAS Y PUNTOS DE FIDELIZACIÓN</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 hover:bg-red-750 text-white font-mono font-bold text-xs px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          id="add-client-btn"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Nuevo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex items-center justify-between" id="search-container">
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o NIT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
        <span className="text-xs font-mono text-zinc-500">
          Encontrados: {filteredClients.length} clientes
        </span>
      </div>

      {/* Grid of clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="clients-grid">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 hover:border-zinc-850 transition-all flex flex-col justify-between" id={`client-card-${client.id}`}>
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-zinc-900 pb-2">
                <div>
                  <h3 className="font-sans font-bold text-white text-sm">{client.name}</h3>
                  <span className="text-[9px] font-mono text-red-500 font-bold uppercase block mt-0.5">Cliente ID: {client.id}</span>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 font-mono text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  {client.points} pts
                </div>
              </div>

              <div className="space-y-2 text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span>Tel: {client.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span className="truncate">Email: {client.email}</span>
                </div>
                {client.birthday && (
                  <div className="flex items-center gap-2">
                    <Cake className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <span>Cumpleaños: {client.birthday}</span>
                  </div>
                )}
                {client.preferences && (
                  <div className="mt-3 p-2 bg-zinc-900/30 rounded border border-zinc-900/50">
                    <span className="text-[9px] text-zinc-500 block uppercase mb-1">Preferencias / Alertas</span>
                    <p className="text-zinc-300 text-xs italic">"{client.preferences}"</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex justify-between items-center mt-4">
              <span className="text-[9px] font-mono text-zinc-500">Miembro desde: {new Date(client.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}

        {filteredClients.length === 0 && (
          <div className="col-span-full py-16 text-center bg-zinc-950 border border-zinc-900 rounded-xl">
            <UserCheck className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-xs text-zinc-500 font-mono">No se encontraron clientes registrados en el directorio.</p>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="client-modal-overlay">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5" id="client-modal">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-mono font-bold tracking-wider text-white uppercase">Registrar Nuevo Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase">Teléfono / Celular</label>
                  <input
                    type="text"
                    placeholder="Ej. 78933221"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Ej. juan@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase">Preferencias o Comentarios</label>
                <textarea
                  placeholder="Ej. Prefiere mesa VIP, Alérgico a frutos secos..."
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono border border-zinc-850 hover:bg-zinc-900 text-zinc-400 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
