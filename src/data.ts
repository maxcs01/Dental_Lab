/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dentist, Job, HistoryRecord } from './types';

export const DEFAULT_DENTISTS: Dentist[] = [
  {
    id: 'd1',
    name: 'Dr. Ricardo Silva',
    address: 'Av. das Américas, 4200 - RJ',
    phone: '(21) 98877-6655',
    useManualTotals: false,
    manualTotalReceber: 0,
    manualTotalRecebido: 0,
  },
  {
    id: 'd2',
    name: 'Dra. Ana Souza',
    address: 'Rua Augusta, 1200 - SP',
    phone: '(11) 97766-5544',
    useManualTotals: false,
    manualTotalReceber: 0,
    manualTotalRecebido: 0,
  },
  {
    id: 'd3',
    name: 'Dr. Carlos Mendes',
    address: 'Av. Paulista, 500 - SP',
    phone: '(11) 96655-4433',
    useManualTotals: true,
    manualTotalReceber: 1500,
    manualTotalRecebido: 3000,
  },
];

export const DEFAULT_JOBS: Job[] = [
  {
    id: 'j1',
    dentistId: 'd1',
    patientName: 'Carlos Mendes',
    jobName: 'Prótese Total',
    price: 1200.00,
    dateType: 'entrega',
    date: '2026-05-18',
    notes: 'Acrilização rápida com dentes Trilux.',
    isPaid: true,
    paymentDate: '2026-05-18',
  },
  {
    id: 'j2',
    dentistId: 'd1',
    patientName: 'Marcos Oliveira',
    jobName: 'Ponte Fixa Metalocerâmica',
    price: 850.00,
    dateType: 'entrega',
    date: '2026-05-22', // Today! Pending, so it triggers "Hoje" unpaid status
    notes: 'Checar cor A2 na escala Vita.',
    isPaid: false,
  },
  {
    id: 'j3',
    dentistId: 'd2',
    patientName: 'Beatriz Lima',
    jobName: 'Placa Miorrelaxante',
    price: 350.00,
    dateType: 'entrega',
    date: '2026-05-15',
    notes: 'Placa acetato + acrílico prensada.',
    isPaid: true,
    paymentDate: '2026-05-16',
  },
  {
    id: 'j4',
    dentistId: 'd2',
    patientName: 'Juliana Costa',
    jobName: 'Incrustação Metálica (Onlay)',
    price: 450.00,
    dateType: 'entrega',
    date: '2026-05-22', // Today! Pending
    notes: 'Liga de Cromo-Cobalto.',
    isPaid: false,
  },
  {
    id: 'j5',
    dentistId: 'd3',
    patientName: 'Roberto Alencar',
    jobName: 'Protocolo Cerâmico s/ Implante',
    price: 4000.00,
    dateType: 'inicio',
    date: '2026-05-10',
    notes: 'Aguardando prova de dentes.',
    isPaid: false,
  },
  {
    id: 'j6',
    dentistId: 'd1',
    patientName: 'Mariana Duarte',
    jobName: 'Carcaça de PPR Provisória',
    price: 600.00,
    dateType: 'entrega',
    date: '2026-05-22', // Today! Pending
    notes: 'Urgente para o final da tarde.',
    isPaid: false,
  },
];

export const DEFAULT_HISTORY: HistoryRecord[] = [
  {
    id: 'h1',
    month: 4, // April
    year: 2026,
    totalReceber: 4800,
    totalRecebido: 6200,
    notes: 'Mês de alta demanda de próteses injetadas.',
  },
  {
    id: 'h2',
    month: 3, // March
    year: 2026,
    totalReceber: 3100,
    totalRecebido: 5400,
    notes: 'Fechamento tranquilo pós-carnaval.',
  },
  {
    id: 'h3',
    month: 2, // February
    year: 2026,
    totalReceber: 5200,
    totalRecebido: 4900,
    notes: 'Início do ano fiscal letivo com novos clientes.',
  },
];
