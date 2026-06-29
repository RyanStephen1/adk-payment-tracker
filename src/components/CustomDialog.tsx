import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomDialogProps {
  isOpen: boolean;
  type: 'prompt' | 'confirm' | 'danger';
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: (value?: string) => void;
}

export default function CustomDialog({
  isOpen,
  type,
  title,
  message,
  defaultValue = '',
  placeholder = 'Enter value...',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onClose,
  onConfirm,
}: CustomDialogProps) {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(type === 'prompt' ? inputValue : undefined);
    onClose();
  };

  const isDanger = type === 'danger';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-transparent"
        />

        {/* Dialog Panel Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative bg-white rounded-xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${
                isDanger 
                  ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                  : type === 'confirm' 
                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                    : 'bg-blue-50 text-blue-600 border border-blue-100'
              }`}>
                {isDanger ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : type === 'confirm' ? (
                  <HelpCircle className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </div>
              <h3 className="font-sans font-bold text-slate-900 text-sm tracking-tight">
                {title}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message Content */}
          {message && (
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              {message}
            </p>
          )}

          {/* Input field for Prompts */}
          {type === 'prompt' && (
            <div className="pt-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs rounded-lg py-2 px-3 outline-hidden font-semibold text-slate-800 transition-colors focus:ring-1 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirm();
                  }
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-bold transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-2 text-xs text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer ${
                isDanger 
                  ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800' 
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
