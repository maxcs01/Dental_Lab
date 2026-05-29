-- Migration: Initialize DentLab Pro Schema with default data
-- Created: 2026-05-29

-- Enable UUID extension if needed (we map to textual IDs, but good practice)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------------------------------------
-- 1. ACCOUNTS TABLE (Registered Professionals/Admins)
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    security_question TEXT NOT NULL,
    security_answer TEXT NOT NULL, -- Lowercased for comparisons
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles / accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous or public select/insert/update for active client workflow inside sandbox
DROP POLICY IF EXISTS "Allow public select on accounts" ON public.accounts;
CREATE POLICY "Allow public select on accounts" ON public.accounts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on accounts" ON public.accounts;
CREATE POLICY "Allow public insert on accounts" ON public.accounts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on accounts" ON public.accounts;
CREATE POLICY "Allow public update on accounts" ON public.accounts FOR UPDATE USING (true) WITH CHECK (true);

---------------------------------------------------------
-- 2. DENTISTS TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dentists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    use_manual_totals BOOLEAN DEFAULT false NOT NULL,
    manual_total_receber NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    manual_total_recebido NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    created_by TEXT DEFAULT 'odontologo@precisao.com' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on dentists" ON public.dentists;
CREATE POLICY "Allow public select on dentists" ON public.dentists FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on dentists" ON public.dentists;
CREATE POLICY "Allow public insert on dentists" ON public.dentists FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on dentists" ON public.dentists;
CREATE POLICY "Allow public update on dentists" ON public.dentists FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on dentists" ON public.dentists;
CREATE POLICY "Allow public delete on dentists" ON public.dentists FOR DELETE USING (true);

---------------------------------------------------------
-- 3. JOBS TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
    id TEXT PRIMARY KEY,
    dentist_id TEXT REFERENCES public.dentists(id) ON DELETE CASCADE NOT NULL,
    patient_name TEXT NOT NULL,
    job_name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    date_type TEXT NOT NULL CHECK (date_type IN ('inicio', 'entrega')),
    date TEXT NOT NULL, -- YYYY-MM-DD
    notes TEXT,
    is_paid BOOLEAN DEFAULT false NOT NULL,
    payment_date TEXT, -- YYYY-MM-DD
    created_by TEXT DEFAULT 'odontologo@precisao.com' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on jobs" ON public.jobs;
CREATE POLICY "Allow public select on jobs" ON public.jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on jobs" ON public.jobs;
CREATE POLICY "Allow public insert on jobs" ON public.jobs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on jobs" ON public.jobs;
CREATE POLICY "Allow public update on jobs" ON public.jobs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on jobs" ON public.jobs;
CREATE POLICY "Allow public delete on jobs" ON public.jobs FOR DELETE USING (true);

---------------------------------------------------------
-- 4. HISTORY RECORDS TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.history_records (
    id TEXT PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    total_receber NUMERIC(12, 2) NOT NULL,
    total_recebido NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_by TEXT DEFAULT 'odontologo@precisao.com' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.history_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on history_records" ON public.history_records;
CREATE POLICY "Allow public select on history_records" ON public.history_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on history_records" ON public.history_records;
CREATE POLICY "Allow public insert on history_records" ON public.history_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on history_records" ON public.history_records;
CREATE POLICY "Allow public update on history_records" ON public.history_records FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on history_records" ON public.history_records;
CREATE POLICY "Allow public delete on history_records" ON public.history_records FOR DELETE USING (true);


---------------------------------------------------------
-- 5. SEEDING / DEFAULT WORKSPACE DATA
---------------------------------------------------------

-- Default administrator account
INSERT INTO public.accounts (email, password, security_question, security_answer)
VALUES (
    'odontologo@precisao.com',
    'senha123',
    'Qual seu primeiro laboratorio?',
    'precisao'
) ON CONFLICT (email) DO NOTHING;

-- Seed default dentists
INSERT INTO public.dentists (id, name, address, phone, use_manual_totals, manual_total_receber, manual_total_recebido, created_by)
VALUES 
('d1', 'Dr. Ricardo Silva', 'Av. das Américas, 4200 - RJ', '(21) 98877-6655', false, 0, 0, 'odontologo@precisao.com'),
('d2', 'Dra. Ana Souza', 'Rua Augusta, 1200 - SP', '(11) 97766-5544', false, 0, 0, 'odontologo@precisao.com'),
('d3', 'Dr. Carlos Mendes', 'Av. Paulista, 500 - SP', '(11) 96655-4433', true, 1500, 3000, 'odontologo@precisao.com')
ON CONFLICT (id) DO NOTHING;

-- Seed default jobs
INSERT INTO public.jobs (id, dentist_id, patient_name, job_name, price, date_type, date, notes, is_paid, payment_date, created_by)
VALUES
('j1', 'd1', 'Carlos Mendes', 'Prótese Total', 1200.00, 'entrega', '2026-05-18', 'Acrilização rápida com dentes Trilux.', true, '2026-05-18', 'odontologo@precisao.com'),
('j2', 'd1', 'Marcos Oliveira', 'Ponte Fixa Metalocerâmica', 850.00, 'entrega', '2026-05-22', 'Checar cor A2 na escala Vita.', false, NULL, 'odontologo@precisao.com'),
('j3', 'd2', 'Beatriz Lima', 'Placa Miorrelaxante', 350.00, 'entrega', '2026-05-15', 'Placa acetato + acrílico prensada.', true, '2026-05-16', 'odontologo@precisao.com'),
('j4', 'd2', 'Juliana Costa', 'Incrustação Metálica (Onlay)', 450.00, 'entrega', '2026-05-22', 'Liga de Cromo-Cobalto.', false, NULL, 'odontologo@precisao.com'),
('j5', 'd3', 'Roberto Alencar', 'Protocolo Cerâmico s/ Implante', 4000.00, 'inicio', '2026-05-10', 'Aguardando prova de dentes.', false, NULL, 'odontologo@precisao.com'),
('j6', 'd1', 'Mariana Duarte', 'Carcaça de PPR Provisória', 600.00, 'entrega', '2026-05-22', 'Urgente para o final da tarde.', false, NULL, 'odontologo@precisao.com')
ON CONFLICT (id) DO NOTHING;

-- Seed default history records
INSERT INTO public.history_records (id, month, year, total_receber, total_recebido, notes, created_by)
VALUES
('h1', 4, 2026, 4800.00, 6200.00, 'Mês de alta demanda de próteses injetadas.', 'odontologo@precisao.com'),
('h2', 3, 2026, 3100.00, 5400.00, 'Fechamento tranquilo pós-carnaval.', 'odontologo@precisao.com'),
('h3', 2, 2026, 5200.00, 4900.00, 'Início do ano fiscal letivo com novos clientes.', 'odontologo@precisao.com')
ON CONFLICT (id) DO NOTHING;
