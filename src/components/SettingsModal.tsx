import React, { useState } from 'react';
import {
  X,
  Database,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Info,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut as supabaseSignOut } from '../supabaseClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncLocalData: () => Promise<void>;
  localStats: {
    sheets: number;
    sections: number;
    rows: number;
    workers: number;
  };
}

const SQL_SCHEMA = `-- COPY-PASTE THIS INTO YOUR SUPABASE SQL EDITOR TO CREATE TABLES

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
  invoice_url text,
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

-- Migration for existing databases (add new columns if upgrading)
alter table workers_breakdown add column if not exists full_amount numeric not null default 0;
alter table workers_breakdown add column if not exists paid_amount numeric not null default 0;
update workers_breakdown set full_amount = amount where full_amount = 0;
update workers_breakdown set paid_amount = amount where paid_amount = 0;

-- Storage bucket policies: Go to Supabase Dashboard → Storage → invoices bucket → Policies
-- Add the following policies manually (requires superuser, can't run via anon key):
--   SELECT: bucket_id = 'invoices' AND auth.email() = 'rcascalla1@gmail.com'
--   INSERT: bucket_id = 'invoices' AND auth.email() = 'rcascalla1@gmail.com'
--   DELETE: bucket_id = 'invoices' AND auth.email() = 'rcascalla1@gmail.com'

-- Enable Row Level Security (RLS)
alter table sheets enable row level security;
alter table sections enable row level security;
alter table rows enable row level security;
alter table workers_breakdown enable row level security;

-- Drop existing public policies
drop policy if exists "Allow public read" on sheets;
drop policy if exists "Allow public write" on sheets;
drop policy if exists "Allow public read" on sections;
drop policy if exists "Allow public write" on sections;
drop policy if exists "Allow public read" on rows;
drop policy if exists "Allow public write" on rows;
drop policy if exists "Allow public read" on workers_breakdown;
drop policy if exists "Allow public write" on workers_breakdown;

-- Create restricted policies (only rcascalla1@gmail.com)
create policy "Owner select" on sheets for select using (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner insert" on sheets for insert with check (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner update" on sheets for update using (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner delete" on sheets for delete using (auth.email() = 'rcascalla1@gmail.com');

create policy "Owner select" on sections for select using (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner insert" on sections for insert with check (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner update" on sections for update using (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner delete" on sections for delete using (auth.email() = 'rcascalla1@gmail.com');

create policy "Owner select" on rows for select using (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner insert" on rows for insert with check (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner update" on rows for update using (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner delete" on rows for delete using (auth.email() = 'rcascalla1@gmail.com');

create policy "Owner select" on workers_breakdown for select using (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner insert" on workers_breakdown for insert with check (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner update" on workers_breakdown for update using (auth.email() = 'rcascalla1@gmail.com');
create policy "Owner delete" on workers_breakdown for delete using (auth.email() = 'rcascalla1@gmail.com');`;

export default function SettingsModal({
  isOpen,
  onClose,
  onSyncLocalData,
  localStats,
}: SettingsModalProps) {
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!isOpen) return null;

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCHEMA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleSync = async () => {
    if (window.confirm(`Sync Local Database? This will upload all ${localStats.sheets} sheets, ${localStats.sections} sections, ${localStats.rows} rows, and employee records from your LocalStorage directly to Supabase. Existing items with matching IDs will be updated.`)) {
      setSyncing(true);
      try {
        await onSyncLocalData();
      } catch (err: any) {
        console.error('Sync error:', err);
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabaseSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-transparent"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 15 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative bg-white rounded-xl shadow-2xl border border-slate-200/80 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm leading-tight uppercase tracking-wide">
                  Settings
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Database sync & configuration</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
            {/* Active Status Banner */}
            <div className="p-4 rounded-xl border bg-emerald-50/55 border-emerald-200 text-emerald-800 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-75">
                  Connection Mode
                </span>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="font-bold text-xs">SUPABASE CONNECTED</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Your application is connected to your Supabase cloud backend.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>

            {/* Sync Tools */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-emerald-500" />
                Local-to-Cloud Sync
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Have sheets stored locally on your device? You can copy them straight to your cloud database in a single click.
              </p>

              <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-center text-xs font-mono">
                <div className="p-1 border-r border-slate-100">
                  <span className="block text-[9px] font-sans font-bold text-slate-400 uppercase">Sheets</span>
                  <span className="text-sm font-bold text-slate-800">{localStats.sheets}</span>
                </div>
                <div className="p-1">
                  <span className="block text-[9px] font-sans font-bold text-slate-400 uppercase">Sections</span>
                  <span className="text-sm font-bold text-slate-800">{localStats.sections}</span>
                </div>
                <div className="p-1 border-t border-r border-slate-100">
                  <span className="block text-[9px] font-sans font-bold text-slate-400 uppercase">Rows</span>
                  <span className="text-sm font-bold text-slate-800">{localStats.rows}</span>
                </div>
                <div className="p-1 border-t border-slate-100">
                  <span className="block text-[9px] font-sans font-bold text-slate-400 uppercase">Workers</span>
                  <span className="text-sm font-bold text-slate-800">{localStats.workers}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || localStats.sheets === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:hover:bg-emerald-300 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Uploading Files...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Push local data to cloud
                  </>
                )}
              </button>
            </div>

            {/* SQL Migration Instructions */}
            <div className="space-y-2 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-purple-500" />
                  Database Schema Script (SQL)
                </h4>
                <button
                  type="button"
                  onClick={handleCopySQL}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy SQL Migration
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Copy and run this script in your **Supabase Project &gt; SQL Editor** to create the tables and configure Row-Level Security rules:
              </p>
              <div className="relative rounded-lg overflow-hidden bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 h-40 overflow-y-auto p-4 custom-scrollbar select-all">
                <pre>{SQL_SCHEMA}</pre>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
              Signed in as rcascalla1@gmail.com
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
