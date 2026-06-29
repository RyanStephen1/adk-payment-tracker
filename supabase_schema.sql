-- COPY-PASTE THIS INTO YOUR SUPABASE SQL EDITOR TO CREATE TABLES

-- Reset sticky transaction read-only state
rollback;
set default_transaction_read_only = false;

-- 1. Sheets Table
create table if not exists sheets (
  id text primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Sections Table
create table if not exists sections (
  id text primary key,
  name text not null,
  sheet_id text references sheets(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Rows Table
create table if not exists rows (
  id text primary key,
  no text,
  company text,
  description text,
  duration text,
  full_amount numeric,
  paid_amount numeric,
  mode_of_payment text,
  location text,
  remarks text,
  section_id text references sections(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Workers Breakdown Table
create table if not exists workers_breakdown (
  id text primary key,
  row_id text references rows(id) on delete cascade,
  worker_name text not null,
  pay_date date,
  full_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  status text check (status in ('Pending', 'Paid')) not null,
  remarks text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migration: add full_amount/paid_amount for databases created with old schema (uses `amount`)
-- alter table workers_breakdown add column if not exists full_amount numeric not null default 0;
-- alter table workers_breakdown add column if not exists paid_amount numeric not null default 0;
-- update workers_breakdown set full_amount = amount where full_amount = 0;
-- update workers_breakdown set paid_amount = amount where paid_amount = 0;

-- Enable Row Level Security (RLS)
alter table sheets enable row level security;
alter table sections enable row level security;
alter table rows enable row level security;
alter table workers_breakdown enable row level security;

-- Create Public Access Policies (Allows read/write operations with your anon public key)
create policy "Allow public read" on sheets for select using (true);
create policy "Allow public write" on sheets for all using (true);

create policy "Allow public read" on sections for select using (true);
create policy "Allow public write" on sections for all using (true);

create policy "Allow public read" on rows for select using (true);
create policy "Allow public write" on rows for all using (true);

create policy "Allow public read" on workers_breakdown for select using (true);
create policy "Allow public write" on workers_breakdown for all using (true);

-- 5. Seed Initial Data (Restores all default sheets, sections, and rows including the lost Indirect & Other Projects sheet)

-- Insert Sheets
insert into sheets (id, name) values
('sheet-1', 'Direct Payroll (ADK)'),
('sheet-2', 'Indirect & Other Projects')
on conflict (id) do update set name = excluded.name;

-- Insert Sections
insert into sections (id, name, sheet_id) values
('sec-1', 'ADK CO LTD', 'sheet-1'),
('sec-2', 'ADK CO LTD', 'sheet-1'),
('sec-ind-1', 'ADK CO LTD', 'sheet-2'),
('sec-ind-2', 'KOREA RENTAL', 'sheet-2'),
('sec-ind-3', 'DSGC', 'sheet-2'),
('sec-ind-4', 'AKIK', 'sheet-2'),
('sec-ind-5', 'NABA', 'sheet-2'),
('sec-ind-6', 'NABA', 'sheet-2'),
('sec-ind-7', 'EXERA', 'sheet-2'),
('sec-ind-8', 'BOY', 'sheet-2'),
('sec-ind-9', 'EPCG', 'sheet-2'),
('sec-ind-10', 'FIZA', 'sheet-2'),
('sec-ind-11', 'DYNA RENTAL', 'sheet-2')
on conflict (id) do update set name = excluded.name, sheet_id = excluded.sheet_id;

-- Insert Rows
insert into rows (id, no, company, description, duration, full_amount, paid_amount, mode_of_payment, location, remarks, section_id) values
-- Sheet 1 rows
('row-1', '1', 'ADK DIRECT WORKERS', 'JANUARY 2026 PAYROLL/OT', 'JAN 01-31 2026', 34954.59, 3450.34, '', '', 'ADK SEPARATE NOT INCLUDED', 'sec-1'),
('row-2', '2', 'ADK DIRECT WORKERS', 'FEBRUARY 2026 PAYROLL/OT', 'FEB 01-28 2026', 34980.24, 0, '', '', '', 'sec-1'),
('row-3', '3', 'ADK DIRECT WORKERS', 'MARCH 2026 PAYROLL/OT', 'MAR 01-31 2026', 35048.41, 0, '', '', '', 'sec-1'),
('row-4', '2', 'ADK DIRECT WORKERS', 'APRIL 2026 PAYROLL/OT', 'APR 01-30 2026', null, null, '', '', '', 'sec-1'),
('row-5', '3', 'ADK DIRECT WORKERS', 'MAY 2026 PAYROLL/OT', 'MAY 01-31 2026', null, null, '', '', '', 'sec-1'),
('row-6', '4', 'ADK SEPARATE WORKERS', 'JANUARY 2026 PAYROLL/OT', 'JAN 01-31 2026', 39700.83, 16137.46, '', '', '', 'sec-2'),
('row-7', '5', 'ADK SEPARATE WORKERS', 'FEBRUARY 2026 PAYROLL/OT', 'FEB 01-28 2026', 29624.05, 0, '', '', '', 'sec-2'),
('row-8', '6', 'ADK SEPARATE WORKERS', 'MARCH 2026 PAYROLL/OT', 'MAR 01-31 2026', 21735.81, 0, '', '', '', 'sec-2'),
('row-9', '7', 'ADK DIRECT WORKERS', 'APRIL 2026 PAYROLL/OT', 'APR 01-30 2026', null, null, '', '', 'TO BE CALCULATED/SALARY RATE TO CONFIRM', 'sec-2'),
('row-10', '8', 'ADK DIRECT WORKERS', 'MAY 2026 PAYROLL/OT', 'MAY 01-31 2026', null, null, '', '', 'TO BE CALCULATED/SALARY RATE TO CONFIRM', 'sec-2'),

-- Sheet 2 rows (Indirect & Other Projects)
-- Section: ADK CO LTD (sec-ind-1)
('row-ind-1', '1', 'ADK CO LTD', 'DIRECT PAYROLL / OT ESTIMATE', 'JAN 01-31 2026', 55000.00, 0, '', '', '', 'sec-ind-1'),
('row-ind-2', '2', 'ADK CO LTD', 'DIRECT PAYROLL / OT ESTIMATE', 'FEB 01-28 2026', 60392.01, 0, '', '', '', 'sec-ind-1'),
('row-ind-3', '3', 'ADK CO LTD', 'DIRECT PAYROLL / OT ESTIMATE', 'MAR 01-31 2026', 50000.00, 0, '', '', '', 'sec-ind-1'),

-- Section: KOREA RENTAL (sec-ind-2)
('row-ind-4', '4', 'KOREA RENTAL', 'EQUIPMENT MONTHLY RENTAL', 'SEP 01-30 2025', 13954.81, 0, '', '', '', 'sec-ind-2'),
('row-ind-5', '5', 'KOREA RENTAL', 'EQUIPMENT MONTHLY RENTAL', 'OCT 01-31 2025', 20310.77, 0, '', '', '', 'sec-ind-2'),
('row-ind-6', '6', 'KOREA RENTAL', 'EQUIPMENT MONTHLY RENTAL', 'JAN 01-31 2026', 21896.44, 0, '', '', '', 'sec-ind-2'),
('row-ind-7', '7', 'KOREA RENTAL', 'EQUIPMENT MONTHLY RENTAL', 'FEB 01-28 2026', 15644.80, 0, '', '', '', 'sec-ind-2'),
('row-ind-8', '8', 'KOREA RENTAL', 'EQUIPMENT MONTHLY RENTAL', 'MAR 01-31 2026', 9104.17, 0, '', '', '', 'sec-ind-2'),
('row-ind-9', '8', 'KOREA RENTAL', 'EQUIPMENT MONTHLY RENTAL', 'APR 01-30 2026', 8866.06, 0, '', '', '', 'sec-ind-2'),

-- Section: DSGC (sec-ind-3)
('row-ind-10', '8', 'DSGC', 'PAYROLL SALARY & WAGES AND FOOD ALLOWANCE', 'SEP 01-30 2025', 100000.00, 0, '', '', 'BALANCE', 'sec-ind-3'),
('row-ind-11', '9', 'DSGC', 'PAYROLL SALARY & WAGES AND FOOD ALLOWANCE', 'OCT 01-31 2025', 84431.20, 0, '', '', '', 'sec-ind-3'),
('row-ind-12', '10', 'DSGC', 'DISCOVER STAR GENERAL CONTRACTING COMPANY', 'JAN 01-31 2026', 26893.90, 0, '', '', '', 'sec-ind-3'),

-- Section: AKIK (sec-ind-4)
('row-ind-13', '11', 'AKIK', 'AHMED KHALIL AL-KHALDI GENERAL CONT.', 'JAN 01-31 2026', 199132.85, 0, '', '', '', 'sec-ind-4'),
('row-ind-14', '12', 'AKIK', 'AHMED KHALIL AL-KHALDI GENERAL CONT.', 'FEB 01-28 2026', 93520.30, 0, '', '', '', 'sec-ind-4'),
('row-ind-15', '13', 'AKIK', 'AHMED KHALIL AL-KHALDI GENERAL CONT.', 'MAR 01-14 2026', 15203.00, 0, '', '', '', 'sec-ind-4'),

-- Section: NABA (sec-ind-5)
('row-ind-16', '14', 'NABA', 'ABBAS SERVICE CHARGE', 'JAN 01-31 2026', 2587.50, 0, '', '', 'BOSS APPROVED', 'sec-ind-5'),
('row-ind-17', '15', 'NABA', 'ABBAS SERVICE CHARGE', 'FEB 01-28 2026', 2587.50, 0, '', '', 'BOSS APPROVED', 'sec-ind-5'),
('row-ind-18', '16', 'NABA', 'ABBAS SERVICE CHARGE', 'MAR 01-31 2026', 2587.50, 0, '', '', '', 'sec-ind-5'),

-- Section: NABA 2 (sec-ind-6)
('row-ind-19', '17', 'NABA', 'ABBAS SERVICE CHARGE', 'APRIL 01-30 2026', 2587.50, 0, '', '', '', 'sec-ind-6'),
('row-ind-20', '18', 'NABA', 'ABBAS SERVICE CHARGE', 'MAY 01-31 2026', 2587.50, 0, '', '', '', 'sec-ind-6'),
('row-ind-21', '19', 'NABA', 'ABBAS SERVICE CHARGE', 'JUN 01-30 2026', 5175.00, 0, '', '', '', 'sec-ind-6'),
('row-ind-22', '20', 'NABA', 'ABBAS SERVICE CHARGE', 'JUL 01-31 2026', 5175.00, 0, '', '', '', 'sec-ind-6'),
('row-ind-23', '21', 'NABA', 'ABBAS SERVICE CHARGE', 'AUG 01-31 2026', 5175.00, 0, '', '', '', 'sec-ind-6'),

-- Section: EXERA (sec-ind-7)
('row-ind-24', '17', 'EXERA', 'SKIP RENTAL & GARBAGE SERVICES', 'JAN 01-31 2026', 1207.50, 0, '', '', 'BOSS APPROVED/TO BE RELEASED', 'sec-ind-7'),
('row-ind-25', '18', 'EXERA', 'SKIP RENTAL & GARBAGE SERVICES', 'FEB 01-28 2026', 1207.50, 0, '', '', '', 'sec-ind-7'),
('row-ind-26', '18', 'EXERA', 'SKIP RENTAL & GARBAGE SERVICES', 'FEB 01-28 2026', 1207.50, 0, '', '', '', 'sec-ind-7'),

-- Section: BOY (sec-ind-8)
('row-ind-27', '19', 'BOY', 'BOY GENERAL CONTRACTING', 'JAN 01-31 2026', 130336.40, 0, '', '', '', 'sec-ind-8'),
('row-ind-28', '20', 'BOY', 'BOY GENERAL CONTRACTING', 'FEB 01-28 2026', 33551.00, 0, '', '', '', 'sec-ind-8'),

-- Section: EPCG (sec-ind-9)
('row-ind-29', '21', 'EPCG', 'BUS RENTAL / COASTER', 'JAN 01-31 2026', 38418.57, 0, '', '', 'COASTER JAN AND FEBRUARY INVOICE', 'sec-ind-9'),
('row-ind-30', '22', 'EPCG', 'BUS RENTAL', 'FEB 01-28 2026', 19032.50, 0, '', '', '', 'sec-ind-9'),

-- Section: FIZA (sec-ind-10)
('row-ind-31', '23', 'FIZA', 'BUS RENTAL', 'MAR 13-31 2026', 9750.93, 0, '', '', '', 'sec-ind-10'),
('row-ind-32', '24', 'FIZA', 'FIZA MANPOWER', 'MAR 18-31 2026', 9660.00, 0, '', '', '', 'sec-ind-10'),

-- Section: DYNA RENTAL (sec-ind-11)
('row-ind-33', '25', 'DYNA RENTAL', 'EQUIPMENT MONTHLY RENTAL W/DRIVER', 'DEC 13-31 2025', 6054.62, 0, '', '', 'BOSS APPROVED', 'sec-ind-11'),
('row-ind-34', '26', 'DYNA RENTAL', 'EQUIPMENT MONTHLY RENTAL W/DRIVER', 'JAN 01-31 2026', 9000.00, 0, '', '', 'Deducted 300 SAR Food Allowance (CV-2269)', 'sec-ind-11'),
('row-ind-35', '27', 'DYNA RENTAL', 'EQUIPMENT MONTHLY RENTAL W/DRIVER', 'FEB 01-28 2026', 2300.00, 0, '', '', 'Cash Advance 6000 SAR (CV-2364)', 'sec-ind-11'),
('row-ind-36', '28', 'DYNA RENTAL', 'EQUIPMENT MONTHLY RENTAL W/DRIVER', 'MAR 01-31 2026', 3300.00, 0, '', '', 'Cash Advance 5000 SAR (CV-2477)', 'sec-ind-11')
on conflict (id) do update set
  no = excluded.no,
  company = excluded.company,
  description = excluded.description,
  duration = excluded.duration,
  full_amount = excluded.full_amount,
  paid_amount = excluded.paid_amount,
  mode_of_payment = excluded.mode_of_payment,
  location = excluded.location,
  remarks = excluded.remarks,
  section_id = excluded.section_id;
