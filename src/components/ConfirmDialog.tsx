import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export default function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel,
  isDanger = false
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass w-full max-w-md rounded-3xl border-slate-800/50 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isDanger && <AlertTriangle className="w-5 h-5 text-red-500" />}
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-slate-400 leading-relaxed">{message}</p>
          <div className="flex items-center space-x-4">
            <button
              onClick={onCancel}
              className="flex-grow bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all border border-slate-800"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-grow font-bold py-3 rounded-xl transition-all ${
                isDanger 
                  ? 'bg-red-600 hover:bg-red-700 text-white neon-glow-red' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white neon-glow-purple'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
