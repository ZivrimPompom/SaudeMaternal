'use client';

import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { FileUp, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CSVImporterProps {
  tableName: string;
  expectedColumns: string[];
  onSuccess: () => void;
  title?: string;
  conflictColumn?: string;
  transformData?: (data: any[]) => any[];
}

export default function CSVImporter({ 
  tableName, 
  expectedColumns, 
  onSuccess, 
  title = 'Importar CSV',
  conflictColumn,
  transformData
}: CSVImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "", // Auto-detect delimiter
      complete: (results) => {
        const headers = results.meta.fields || [];
        console.log('CSV Headers detected:', headers);
        
        // Helper to normalize strings (lowercase, trim, remove accents)
        const normalize = (str: string) => 
          str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

        // Case-insensitive and accent-insensitive header validation
        const normalizedHeaders = headers.map(h => normalize(h));
        const missingColumns = expectedColumns.filter(
          col => !normalizedHeaders.includes(normalize(col))
        );
        
        if (missingColumns.length > 0) {
          console.error('Missing columns:', missingColumns);
          setError(`Colunas ausentes no CSV: ${missingColumns.join(', ')}. Verifique se os cabeçalhos estão corretos.`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // Clean data: map headers to expected column names and convert empty strings to null
        const cleanedData = results.data.map((row: any) => {
          const newRow: any = {};
          expectedColumns.forEach(col => {
            const actualHeader = headers.find(h => normalize(h) === normalize(col));
            if (actualHeader) {
              const value = row[actualHeader];
              newRow[col] = value === '' ? null : value;
            }
          });
          return newRow;
        });

        setPreviewData(cleanedData);
        setShowModal(true);
      },
      error: (err) => {
        setError(`Erro ao ler arquivo: ${err.message}`);
      }
    });
  };

  const confirmImport = async () => {
    setIsImporting(true);
    setError(null);

    try {
      // If conflictColumn is provided, use upsert. Otherwise, use simple insert.
      let query = supabase.from(tableName);
      
      let dataToInsert = previewData;
      
      // Apply custom transformation if provided (e.g., uppercase for rotinas)
      if (transformData) {
        dataToInsert = transformData(dataToInsert);
      }

      let result;
      if (conflictColumn) {
        result = await query.upsert(dataToInsert, { onConflict: conflictColumn });
      } else {
        result = await query.insert(dataToInsert);
      }

      if (result.error) throw result.error;

      setSuccess(`${dataToInsert.length} registros importados com sucesso!`);
      onSuccess();
      setTimeout(() => {
        setShowModal(false);
        setPreviewData([]);
      }, 2000);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Erro ao importar dados para o banco.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white px-4 py-2 rounded-xl transition-all font-headline text-[10px] font-black uppercase tracking-widest shadow-sm"
      >
        <FileUp className="w-4 h-4" />
        {title}
      </button>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl border border-outline-variant/10 space-y-6 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileUp className="text-primary w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black font-headline text-on-surface">Confirmar Importação</h3>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-surface-container-low z-10">
                    <tr>
                      {expectedColumns.map(col => (
                        <th key={col} className="px-4 py-3 font-black uppercase tracking-widest text-[9px] text-on-surface-variant/60">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {previewData.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {expectedColumns.map(col => (
                          <td key={col} className="px-4 py-3 text-on-surface/80">{row[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-4 text-center text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest bg-surface-container-low/30">
                    Exibindo 10 de {previewData.length} registros...
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 rounded-2xl bg-green-50 border border-green-100 text-green-600 text-xs font-bold flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  disabled={isImporting || !!success}
                  onClick={confirmImport}
                  className="flex-1 bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-xs disabled:opacity-50 disabled:scale-100"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isImporting ? 'Importando...' : 'Confirmar e Salvar'}
                </button>
                <button
                  disabled={isImporting}
                  onClick={() => setShowModal(false)}
                  className="px-8 bg-surface-container-high text-on-surface-variant font-black py-4 rounded-2xl hover:bg-surface-container-highest transition-all font-headline uppercase tracking-widest text-[10px] disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
