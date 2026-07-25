/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SystemConfig, UserRole } from '../types';
import { 
  Settings as SettingsIcon, 
  Save, 
  Users, 
  Printer, 
  Sliders, 
  Lock, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Key 
} from 'lucide-react';

export default function Settings() {
  const { config, updateConfig, users, addUser, removeUser, resetWarehouse, clearOperationalData } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'printer' | 'maintenance'>('general');
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetErrorMsg, setResetErrorMsg] = useState('');

  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [purgeErrorMsg, setPurgeErrorMsg] = useState('');

  // General config form
  const [companyName, setCompanyName] = useState(config.companyName);
  const [nit, setNit] = useState(config.nit);
  const [address, setAddress] = useState(config.address);
  const [currency, setCurrency] = useState(config.currency);
  const [taxRate, setTaxRate] = useState(config.taxRate);
  const [ticketFooter, setTicketFooter] = useState(config.ticketFooter);
  const [printerSeries, setPrinterSeries] = useState(config.printerSeries);

  // New user form states
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.CAJA);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemConfig = {
      ...config,
      companyName,
      nit,
      address,
      currency,
      taxRate: Number(taxRate),
      ticketFooter,
      printerSeries
    };
    updateConfig(updated);
    alert('Configuración corporativa de AMBAR CLUB guardada correctamente.');
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    addUser(newUserName, newUserEmail, newUserRole);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole(UserRole.CAJA);
    alert(`Usuario "${newUserName}" registrado con rol de ${newUserRole}.`);
  };

  const handlePasswordReset = (email: string) => {
    alert(`Enviando enlace de restablecimiento de contraseña a: ${email}\nProcedimiento administrado por Firebase Auth SDK.`);
  };

  return (
    <div className="space-y-6" id="settings-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Configuración del Sistema</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">CONFIGURACIÓN FISCAL, CONTROL DE ACCESOS, ROLES Y HARDWARE DE TICKETS</p>
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="flex gap-2 border-b border-zinc-900" id="settings-tabs">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 text-xs font-mono font-medium uppercase px-3 tracking-wider transition-colors border-b-2 cursor-pointer ${activeTab === 'general' ? 'text-red-500 border-red-600' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
        >
          General & Parámetros
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs font-mono font-medium uppercase px-3 tracking-wider transition-colors border-b-2 cursor-pointer ${activeTab === 'users' ? 'text-red-500 border-red-600' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
        >
          Gestión de Personal & Roles
        </button>
        <button
          onClick={() => setActiveTab('printer')}
          className={`pb-3 text-xs font-mono font-medium uppercase px-3 tracking-wider transition-colors border-b-2 cursor-pointer ${activeTab === 'printer' ? 'text-red-500 border-red-600' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
        >
          Impresoras & Terminales
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 text-xs font-mono font-medium uppercase px-3 tracking-wider transition-colors border-b-2 cursor-pointer ${activeTab === 'maintenance' ? 'text-red-500 border-red-600' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
        >
          Mantenimiento de Datos
        </button>
      </div>

      {/* Content panes */}
      <div className="mt-4" id="settings-content-pane">
        {activeTab === 'general' && (
          <form onSubmit={handleSaveConfig} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 max-w-3xl">
            <h3 className="text-sm font-sans font-semibold text-white uppercase tracking-wider pb-3 border-b border-zinc-900">
              Datos de Empresa y Régimen Fiscal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Razón Social / Nombre Comercial</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">NIT / Identificación Fiscal</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Dirección Física Establecimiento</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Moneda del Sistema</label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="BOB">BOB - Boliviano</option>
                  <option value="USD">USD - Dólar Estadounidense</option>
                  <option value="CLP">CLP - Peso Chileno</option>
                  <option value="PEN">PEN - Sol Peruano</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Tasa Alícuota Tributaria (e.g. IVA 0.13)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex justify-end">
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-mono py-2.5 px-5 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-red-950/20"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Configuración General</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="settings-users-grid">
            {/* Left: User creator (Col span 5) */}
            <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 p-5 rounded-2xl h-max space-y-4">
              <h3 className="text-xs font-mono font-medium text-white uppercase tracking-wider pb-2 border-b border-zinc-900">
                Registrar Colaborador
              </h3>

              <form onSubmit={handleAddUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                    placeholder="e.g. Andrés Mendoza"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Correo Electrónico (Firebase Auth)</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                    placeholder="e.g. andres@ambarclub.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Rol / Permisos del Puesto</label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  >
                    {Object.values(UserRole).map(rol => (
                      <option key={rol} value={rol}>{rol}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dar de Alta Usuario</span>
                </button>
              </form>
            </div>

            {/* Right: Staff list (Col span 7) */}
            <div className="lg:col-span-7 bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow">
              <div className="p-4 border-b border-zinc-900">
                <span className="text-xs font-mono font-medium text-white uppercase tracking-wider">Usuarios y Accesos Activos</span>
              </div>
              <div className="divide-y divide-zinc-900">
                {users.map(u => (
                  <div key={u.uid} className="p-4 flex items-center justify-between hover:bg-zinc-900/10 text-xs">
                    <div>
                      <span className="font-sans font-medium text-zinc-200 block">{u.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{u.email}</span>
                      <span className="text-[9px] bg-red-950/40 border border-red-900/30 text-red-400 font-mono font-semibold py-0.5 px-1.5 rounded uppercase inline-block mt-1.5">
                        {u.role}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePasswordReset(u.email)}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Enviar restablecer clave"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setUserToDelete(u)}
                        className="bg-red-950/20 hover:bg-red-950/40 border border-red-900/20 text-red-400 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar acceso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'printer' && (
          <form onSubmit={handleSaveConfig} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 max-w-3xl">
            <h3 className="text-sm font-sans font-semibold text-white uppercase tracking-wider pb-3 border-b border-zinc-900">
              Impresión Térmica de Comprobantes (80mm / 58mm)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Nombre Dispositivo / Serie Terminal</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none"
                  value={printerSeries}
                  onChange={(e) => setPrinterSeries(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Ancho de Cinta Térmica</label>
                <select className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-xl focus:outline-none">
                  <option value="80">Cinta de 80 mm (Recomendado AMBAR)</option>
                  <option value="58">Cinta de 58 mm</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Pie de Ticket / Cláusula de Cumplimiento</label>
                <textarea
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none"
                  value={ticketFooter}
                  onChange={(e) => setTicketFooter(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex justify-end">
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-mono py-2.5 px-5 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-red-950/20"
              >
                <Printer className="w-4 h-4" />
                <span>Aplicar Ajustes de Impresora</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 max-w-3xl">
            <h3 className="text-sm font-sans font-semibold text-white uppercase tracking-wider pb-3 border-b border-zinc-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-red-500" />
              <span>Restablecimiento y Carga de Datos</span>
            </h3>
            
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Esta sección le permite restablecer el inventario y las categorías del almacén de <strong className="text-zinc-200">AMBAR CLUB</strong>. Al ejecutar esta acción, se eliminarán los productos y categorías anteriores para cargar el catálogo oficial de <strong className="text-red-400">61 productos premium</strong>, organizados con sus respectivos códigos de barras, códigos internos, costos base, precios de venta, configuraciones de dosificación de botellas (ml) y stocks mínimos de seguridad.
              </p>
              
              <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 text-xs text-red-400 font-mono space-y-2">
                <p className="font-bold">⚠️ ADVERTENCIA DE SEGURIDAD:</p>
                <p>Al hacer clic en el botón de restablecimiento:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Se eliminarán permanentemente todos los productos guardados actualmente en la base de datos de Firestore.</li>
                  <li>Se eliminarán las categorías existentes para amoldarse a la nueva clasificación.</li>
                  <li>Se registrarán entradas de Kardex iniciales para cada uno de los 61 productos del catálogo.</li>
                </ul>
              </div>

              <div className="space-y-4">
                {resetStatus === 'success' && (
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 text-xs text-emerald-400 font-mono space-y-2">
                    <p className="font-bold">✅ ALMACÉN RESTABLECIDO CON ÉXITO:</p>
                    <p>El catálogo oficial de 61 productos de AMBAR CLUB ha sido cargado con éxito en Firestore. Todos los inventarios han sido inicializados en su stock de seguridad y sincronizados con el Kardex.</p>
                    <button 
                      type="button" 
                      onClick={() => { setResetStatus('idle'); setShowResetConfirm(false); }}
                      className="mt-2 text-[10px] font-bold text-emerald-300 hover:underline uppercase block"
                    >
                      [ Entendido / Volver ]
                    </button>
                  </div>
                )}

                {resetStatus === 'error' && (
                  <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 text-xs text-red-400 font-mono space-y-2">
                    <p className="font-bold">❌ ERROR AL RESTABLECER EL ALMACÉN:</p>
                    <p className="break-all">{resetErrorMsg}</p>
                    <button 
                      type="button" 
                      onClick={() => { setResetStatus('idle'); }}
                      className="mt-2 text-[10px] font-bold text-red-300 hover:underline uppercase block"
                    >
                      [ Reintentar ]
                    </button>
                  </div>
                )}

                {resetStatus === 'idle' && !showResetConfirm && (
                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/20"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Restablecer Almacén a Catálogo Oficial</span>
                    </button>
                  </div>
                )}

                {resetStatus === 'idle' && showResetConfirm && (
                  <div className="bg-zinc-900 border border-red-900/40 rounded-xl p-5 space-y-4">
                    <p className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider">
                      ¿Está absolutamente seguro de proceder?
                    </p>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      Esta acción es irreversible y eliminará permanentemente todos los productos, categorías y registros de Kardex anteriores para amoldarse a la nueva clasificación de 61 productos de AMBAR CLUB.
                    </p>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setResetStatus('loading');
                            setIsResetting(true);
                            await resetWarehouse();
                            setResetStatus('success');
                          } catch (err: any) {
                            setResetStatus('error');
                            setResetErrorMsg(err.message || 'Error desconocido al borrar o escribir en Firestore.');
                          } finally {
                            setIsResetting(false);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded-lg uppercase transition-all cursor-pointer"
                      >
                        Sí, Restablecer Almacén
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold rounded-lg uppercase transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {resetStatus === 'loading' && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center space-y-3 py-8">
                    <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
                    <p className="text-xs font-mono text-zinc-300 animate-pulse">
                      Restableciendo Almacén en Firestore. Por favor, espere...
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Purge Operational Data Section */}
            <div className="pt-6 border-t border-zinc-900 space-y-4">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>Limpieza Completa para Inicio de Operaciones (Domingo)</span>
              </h4>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Use esta herramienta para preparar el sistema de <strong className="text-zinc-200">AMBAR CLUB</strong> antes de abrir el día domingo. Esta acción <strong className="text-red-400">elimina todos los datos de prueba y transaccionales</strong> (ventas, compras, movimientos de Kardex, sesiones de caja, gastos de caja chica, reportes de meseros, registros de auditoría e historial de clientes), restablece las mesas a su estado libre sin consumo, y reinicia el stock y litros en barra de cada producto a cero (manteniendo el stock total de los productos en el almacén intacto).
              </p>
              
              <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 text-xs text-red-400 font-mono space-y-1">
                <p className="font-bold text-red-300 uppercase">⚠️ ATENCIÓN - ESTA ACCIÓN ELIMINARÁ:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Historial de Ventas y Compras</li>
                  <li>Movimientos de Inventario (Kardex completo)</li>
                  <li>Sesiones de Caja Abiertas/Cerradas</li>
                  <li>Gastos Registrados y Reportes de Meseros</li>
                  <li>Estados de Mesas (Consumos activos serán borrados)</li>
                  <li>Mapeos de Stock en Caja (Se conservará únicamente el stock en almacén central)</li>
                </ul>
                <p className="mt-2 font-bold text-zinc-300">LO QUE SE CONSERVA PERFECTAMENTE:</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                  <li>Catálogo de Productos en Almacén (Nombres, precios, costos, botellas, dosificaciones y cantidad en almacén central)</li>
                  <li>Categorías y Proveedores</li>
                  <li>Cuentas de Usuarios de Personal y Permisos de Acceso</li>
                  <li>Configuración Corporativa y de Impresoras</li>
                </ul>
              </div>

              <div className="space-y-4">
                {purgeStatus === 'success' && (
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 text-xs text-emerald-400 font-mono space-y-2 animate-fade-in">
                    <p className="font-bold">✅ SISTEMA PURGADO CON ÉXITO:</p>
                    <p>La base de datos operativa ha sido limpiada por completo. El sistema está 100% limpio y listo para iniciar las operaciones oficiales el día domingo de manera impecable.</p>
                    <button 
                      type="button" 
                      onClick={() => { setPurgeStatus('idle'); setShowPurgeConfirm(false); }}
                      className="mt-2 text-[10px] font-bold text-emerald-300 hover:underline uppercase block cursor-pointer"
                    >
                      [ Entendido / Volver ]
                    </button>
                  </div>
                )}

                {purgeStatus === 'error' && (
                  <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 text-xs text-red-400 font-mono space-y-2 animate-fade-in">
                    <p className="font-bold">❌ ERROR AL PURGAR LOS DATOS:</p>
                    <p className="break-all">{purgeErrorMsg}</p>
                    <button 
                      type="button" 
                      onClick={() => { setPurgeStatus('idle'); }}
                      className="mt-2 text-[10px] font-bold text-red-300 hover:underline uppercase block cursor-pointer"
                    >
                      [ Reintentar ]
                    </button>
                  </div>
                )}

                {purgeStatus === 'idle' && !showPurgeConfirm && (
                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={() => setShowPurgeConfirm(true)}
                      className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-red-600/50 text-red-400 font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-black/40"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Limpiar Base de Datos para Domingo (Inicio Oficial)</span>
                    </button>
                  </div>
                )}

                {purgeStatus === 'idle' && showPurgeConfirm && (
                  <div className="bg-zinc-900 border border-red-900/40 rounded-xl p-5 space-y-4 animate-fade-in">
                    <p className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider">
                      ⚠️ ¿CONFIRMA QUE DESEA PURGAR TODA LA DATA OPERATIVA?
                    </p>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      Esta operación es definitiva e irreversible. Todos los registros de ventas de prueba, sesiones, gastos y consumos activos se eliminarán permanentemente de Firestore para iniciar las operaciones reales el domingo. El catálogo de productos en almacén no se verá afectado.
                    </p>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setPurgeStatus('loading');
                            await clearOperationalData();
                            setPurgeStatus('success');
                          } catch (err: any) {
                            setPurgeStatus('error');
                            setPurgeErrorMsg(err.message || 'Error desconocido al purgar Firestore.');
                          }
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded-lg uppercase transition-all cursor-pointer"
                      >
                        Sí, Proceder con la Purga Oficial
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPurgeConfirm(false)}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold rounded-lg uppercase transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {purgeStatus === 'loading' && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center space-y-3 py-8">
                    <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
                    <p className="text-xs font-mono text-zinc-300 animate-pulse">
                      Purgando datos de prueba en Firestore. Por favor, espere...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Custom User Deactivation Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="delete-user-modal-overlay">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5" id="delete-user-modal">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-red-950/40 border border-red-900/30 rounded-full flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-mono font-bold tracking-wider text-white uppercase">Inactivar Usuario</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                ¿Desea dar de baja al usuario <span className="text-red-400 font-bold">"{userToDelete.name}"</span>? Esta acción inhabilitará su acceso al sistema de administración de AMBAR CLUB.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-mono border border-zinc-800 hover:bg-zinc-900 text-zinc-400 transition-colors cursor-pointer"
                id="delete-user-cancel-btn"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  removeUser(userToDelete.uid);
                  setUserToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-mono bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer font-bold shadow-md shadow-red-950/50"
                id="delete-user-confirm-btn"
              >
                Inactivar Acceso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
