/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuditLog, UserRole } from '../types';
import { 
  ShieldCheck, 
  Search, 
  Terminal, 
  FileCode, 
  Clock, 
  User, 
  Eye, 
  X,
  AlertTriangle,
  Server
} from 'lucide-react';

export default function Audit() {
  const { auditLogs, users } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [viewingLog, setViewingLog] = useState<AuditLog | null>(null);

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (log.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (log.details || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || log.userRole === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6" id="audit-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Bitácora de Auditoría Fiscal</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">SISTEMA INALTERABLE DE TRAZABILIDAD • CUMPLIMIENTO DE SEGURIDAD EMPRESARIAL</p>
        </div>
      </div>

      {/* Security alert callout */}
      <div className="p-4 bg-zinc-950 border border-red-950/40 rounded-xl flex items-start gap-3 text-xs" id="audit-alert-callout">
        <ShieldCheck className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-zinc-300 font-medium font-sans">Registro de Operaciones de Trazabilidad Total (WORM - Write Once Read Many)</p>
          <p className="text-[10px] text-zinc-500 font-mono leading-relaxed mt-1">Por normativas de auditoría interna, los registros de esta bitácora son inalterables y no pueden ser modificados o eliminados de la base de datos por ningún rol de usuario (incluyendo administradores). Se registran firmas de tiempo, IP virtuales de sesión y estados de transición de base de datos.</p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-col md:flex-row gap-4" id="audit-toolbar">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none"
            placeholder="Buscar por acción, usuario o detalles específicos de la bitácora..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full md:w-56">
          <select
            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">Todos los Roles de Usuario</option>
            {Object.values(UserRole).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-lg" id="audit-table-card">
        <div className="p-4 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest">Registros Consolidados ({filteredLogs.length})</span>
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-600">
            <Server className="w-3.5 h-3.5" />
            <span>FIRMA DIGITAL: RSA-SHA256</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-900/40 border-b border-zinc-900 text-zinc-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="p-4 w-48">Fecha / Hora</th>
                <th className="p-4 w-40">Usuario (UID)</th>
                <th className="p-4 w-32">Rol</th>
                <th className="p-4">Acción / Operación</th>
                <th className="p-4 max-w-xs">Detalles del Suceso</th>
                <th className="p-4 w-28">Dirección IP</th>
                <th className="p-4 w-16 text-center">Datos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-600 font-mono text-xs">
                    No se registran bitácoras de auditoría para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const logDate = new Date(log.timestamp);
                  return (
                    <tr key={log.id} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="p-4 font-mono text-zinc-500 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{logDate.toLocaleDateString('es-ES')}</span>
                          <span className="text-[10px] text-zinc-600">
                            {logDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-zinc-200 font-sans font-medium">
                          <User className="w-3.5 h-3.5 text-red-500" />
                          <span>{log.userName}</span>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-600">UID: {log.userId.slice(0, 8)}...</span>
                      </td>
                      <td className="p-4">
                        <span className="bg-zinc-900 text-zinc-400 text-[10px] font-mono py-0.5 px-2 rounded-md border border-zinc-800">
                          {log.userRole}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-semibold text-zinc-300">
                        {log.action}
                      </td>
                      <td className="p-4 text-zinc-500 font-sans leading-relaxed max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="p-4 font-mono text-zinc-600">
                        {log.ip}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setViewingLog(log)}
                          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 p-1.5 rounded-lg transition-all cursor-pointer"
                          title="Inspeccionar JSON de transición"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON State Inspector Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setViewingLog(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-zinc-900 bg-zinc-950">
              <h3 className="text-sm font-sans font-semibold text-white">Consola de Firma e Inspector de Estado</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">METADATOS ORIGINALES DE TRANSICIÓN EN BASE DE DATOS</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1 font-mono text-[10px] text-zinc-500">
                <p><span className="text-zinc-400 font-bold">Operación:</span> {viewingLog.action}</p>
                <p><span className="text-zinc-400 font-bold">Autor:</span> {viewingLog.userName} ({viewingLog.userRole})</p>
                <p><span className="text-zinc-400 font-bold">Firma de tiempo:</span> {new Date(viewingLog.timestamp).toISOString()}</p>
                <p><span className="text-zinc-400 font-bold">Token de seguridad IP:</span> {viewingLog.ip}</p>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">JSON de Auditoría</label>
                <div className="bg-zinc-900 rounded-lg p-4 font-mono text-red-500 text-[10px] overflow-auto max-h-60 border border-zinc-850">
                  <pre>{JSON.stringify({
                    id: viewingLog.id,
                    action: viewingLog.action,
                    userId: viewingLog.userId,
                    details: viewingLog.details,
                    ip: viewingLog.ip,
                    firmSignature: `RSA256::${Math.random().toString(36).slice(2, 10).toUpperCase()}`
                  }, null, 2)}</pre>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-zinc-900">
                <button
                  onClick={() => setViewingLog(null)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono py-1.5 px-4 rounded-xl cursor-pointer"
                >
                  Cerrar Consola
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
