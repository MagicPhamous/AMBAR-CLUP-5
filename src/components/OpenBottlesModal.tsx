/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { Wine, X, Sparkles, AlertCircle } from 'lucide-react';

interface OpenBottlesModalProps {
  isOpen: boolean;
  missingBottles: Product[];
  cajaName: string;
  onOpenBottle: (bottleId: string) => Promise<void>;
  onAllDone: () => void;
  onCancel: () => void;
}

export default function OpenBottlesModal({
  isOpen,
  missingBottles,
  cajaName,
  onOpenBottle,
  onAllDone,
  onCancel
}: OpenBottlesModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset index when missingBottles list changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [missingBottles]);

  if (!isOpen || !missingBottles || missingBottles.length === 0) return null;

  const currentBottle = missingBottles[currentIndex];
  if (!currentBottle) return null;

  const stockInCaja = currentBottle.cajaStock?.[cajaName] ?? currentBottle.quantity ?? 0;

  const handleYes = async () => {
    setIsSubmitting(true);
    try {
      await onOpenBottle(currentBottle.id);
      if (currentIndex + 1 < missingBottles.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onAllDone();
      }
    } catch (err) {
      console.error('Error al abrir botella:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNo = () => {
    // If user answers No to opening a bottle, cancel adding the item
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" id="open-bottles-modal">
      <div className="bg-zinc-950 border border-amber-800/80 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl shadow-amber-950/60 relative text-center">
        {/* Close icon */}
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Badge */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="p-4 bg-amber-950/80 border border-amber-700/60 rounded-full text-amber-400 shadow-inner">
            <Wine className="w-8 h-8 animate-pulse" />
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest bg-amber-950/40 px-3 py-1 rounded-full border border-amber-800/40">
            Control de Apertura ({cajaName})
          </span>
        </div>

        {/* Simple Question */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-white leading-snug">
            ¿Desea abrir una nueva botella de <span className="text-amber-400 font-extrabold">{currentBottle.name}</span>?
          </h3>
          <p className="text-xs text-zinc-400 font-mono">
            Insumo requerido por receta • Stock actual: <span className="text-white font-bold">{stockInCaja} botellas</span>
          </p>
        </div>

        {/* Yes / No Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
          <button
            type="button"
            onClick={handleNo}
            disabled={isSubmitting}
            className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-mono text-xs font-bold py-3 px-4 rounded-xl transition-all border border-zinc-800 uppercase tracking-wider cursor-pointer"
          >
            No
          </button>
          
          <button
            type="button"
            onClick={handleYes}
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-950/50 uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Abriendo...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>Sí</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
