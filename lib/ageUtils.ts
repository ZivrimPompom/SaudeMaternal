'use client';

export interface AgeInfo {
  years: number;
  months: number;
  text: string;
  stage: 'INFÂNCIA' | 'ADOLESCÊNCIA' | 'IDADE ADULTA' | 'VELHICE' | '---';
}

export function calculateAgeInfo(dob: string): AgeInfo {
  if (!dob) return { years: 0, months: 0, text: '---', stage: '---' };
  
  const birth = new Date(dob);
  const today = new Date();
  
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (today.getDate() < birth.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  
  let stage: AgeInfo['stage'] = 'IDADE ADULTA';
  if (years >= 0 && years <= 11) stage = 'INFÂNCIA';
  else if (years >= 12 && years <= 19) stage = 'ADOLESCÊNCIA';
  else if (years > 60) stage = 'VELHICE';
  
  const text = years > 0 ? `${years} ANOS, ${months} MESES` : `${months} MESES`;
  
  return { years, months, text, stage };
}

export function getStageColor(stage: AgeInfo['stage']): string {
  switch (stage) {
    case 'INFÂNCIA': return 'bg-blue-100 text-blue-700';
    case 'ADOLESCÊNCIA': return 'bg-purple-100 text-purple-700';
    case 'IDADE ADULTA': return 'bg-success/10 text-success';
    case 'VELHICE': return 'bg-error/10 text-error';
    default: return 'bg-surface-container-high text-on-surface-variant';
  }
}

export function getStageColorDark(stage: AgeInfo['stage']): string {
  switch (stage) {
    case 'INFÂNCIA': return 'dark:bg-blue-900/50 dark:text-blue-300';
    case 'ADOLESCÊNCIA': return 'dark:bg-purple-900/50 dark:text-purple-300';
    case 'IDADE ADULTA': return 'dark:bg-green-900/50 dark:text-green-300';
    case 'VELHICE': return 'dark:bg-red-900/50 dark:text-red-300';
    default: return 'dark:bg-surface-container-high dark:text-on-surface-variant';
  }
}
