'use client';

import React from 'react';
import { calculateAgeInfo, getStageColor } from '@/lib/ageUtils';

interface PatientBannerProps {
  patient: {
    nome: string;
    data_nascimento: string;
    cpf: string;
    cns: string;
    dum: string;
    dpp: string;
    data_cadastro: string;
    risco: string;
  };
  className?: string;
}

export default function PatientBanner({ patient, className = '' }: PatientBannerProps) {
  const calculateCaptacao = (dum: string, cadastro: string) => {
    if (!dum || !cadastro) return '---';
    const start = new Date(dum);
    const entry = new Date(cadastro);
    const diffTime = Math.abs(entry.getTime() - start.getTime());
    const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
    return diffWeeks <= 12 ? 'PRECOCE' : 'TARDIA';
  };

  const ageInfo = calculateAgeInfo(patient.data_nascimento);
  const captacao = calculateCaptacao(patient.dum, patient.data_cadastro);

  const formatDate = (date: string) => {
    if (!date) return '---';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatCpf = (value: string) => {
    const v = value?.replace(/\D/g, '') || '';
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`;
  };

  return (
    <div className={`bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 shadow-sm mb-6 ${className}`}>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
          <span className="material-symbols-outlined text-primary text-3xl font-black">person</span>
        </div>

        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-y-4 gap-x-8">
          <div className="lg:col-span-2 xl:col-span-1">
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">NOME COMPLETO</p>
            <p className="text-sm font-black text-on-surface leading-tight uppercase tracking-tight">{patient.nome || '---'}</p>
          </div>

          <div>
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">CNS / CPF</p>
            <p className="text-sm font-black text-on-surface leading-tight uppercase tracking-tight">
              {patient.cns || '---'} <span className="text-on-surface-variant/20 mx-1">|</span> {formatCpf(patient.cpf)}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">NASC. / IDADE</p>
            <p className="text-sm font-black text-on-surface leading-tight uppercase tracking-tight">
              {formatDate(patient.data_nascimento)} <span className="text-on-surface-variant/20 mx-1">|</span> {ageInfo.text}
            </p>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mt-1 inline-block ${getStageColor(ageInfo.stage)}`}>
              {ageInfo.stage}
            </span>
          </div>

          <div>
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">DUM / DPP</p>
            <p className="text-sm font-black text-on-surface leading-tight uppercase tracking-tight">
              {formatDate(patient.dum)} <span className="text-on-surface-variant/20 mx-1">|</span> {formatDate(patient.dpp)}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">RISCO / CAPTAÇÃO</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                patient.risco === 'ALTO RISCO' 
                  ? 'bg-error/10 text-error' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {patient.risco || 'ESTRATIFICANDO'}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                captacao === 'PRECOCE' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-warning/10 text-warning'
              }`}>
                {captacao}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
