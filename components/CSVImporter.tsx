'use client';

import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { FileUp, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';

interface CSVImporterProps {
  tableName: string;
  expectedColumns: string[];
  requiredColumns?: string[];
  onSuccess: () => void;
  onRejected?: (rejected: any[]) => void;
  title?: string;
  conflictColumn?: string;
  transformData?: (data: any[]) => any[] | { valid: any[], rejected: any[] };
  className?: string;
  hideTitleOnMobile?: boolean;
}

export default function CSVImporter({ 
  tableName, 
  expectedColumns, 
  requiredColumns = [],
  onSuccess, 
  title = 'Importar CSV',
  conflictColumn,
  transformData,
  className,
  hideTitleOnMobile = false
}: CSVImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [rejectedRecords, setRejectedRecords] = useState<any[]>([]);

  const { user: authUser } = useAuth();

  const downloadRejected = () => {
    if (rejectedRecords.length === 0) return;
    
    const csv = Papa.unparse(rejectedRecords);
    // Add UTF-8 BOM to ensure Excel and other tools recognize the encoding
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rejeitados_${tableName}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        
        // Check only required columns
        const missingRequired = requiredColumns.filter(
          col => !normalizedHeaders.includes(normalize(col))
        );
        
        if (missingRequired.length > 0) {
          console.error('Missing required columns:', missingRequired);
          setError(`Colunas obrigatórias ausentes no CSV: ${missingRequired.join(', ')}. Verifique se os cabeçalhos estão corretos.`);
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
            } else {
              // Column not in CSV, set to null
              newRow[col] = null;
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
      let rejected: any[] = [];
      
      // Apply custom transformation if provided (e.g., uppercase for rotinas)
      if (transformData) {
        console.log('Applying transformData to', dataToInsert.length, 'records');
        const result = transformData(dataToInsert);
        if (Array.isArray(result)) {
          dataToInsert = result;
        } else {
          dataToInsert = result.valid;
          rejected = result.rejected;
        }
        console.log('Transform result:', { valid: dataToInsert.length, rejected: rejected.length });
      }

      setRejectedRecords(rejected);

      // Inject operator's CPF for auditing after transformation to ensure it's not lost
      if (authUser?.cpf) {
        dataToInsert = dataToInsert.map(item => ({
          ...item,
          cpf_operador: authUser.cpf
        }));
      }

      // Deduplicate data based on conflictColumn to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time"
      // Only deduplicate if the value is present (not null/undefined)
      if (conflictColumn) {
        const seen = new Set();
        dataToInsert = dataToInsert.filter(item => {
          const val = item[conflictColumn];
          if (val === null || val === undefined) {
            return true; // Keep records without ID (new records)
          }
          if (seen.has(val)) {
            return false; // Filter duplicates in the same batch
          }
          seen.add(val);
          return true;
        });
      }

      if (dataToInsert.length === 0) {
        if (rejected.length > 0) {
          setSuccess(`Todos os ${rejected.length} registros foram rejeitados. O arquivo de rejeição foi baixado automaticamente.`);
        } else {
          setSuccess('Nenhum novo registro para importar.');
        }
        onSuccess();

        // Automatic download of rejected records if any
        if (rejected.length > 0) {
          const csv = Papa.unparse(rejected);
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `rejeitados_${tableName}_${new Date().getTime()}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setTimeout(() => {
          setShowModal(false);
          setPreviewData([]);
        }, 3000);
        return;
      }

      let result;
      if (conflictColumn) {
        result = await query.upsert(dataToInsert, { onConflict: conflictColumn });
      } else {
        result = await query.insert(dataToInsert);
      }

      if (result.error) throw result.error;

      let successMsg = `${dataToInsert.length} registros importados com sucesso!`;
      if (rejected.length > 0) {
        successMsg += ` (${rejected.length} registros foram rejeitados por inconsistências)`;
      }
      setSuccess(successMsg);
      onSuccess();
      
      // Automatic download of rejected records if any
      if (rejected.length > 0) {
        const csv = Papa.unparse(rejected);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `rejeitados_${tableName}_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => {
        setShowModal(false);
        setPreviewData([]);
      }, 2000);
    } catch (err: any) {
      console.error('Import error:', err);
      if (err.message?.includes('row-level security policy')) {
        setError('Erro de permissão no banco de dados. Por favor, verifique se as políticas de RLS estão configuradas corretamente no Supabase.');
      } else {
        setError(err.message || 'Erro ao importar dados para o banco.');
      }
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        className={className || "inline-flex items-center gap-2 bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white px-4 py-2 rounded-xl transition-all font-headline text-[10px] font-black uppercase tracking-widest shadow-sm"}
      >
        <FileUp className="w-4 h-4" />
        <span className={hideTitleOnMobile ? "hidden md:inline" : ""}>{title}</span>
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
              className="bg-surface-container-lowest rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl border border-outline-variant/10 space-y-6 max-h-[90vh] flex flex-col"
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
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-green-50 border border-green-100 text-green-600 text-xs font-bold flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {success}
                  </div>
                  {rejectedRecords.length > 0 && (
                    <button
                      onClick={downloadRejected}
                      className="w-full p-4 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                      <FileUp className="w-4 h-4 rotate-180" />
                      Baixar Registros Rejeitados (.csv)
                    </button>
                  )}
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
