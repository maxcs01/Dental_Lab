/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Job {
  id: string;
  dentistId: string;
  patientName: string;
  jobName: string; // e.g., "Prótese Total", "Incrustação coroas"
  price: number;
  dateType: 'inicio' | 'entrega';
  date: string; // YYYY-MM-DD
  notes: string;
  isPaid: boolean;
  paymentDate?: string; // YYYY-MM-DD
}

export interface Dentist {
  id: string;
  name: string;
  address: string;
  phone: string;
  // Manually edited totals (the user requested to be able to edit these summaries)
  manualTotalReceber?: number;
  manualTotalRecebido?: number;
  useManualTotals: boolean;
}

export interface HistoryRecord {
  id: string;
  month: number; // 1-12
  year: number;
  totalReceber: number;
  totalRecebido: number;
  notes?: string;
}
