import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Download,
  Plus,
  Trash2,
  Search,
  Edit3,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  DollarSign,
  CheckCircle,
  AlertCircle,
  FileDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid,
  Sparkles,
  Users,
  Database,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ExternalLink
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentRow, TableSection, ExcelSheet, WorkerBreakdownItem } from '../types';

// Sub-components
import AnalyticsPanel from './AnalyticsPanel';
import SettingsModal from './SettingsModal';
import CustomDialog from './CustomDialog';
import WorkerBreakdownModal from './WorkerBreakdownModal';

// Supabase helper
import { getSupabaseClient } from '../supabaseClient';

// Preset default values to populate database with exact screenshot items
const DEFAULT_SHEETS: ExcelSheet[] = [
  { id: 'sheet-1', name: 'Direct Payroll (ADK)' },
  { id: 'sheet-2', name: 'Indirect & Other Projects' }
];

const DEFAULT_SECTIONS: TableSection[] = [
  { id: 'sec-1', name: 'ADK CO LTD', sheetId: 'sheet-1' },
  { id: 'sec-2', name: 'ADK CO LTD', sheetId: 'sheet-1' }
];

const DEFAULT_ROWS: PaymentRow[] = [
  // Section 1 - ADK DIRECT WORKERS
  {
    id: 'row-1',
    no: '1',
    company: 'ADK DIRECT WORKERS',
    description: 'JANUARY 2026 PAYROLL/OT',
    duration: 'JAN 01-31 2026',
    fullAmount: 34954.59,
    paidAmount: 3450.34,
    modeOfPayment: '',
    location: '',
    remarks: 'ADK SEPARATE NOT INCLUDED',
    sectionId: 'sec-1'
  },
  {
    id: 'row-2',
    no: '2',
    company: 'ADK DIRECT WORKERS',
    description: 'FEBRUARY 2026 PAYROLL/OT',
    duration: 'FEB 01-28 2026',
    fullAmount: 34980.24,
    paidAmount: 0,
    modeOfPayment: '',
    location: '',
    remarks: '',
    sectionId: 'sec-1'
  },
  {
    id: 'row-3',
    no: '3',
    company: 'ADK DIRECT WORKERS',
    description: 'MARCH 2026 PAYROLL/OT',
    duration: 'MAR 01-31 2026',
    fullAmount: 35048.41,
    paidAmount: 0,
    modeOfPayment: '',
    location: '',
    remarks: '',
    sectionId: 'sec-1'
  },
  {
    id: 'row-4',
    no: '2',
    company: 'ADK DIRECT WORKERS',
    description: 'APRIL 2026 PAYROLL/OT',
    duration: 'APR 01-30 2026',
    fullAmount: null,
    paidAmount: null,
    modeOfPayment: '',
    location: '',
    remarks: '',
    sectionId: 'sec-1'
  },
  {
    id: 'row-5',
    no: '3',
    company: 'ADK DIRECT WORKERS',
    description: 'MAY 2026 PAYROLL/OT',
    duration: 'MAY 01-31 2026',
    fullAmount: null,
    paidAmount: null,
    modeOfPayment: '',
    location: '',
    remarks: '',
    sectionId: 'sec-1'
  },

  // Section 2 - ADK SEPARATE / DIRECT MIX
  {
    id: 'row-6',
    no: '4',
    company: 'ADK SEPARATE WORKERS',
    description: 'JANUARY 2026 PAYROLL/OT',
    duration: 'JAN 01-31 2026',
    fullAmount: 39700.83,
    paidAmount: 16137.46,
    modeOfPayment: '',
    location: '',
    remarks: '',
    sectionId: 'sec-2'
  },
  {
    id: 'row-7',
    no: '5',
    company: 'ADK SEPARATE WORKERS',
    description: 'FEBRUARY 2026 PAYROLL/OT',
    duration: 'FEB 01-28 2026',
    fullAmount: 29624.05,
    paidAmount: 0,
    modeOfPayment: '',
    location: '',
    remarks: '',
    sectionId: 'sec-2'
  },
  {
    id: 'row-8',
    no: '6',
    company: 'ADK SEPARATE WORKERS',
    description: 'MARCH 2026 PAYROLL/OT',
    duration: 'MAR 01-31 2026',
    fullAmount: 21735.81,
    paidAmount: 0,
    modeOfPayment: '',
    location: '',
    remarks: '',
    sectionId: 'sec-2'
  },
  {
    id: 'row-9',
    no: '7',
    company: 'ADK DIRECT WORKERS',
    description: 'APRIL 2026 PAYROLL/OT',
    duration: 'APR 01-30 2026',
    fullAmount: null,
    paidAmount: null,
    modeOfPayment: '',
    location: '',
    remarks: 'TO BE CALCULATED/SALARY RATE TO CONFIRM',
    sectionId: 'sec-2'
  },
  {
    id: 'row-10',
    no: '8',
    company: 'ADK DIRECT WORKERS',
    description: 'MAY 2026 PAYROLL/OT',
    duration: 'MAY 01-31 2026',
    fullAmount: null,
    paidAmount: null,
    modeOfPayment: '',
    location: '',
    remarks: 'TO BE CALCULATED/SALARY RATE TO CONFIRM',
    sectionId: 'sec-2'
  }
];

export default function ExcelTracker() {
  // Local cache loaded states (Fallback layer)
  const [sheets, setSheets] = useState<ExcelSheet[]>(() => {
    const saved = localStorage.getItem('payment_sheets');
    return saved ? JSON.parse(saved) : DEFAULT_SHEETS;
  });

  const [activeSheetId, setActiveSheetId] = useState<string>(() => {
    const saved = localStorage.getItem('active_sheet_id');
    return saved ? JSON.parse(saved) : 'sheet-1';
  });

  const [monthFilter, setMonthFilter] = useState<string>('All');

  const [sections, setSections] = useState<TableSection[]>(() => {
    const saved = localStorage.getItem('payment_sections');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_SECTIONS;
    return parsed.map((sec: TableSection) => ({
      ...sec,
      sheetId: sec.sheetId || 'sheet-1'
    }));
  });

  const migrateWorker = (w: any) => ({
    ...w,
    fullAmount: w.fullAmount ?? w.amount ?? 0,
    paidAmount: w.paidAmount ?? 0,
  });
  const [rows, setRows] = useState<PaymentRow[]>(() => {
    const saved = localStorage.getItem('payment_rows');
    const parsed: PaymentRow[] = saved ? JSON.parse(saved) : DEFAULT_ROWS;
    return parsed.map(r => ({
      ...r,
      workersBreakdown: r.workersBreakdown?.map(migrateWorker),
    }));
  });

  // Restore invoice URLs from separate localStorage key on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('payment_invoice_urls');
      if (saved) {
        const urls: Record<string, string> = JSON.parse(saved);
        setRows(prev => prev.map(r => urls[r.id] ? { ...r, invoiceUrl: urls[r.id] } : r));
      }
    } catch (e) {
      console.warn('Failed to restore invoice URLs:', e);
    }
  }, []);

  // DB connection states
  const dbConnected = true;
  const [isDbLoading, setIsDbLoading] = useState(false);
  const connectionError: string | null = null;
  const setDbConnected = (_v: boolean) => {};
  const setConnectionError = (_v: string | null) => {};

  // Settings & toast states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  // Dialog configurations
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'prompt' | 'confirm' | 'danger';
    title: string;
    message?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    onConfirm: (val?: string) => void;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    onConfirm: () => { },
  });

  // Export currency config
  const currencySymbol = 'SAR';

  // Workers breakdown modal states
  const [breakdownModalRowId, setBreakdownModalRowId] = useState<string | null>(null);

  // Block selector for PDF export
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [pdfFormat, setPdfFormat] = useState<'A3' | 'A4'>('A4');
  const [pdfMonthFilter, setPdfMonthFilter] = useState('All');
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);

  // Download menu dropdown state
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Interactive editing cell states
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: keyof PaymentRow } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [durationFrom, setDurationFrom] = useState('');
  const [durationTo, setDurationTo] = useState('');
  const [addingRowToSection, setAddingRowToSection] = useState<string | null>(null);

  // Global row creation modal states
  const [showGlobalAddRowModal, setShowGlobalAddRowModal] = useState(false);
  const [globalAddRowSectionId, setGlobalAddRowSectionId] = useState('');

  // Drag to scroll states
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  // New row form state
  const [newRowData, setNewRowData] = useState<Omit<PaymentRow, 'id' | 'sectionId'>>({
    no: '',
    company: '',
    description: '',
    duration: '',
    fullAmount: null,
    paidAmount: null,
    modeOfPayment: '',
    location: '',
    remarks: ''
  });

  // Filter and Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'FullyPaid' | 'Uncalculated'>('All');

  // Ref for captures
  const spreadsheetRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Close download menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-save to localStorage (always runs as secondary cache/offline mode)
  useEffect(() => {
    try {
      localStorage.setItem('payment_sheets', JSON.stringify(sheets));
    } catch (e) {
      console.warn('localStorage sheets save failed:', e);
    }
  }, [sheets]);

  useEffect(() => {
    localStorage.setItem('active_sheet_id', JSON.stringify(activeSheetId));
  }, [activeSheetId]);

  useEffect(() => {
    try {
      localStorage.setItem('payment_sections', JSON.stringify(sections));
    } catch (e) {
      console.warn('localStorage sections save failed:', e);
    }
  }, [sections]);

  useEffect(() => {
    try {
      localStorage.setItem('payment_rows', JSON.stringify(rows.map(({ invoiceUrl, ...rest }) => rest)));
    } catch (e) {
      console.warn('localStorage save failed (quota exceeded?):', e);
    }
  }, [rows]);

  useEffect(() => {
    try {
      const urls: Record<string, string> = {};
      rows.forEach(r => { if (r.invoiceUrl) urls[r.id] = r.invoiceUrl; });
      if (Object.keys(urls).length > 0) {
        localStorage.setItem('payment_invoice_urls', JSON.stringify(urls));
      }
    } catch (e) {
      console.warn('localStorage invoice URLs save failed:', e);
    }
  }, [rows]);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Supabase Loader
  const loadDataFromSupabase = async () => {
    const client = getSupabaseClient();
    if (!client) return false;

    setIsDbLoading(true);
    setConnectionError(null);
    try {
      // Check if tables exist before querying
      const { error: checkError } = await client.from('sheets').select('id').limit(1);
      if (checkError && (
        checkError.code === 'PGRST116' ||
        checkError.code === '42P01' ||
        checkError.code === '404' ||
        (checkError.message && checkError.message.includes('Could not find the table'))
      )) {
        setConnectionError('Schema mismatch: database tables do not exist yet. Please run the SQL migration script in your Supabase SQL Editor.');
        setIsDbLoading(false);
        return false;
      }

      // 1. Fetch sheets
      const { data: dbSheets, error: sheetsError } = await client
        .from('sheets')
        .select('*')
        .order('created_at', { ascending: true });

      if (sheetsError) throw sheetsError;

      // 2. Fetch sections
      const { data: dbSections, error: sectionsError } = await client
        .from('sections')
        .select('*')
        .order('created_at', { ascending: true });

      if (sectionsError) throw sectionsError;

      // 3. Fetch rows
      const { data: dbRows, error: rowsError } = await client
        .from('rows')
        .select('*')
        .order('created_at', { ascending: true });

      if (rowsError) throw rowsError;

      // 4. Fetch workers breakdown
      const { data: dbWorkers, error: workersError } = await client
        .from('workers_breakdown')
        .select('*')
        .order('created_at', { ascending: true });

      if (workersError) throw workersError;

      // If remote database has no sheets, it is completely empty.
      // Auto-populate it with the default layout and records.
      if (!dbSheets || dbSheets.length === 0) {
        showToast("Database is empty. Auto-populating default records...", "info");
        try {
          await client.from('sheets').insert(DEFAULT_SHEETS);
          await client.from('sections').insert(DEFAULT_SECTIONS.map(s => ({ id: s.id, name: s.name, sheet_id: s.sheetId })));
          await client.from('rows').insert(DEFAULT_ROWS.map(r => ({
            id: r.id,
            no: r.no,
            company: r.company,
            description: r.description,
            duration: r.duration,
            full_amount: r.fullAmount,
            paid_amount: r.paidAmount,
            mode_of_payment: r.modeOfPayment,
            location: r.location,
            remarks: r.remarks,
            section_id: r.sectionId
          })));
          showToast("Database auto-population complete!", "success");
        } catch (insertErr) {
          console.error("Auto-population error:", insertErr);
          showToast("Database auto-population failed.", "error");
        }
        setDbConnected(true);
        // Recursively reload to fetch the newly inserted data
        setTimeout(() => loadDataFromSupabase(), 500);
        return true;
      }

      // Backup local data to local storage backup keys before applying remote data
      const currentSheets = localStorage.getItem('payment_sheets');
      const currentSections = localStorage.getItem('payment_sections');
      const currentRows = localStorage.getItem('payment_rows');
      if (currentSheets) localStorage.setItem('payment_sheets_backup', currentSheets);
      if (currentSections) localStorage.setItem('payment_sections_backup', currentSections);
      if (currentRows) localStorage.setItem('payment_rows_backup', currentRows);

      // Update local states with cloud contents
      const mappedSheets = dbSheets.map(s => ({ id: s.id, name: s.name }));
      setSheets(mappedSheets);
      const savedActive = localStorage.getItem('active_sheet_id');
      const parsedActive = savedActive ? JSON.parse(savedActive) : null;
      if (parsedActive && mappedSheets.some(s => s.id === parsedActive)) {
        setActiveSheetId(parsedActive);
      } else {
        setActiveSheetId(mappedSheets[0].id);
      }

      if (dbSections) {
        setSections(dbSections.map(s => ({
          id: s.id,
          name: s.name,
          sheetId: s.sheet_id
        })));
      }

      if (dbRows) {
        const localUrls: Record<string, string> = {};
        try {
          const saved = localStorage.getItem('payment_invoice_urls');
          if (saved) Object.assign(localUrls, JSON.parse(saved));
        } catch (_) {}
        const mappedRows = dbRows.map(row => ({
          id: row.id,
          no: row.no || '',
          company: row.company || '',
          description: row.description || '',
          duration: row.duration || '',
          fullAmount: row.full_amount !== null ? Number(row.full_amount) : null,
          paidAmount: row.paid_amount !== null ? Number(row.paid_amount) : null,
          modeOfPayment: row.mode_of_payment || '',
          location: row.location || '',
          remarks: row.remarks || '',
          invoiceUrl: localUrls[row.id] || row.invoice_url || '',
          sectionId: row.section_id,
          workersBreakdown: (dbWorkers || [])
            .filter(w => w.row_id === row.id)
            .map(w => migrateWorker({
              id: w.id,
              workerName: w.worker_name,
              payDate: w.pay_date || '',
              fullAmount: w.full_amount ?? Number(w.amount ?? 0),
              paidAmount: w.paid_amount ?? 0,
              status: w.status as 'Pending' | 'Paid',
              remarks: w.remarks || ''
            }))
        }));
        // Merge local rows into remote — keep local when values differ (unsaved edits)
        setRows(prevRows => {
          const merged = new Map(mappedRows.map(r => [r.id, r]));
          for (const local of prevRows) {
            const remote = merged.get(local.id);
            if (!remote) {
              // Row exists only locally (not yet synced)
              merged.set(local.id, local);
            } else if (local.paidAmount !== remote.paidAmount || local.fullAmount !== remote.fullAmount) {
              // Local has unsaved changes — keep local version
              merged.set(local.id, local);
            }
          }
          return Array.from(merged.values());
        });
      }

      setDbConnected(true);
      return true;
    } catch (err: any) {
      console.error("Failed to load data from Supabase:", err);
      setConnectionError(err.message || "Unknown database fetch error.");
      setDbConnected(false);
      return false;
    } finally {
      setIsDbLoading(false);
    }
  };

  // Initial data load from Supabase
  useEffect(() => {
    const init = async () => {
      await loadDataFromSupabase();
      showToast("Synced with database", "success");
      setupRealtimeSubscriptions();
    };
    init();
    return () => {
      const client = getSupabaseClient();
      if (client) {
        client.removeAllChannels();
      }
    };
  }, []);

  const setupRealtimeSubscriptions = () => {
    const client = getSupabaseClient();
    if (!client) return;

    const upsertState = <T extends { id: string }>(prev: T[], incoming: T): T[] => {
      const idx = prev.findIndex(x => x.id === incoming.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = incoming;
        return copy;
      }
      return [incoming, ...prev];
    };

    const subscribeTable = (table: string, onUpdate: (payload: any) => void) => {
      client
        .channel(`realtime-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          onUpdate(payload);
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`Realtime subscription failed for ${table}: ${status}`);
          }
        });
    };

    subscribeTable('sheets', (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setSheets(prev => upsertState(prev, { id: payload.new.id, name: payload.new.name }));
      } else if (payload.eventType === 'DELETE') {
        setSheets(prev => prev.filter(s => s.id !== payload.old.id));
      }
    });

    subscribeTable('sections', (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setSections(prev => upsertState(prev, {
          id: payload.new.id,
          name: payload.new.name,
          sheetId: payload.new.sheet_id || 'sheet-1'
        }));
      } else if (payload.eventType === 'DELETE') {
        setSections(prev => prev.filter(s => s.id !== payload.old.id));
      }
    });

    subscribeTable('rows', (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setRows(prev => upsertState(prev, {
          id: payload.new.id,
          no: payload.new.no || '',
          company: payload.new.company || '',
          description: payload.new.description || '',
          duration: payload.new.duration || '',
          fullAmount: payload.new.full_amount ?? null,
          paidAmount: payload.new.paid_amount ?? null,
          modeOfPayment: payload.new.mode_of_payment || '',
          location: payload.new.location || '',
          remarks: payload.new.remarks || '',
          sectionId: payload.new.section_id,
          workersBreakdown: prev.find(r => r.id === payload.new.id)?.workersBreakdown || []
        }));
      } else if (payload.eventType === 'DELETE') {
        setRows(prev => prev.filter(r => r.id !== payload.old.id));
      }
    });

    subscribeTable('workers_breakdown', (payload) => {
      setRows(prev => prev.map(r => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const w = {
            id: payload.new.id,
            workerName: payload.new.worker_name,
            payDate: payload.new.pay_date || '',
            fullAmount: Number(payload.new.full_amount ?? payload.new.amount ?? 0),
            paidAmount: Number(payload.new.paid_amount ?? 0),
            status: payload.new.status as 'Pending' | 'Paid',
            remarks: payload.new.remarks || ''
          };
          if (r.id === payload.new.row_id) {
            const existing = r.workersBreakdown || [];
            const idx = existing.findIndex(x => x.id === w.id);
            if (idx >= 0) {
              const copy = [...existing];
              copy[idx] = w;
              return { ...r, workersBreakdown: copy };
            }
            return { ...r, workersBreakdown: [...existing, w] };
          }
        } else if (payload.eventType === 'DELETE') {
          if (r.id === payload.old.row_id) {
            return { ...r, workersBreakdown: (r.workersBreakdown || []).filter(w => w.id !== payload.old.id) };
          }
        }
        return r;
      }));
    });
  };

  const handleReconnect = async (): Promise<boolean> => {
    try {
      await loadDataFromSupabase();
      return true;
    } catch {
      return false;
    }
  };

  const handleSyncLocalData = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    // Check schema exists before attempting upsert
    const { error: schemaCheck } = await client.from('sheets').select('id').limit(1);
    if (schemaCheck && (
      schemaCheck.code === 'PGRST116' ||
      schemaCheck.code === '42P01' ||
      schemaCheck.code === '404' ||
      (schemaCheck.message && schemaCheck.message.includes('Could not find the table'))
    )) {
      const msg = "Database tables do not exist. Please run the SQL migration script in your Supabase SQL Editor first.";
      showToast(msg, 'error');
      throw new Error(msg);
    }

    try {
      // Upsert Sheets
      if (sheets.length > 0) {
        const { error: errorSheets } = await client.from('sheets').upsert(
          sheets.map(s => ({ id: s.id, name: s.name }))
        );
        if (errorSheets) throw errorSheets;
      }

      // Upsert Sections
      if (sections.length > 0) {
        const { error: errorSections } = await client.from('sections').upsert(
          sections.map(s => ({ id: s.id, name: s.name, sheet_id: s.sheetId || 'sheet-1' }))
        );
        if (errorSections) throw errorSections;
      }

      // Upsert Rows
      if (rows.length > 0) {
        const { error: errorRows } = await client.from('rows').upsert(
          rows.map(r => ({
            id: r.id,
            no: r.no,
            company: r.company,
            description: r.description,
            duration: r.duration,
            full_amount: r.fullAmount,
            paid_amount: r.paidAmount,
            mode_of_payment: r.modeOfPayment,
            location: r.location,
            remarks: r.remarks,
            section_id: r.sectionId
          }))
        );
        if (errorRows) throw errorRows;
      }

      // Upsert Worker Items
      const workersData: any[] = [];
      rows.forEach(r => {
        if (r.workersBreakdown && r.workersBreakdown.length > 0) {
          r.workersBreakdown.forEach(w => {
            workersData.push({
              id: w.id,
              row_id: r.id,
              worker_name: w.workerName,
              pay_date: w.payDate || null,
              amount: w.fullAmount,
              full_amount: w.fullAmount,
              paid_amount: w.paidAmount,
              status: w.status,
              remarks: w.remarks
            });
          });
        }
      });

      if (workersData.length > 0) {
        const { error: errorWorkers } = await client.from('workers_breakdown').upsert(workersData);
        if (errorWorkers) throw errorWorkers;
      }

      showToast("Sync completed! Data uploaded.", 'success');
      await loadDataFromSupabase();
    } catch (e: any) {
      console.error("Sync error:", e);
      const isMissingTable = e.message && (
        e.message.includes('Could not find the table') ||
        e.message.includes('relation') ||
        e.code === '42P01'
      );
      const friendlyMsg = isMissingTable
        ? "Database tables do not exist. Go to Settings and run the SQL migration script in your Supabase SQL Editor."
        : (e.message || "Sync failed. Check database logs.");
      showToast(friendlyMsg, 'error');
      throw new Error(friendlyMsg);
    }
  };

  // Cell single-click select or editing start
  const startEditing = (rowId: string, field: keyof PaymentRow, value: any) => {
    setEditingCell({ rowId, field });
    setEditValue(value === null || value === undefined ? '' : String(value));
  };

  const saveCell = async () => {
    if (!editingCell) return;
    const { rowId, field } = editingCell;

    let finalParsedValue: any = null;
    const modifiedRows: Array<{ id: string; updates: Record<string, any> }> = [];

    setRows(prevRows => {
      const currentRow = prevRows.find(r => r.id === rowId);
      if (!currentRow) return prevRows;

      let parsedValue: any = editValue;
      if (field === 'duration') {
        parsedValue = formatDuration(durationFrom, durationTo) || editValue;
      } else if (field === 'fullAmount' || field === 'paidAmount') {
        if (editValue.trim() === '') {
          parsedValue = null;
        } else {
          const num = parseFloat(editValue.replace(/,/g, ''));
          parsedValue = isNaN(num) ? null : num;
        }
      }
      finalParsedValue = parsedValue;

      // Overpayment rollover: when paidAmount exceeds fullAmount, carry excess to next rows in block
      if (field === 'paidAmount' && parsedValue !== null && currentRow.fullAmount !== null && parsedValue > currentRow.fullAmount) {
        console.log(`[Rollover] paidAmount=${parsedValue} > fullAmount=${currentRow.fullAmount}, excess=${parsedValue - currentRow.fullAmount}, sectionId=${currentRow.sectionId}`);
        const excess = parsedValue - currentRow.fullAmount;

        // Get section rows sorted by their `no` field
        const sectionRows = prevRows
          .filter(r => r.sectionId === currentRow.sectionId)
          .sort((a, b) => {
            const aNum = parseFloat(a.no);
            const bNum = parseFloat(b.no);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return (a.no || '').localeCompare(b.no || '');
          });

        const currentIdx = sectionRows.findIndex(r => r.id === rowId);
        let remaining = excess;

        modifiedRows.push({ id: rowId, updates: { paid_amount: currentRow.fullAmount } });

        console.log(`[Rollover] sectionRows count=${sectionRows.length}, currentIdx=${currentIdx}, rows:`, sectionRows.map(r => ({ id: r.id, no: r.no, fullAmount: r.fullAmount, paidAmount: r.paidAmount })));
        return prevRows.map(row => {
          // Cap current row at fullAmount
          if (row.id === rowId) {
            console.log(`[Rollover] Capping row ${row.id} paidAmount: ${row.paidAmount} -> ${currentRow.fullAmount}`);
            return { ...row, paidAmount: currentRow.fullAmount };
          }
          // Distribute excess to subsequent rows in the same section
          const secIdx = sectionRows.findIndex(r => r.id === row.id);
          if (secIdx > currentIdx && remaining > 0 && row.sectionId === currentRow.sectionId) {
            const rowFull = row.fullAmount || 0;
            const rowPaid = row.paidAmount || 0;
            const rowRemaining = Math.max(0, rowFull - rowPaid);
            if (rowRemaining > 0) {
              const toAdd = Math.min(remaining, rowRemaining);
              remaining -= toAdd;
              console.log(`[Rollover] Adding ${toAdd} to row ${row.id} (no=${row.no}), paidAmount: ${rowPaid} -> ${rowPaid + toAdd}, remaining excess still: ${remaining}`);
              modifiedRows.push({ id: row.id, updates: { paid_amount: rowPaid + toAdd } });
              return { ...row, paidAmount: rowPaid + toAdd };
            } else {
              console.log(`[Rollover] Skipping row ${row.id} (no=${row.no}), rowRemaining=${rowRemaining} <= 0`);
            }
          }
          return row;
        });
      }

      // Normal single-row update (no rollover)
      const dbField = field === 'fullAmount'
        ? 'full_amount'
        : field === 'paidAmount'
          ? 'paid_amount'
          : field === 'modeOfPayment'
            ? 'mode_of_payment'
            : field === 'sectionId'
              ? 'section_id'
              : field;
      modifiedRows.push({ id: rowId, updates: { [dbField]: parsedValue } });
      return prevRows.map(row =>
        row.id === rowId ? { ...row, [field]: parsedValue } : row
      );
    });

    const hadRollover = modifiedRows.length > 1;
    setEditingCell(null);
    setDurationFrom('');
    setDurationTo('');

    if (hadRollover) {
      showToast("Overpayment detected! Excess distributed to next entries in block.", 'success');
    }

    // Force persist to localStorage immediately so it survives reload
    try {
      const currentRows = JSON.parse(localStorage.getItem('payment_rows') || '[]');
      const rowsMap = new Map(currentRows.map((r: any) => [r.id, r]));
      for (const mod of modifiedRows) {
        const existing = rowsMap.get(mod.id);
        if (existing) {
          rowsMap.set(mod.id, { ...existing, ...mod.updates });
        }
      }
      localStorage.setItem('payment_rows', JSON.stringify(Array.from(rowsMap.values())));
    } catch (_) {}

    // Sync all modified rows to Supabase
    let supabaseFailed = false;
    if (dbConnected && modifiedRows.length > 0) {
      const client = getSupabaseClient();
      if (client) {
        for (const mod of modifiedRows) {
          try {
            const { error } = await client.from('rows').update(mod.updates).eq('id', mod.id);
            if (error) throw error;
          } catch (e) {
            console.error("Supabase update error:", e);
            supabaseFailed = true;
          }
        }
      }
    }
    if (supabaseFailed) {
      showToast("Offline update cached. DB sync failed.", 'info');
    }
  };

  // Keyboard controls in grids
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveCell();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Sheets management triggers
  const handleCreateSheet = () => {
    setDialogConfig({
      isOpen: true,
      type: 'prompt',
      title: 'Create New Worksheet',
      message: 'Enter a name for the new Sheet (e.g., "Indirect Payroll", "Special Projects"):',
      defaultValue: '',
      placeholder: 'Sheet name...',
      onConfirm: async (val) => {
        if (!val || !val.trim()) return;
        const name = val.trim();
        const sheetId = `sheet-${Date.now()}`;
        const newSheet: ExcelSheet = { id: sheetId, name };

        const sectionId = `sec-${Date.now()}`;
        const defaultSection: TableSection = {
          id: sectionId,
          name: `${name.toUpperCase()} SECTION`,
          sheetId: sheetId
        };

        setSheets(prev => [...prev, newSheet]);
        setSections(prev => [...prev, defaultSection]);
        setActiveSheetId(sheetId);
        showToast(`Created worksheet "${name}"`, 'success');

        if (dbConnected) {
          const client = getSupabaseClient();
          if (client) {
            try {
              await client.from('sheets').insert({ id: sheetId, name });
              await client.from('sections').insert({ id: sectionId, name: `${name.toUpperCase()} SECTION`, sheet_id: sheetId });
            } catch (e) {
              console.error(e);
              showToast("Failed to sync sheet block to cloud.", 'error');
            }
          }
        }
      }
    });
  };

  const handleRenameSheet = (sheetId: string) => {
    const target = sheets.find(s => s.id === sheetId);
    if (!target) return;

    setDialogConfig({
      isOpen: true,
      type: 'prompt',
      title: 'Rename Worksheet',
      message: `Enter new name for the worksheet "${target.name}":`,
      defaultValue: target.name,
      placeholder: 'New sheet name...',
      onConfirm: async (val) => {
        if (!val || !val.trim()) return;
        const newName = val.trim();
        setSheets(prev => prev.map(s => s.id === sheetId ? { ...s, name: newName } : s));
        showToast(`Renamed worksheet to "${newName}"`, 'success');

        if (dbConnected) {
          const client = getSupabaseClient();
          if (client) {
            try {
              await client.from('sheets').update({ name: newName }).eq('id', sheetId);
            } catch (e) {
              console.error(e);
              showToast("Failed to sync rename block to cloud.", 'error');
            }
          }
        }
      }
    });
  };

  const handleDeleteSheet = (sheetId: string) => {
    if (sheets.length <= 1) {
      showToast('Cannot delete the only sheet. You must keep at least one sheet.', 'error');
      return;
    }
    const target = sheets.find(s => s.id === sheetId);
    if (!target) return;

    setDialogConfig({
      isOpen: true,
      type: 'danger',
      title: 'Delete Sheet Block',
      message: `Delete "${target.name}"? This will permanently delete this sheet, its section blocks, and all contained payroll rows.`,
      confirmText: 'Delete Permanently',
      onConfirm: async () => {
        const remainingSheets = sheets.filter(s => s.id !== sheetId);
        setSheets(remainingSheets);

        const sectionsInSheet = sections.filter(sec => (sec.sheetId || 'sheet-1') === sheetId).map(s => s.id);
        setSections(sections.filter(sec => (sec.sheetId || 'sheet-1') !== sheetId));
        setRows(rows.filter(row => !sectionsInSheet.includes(row.sectionId)));

        showToast(`Deleted worksheet "${target.name}"`, 'info');

        if (activeSheetId === sheetId) {
          setActiveSheetId(remainingSheets[0].id);
        }

        if (dbConnected) {
          const client = getSupabaseClient();
          if (client) {
            try {
              await client.from('sheets').delete().eq('id', sheetId);
            } catch (e) {
              console.error(e);
              showToast("Failed to delete sheet block from cloud.", 'error');
            }
          }
        }
      }
    });
  };

  // Section Blocks Management Triggers
  const handleAddSection = () => {
    setDialogConfig({
      isOpen: true,
      type: 'prompt',
      title: 'Create New Section Block',
      message: 'Enter title name for the new block section (e.g., "ADK CO LTD", "AL-SAFA ENTERPRISE"):',
      defaultValue: '',
      placeholder: 'Section block title...',
      onConfirm: async (val) => {
        if (!val || !val.trim()) return;
        const name = val.trim();
        const newSection: TableSection = {
          id: `sec-${Date.now()}`,
          name,
          sheetId: activeSheetId
        };
        setSections(prev => [...prev, newSection]);
        showToast(`Created block "${name}"`, 'success');

        if (dbConnected) {
          const client = getSupabaseClient();
          if (client) {
            try {
              await client.from('sections').insert({ id: newSection.id, name: newSection.name, sheet_id: newSection.sheetId });
            } catch (e) {
              console.error(e);
              showToast("Failed to sync new block to database.", 'error');
            }
          }
        }
      }
    });
  };

  const handleRenameSection = (sectionId: string) => {
    const currentSection = sections.find(s => s.id === sectionId);
    if (!currentSection) return;

    setDialogConfig({
      isOpen: true,
      type: 'prompt',
      title: 'Rename Block Section',
      message: `Enter new name for block "${currentSection.name}":`,
      defaultValue: currentSection.name,
      placeholder: 'New block title...',
      onConfirm: async (val) => {
        if (!val || !val.trim()) return;
        const newName = val.trim();
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: newName } : s));
        showToast(`Renamed block to "${newName}"`, 'success');

        if (dbConnected) {
          const client = getSupabaseClient();
          if (client) {
            try {
              await client.from('sections').update({ name: newName }).eq('id', sectionId);
            } catch (e) {
              console.error(e);
              showToast("Failed to rename section in database.", 'error');
            }
          }
        }
      }
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    const currentSection = sections.find(s => s.id === sectionId);
    if (!currentSection) return;

    setDialogConfig({
      isOpen: true,
      type: 'danger',
      title: 'Delete Section Block',
      message: `Are you sure you want to delete "${currentSection.name}"? All rows inside this block will be deleted.`,
      confirmText: 'Delete Block',
      onConfirm: async () => {
        setSections(prev => prev.filter(s => s.id !== sectionId));
        setRows(prev => prev.filter(r => r.sectionId !== sectionId));
        showToast(`Deleted section block "${currentSection.name}"`, 'info');

        if (dbConnected) {
          const client = getSupabaseClient();
          if (client) {
            try {
              await client.from('sections').delete().eq('id', sectionId);
            } catch (e) {
              console.error(e);
              showToast("Failed to delete section from database.", 'error');
            }
          }
        }
      }
    });
  };

  // Row operations triggers
  const submitNewRow = async (sectionId: string) => {
    const id = `row-${Date.now()}`;
    const targetRows = rows.filter(r => r.sectionId === sectionId);
    const calculatedNo = newRowData.no || String(targetRows.length + 1);

    const newRow: PaymentRow = {
      ...newRowData,
      id,
      sectionId,
      no: calculatedNo
    };

    setRows(prev => [...prev, newRow]);
    setAddingRowToSection(null);
    setNewRowData({
      no: '',
      company: '',
      description: '',
      duration: '',
      fullAmount: null,
      paidAmount: null,
      modeOfPayment: '',
      location: '',
      remarks: ''
    });
    showToast("Added new registry row", 'success');

    if (dbConnected) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { error } = await client.from('rows').insert({
            id: newRow.id,
            no: newRow.no,
            company: newRow.company,
            description: newRow.description,
            duration: newRow.duration,
            full_amount: newRow.fullAmount,
            paid_amount: newRow.paidAmount,
            mode_of_payment: newRow.modeOfPayment,
            location: newRow.location,
            remarks: newRow.remarks,
            section_id: newRow.sectionId
          });
          if (error) throw error;
        } catch (e) {
          console.error("Row add sync error:", e);
          showToast("Failed to write row to cloud.", 'error');
        }
      }
    }
  };

  const duplicateRow = async (row: PaymentRow) => {
    const newId = `row-${Date.now()}`;
    const duplicated: PaymentRow = {
      ...row,
      id: newId,
      no: String((parseInt(row.no) || 0) + 1)
    };

    const index = rows.findIndex(r => r.id === row.id);
    const newRows = [...rows];
    newRows.splice(index + 1, 0, duplicated);
    setRows(newRows);
    showToast(`Duplicated row successfully`, 'success');

    if (dbConnected) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { error } = await client.from('rows').insert({
            id: duplicated.id,
            no: duplicated.no,
            company: duplicated.company,
            description: duplicated.description,
            duration: duplicated.duration,
            full_amount: duplicated.fullAmount,
            paid_amount: duplicated.paidAmount,
            mode_of_payment: duplicated.modeOfPayment,
            location: duplicated.location,
            remarks: duplicated.remarks,
            section_id: duplicated.sectionId
          });
          if (error) throw error;

          if (row.workersBreakdown && row.workersBreakdown.length > 0) {
            const list = row.workersBreakdown.map(w => ({
              id: `w-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              row_id: newId,
              worker_name: w.workerName,
              pay_date: w.payDate || null,
              amount: w.fullAmount,
              full_amount: w.fullAmount,
              paid_amount: w.paidAmount,
              status: w.status,
              remarks: w.remarks
            }));
            const { error: wErr } = await client.from('workers_breakdown').insert(list);
            if (wErr) throw wErr;
          }
        } catch (e) {
          console.error("Duplicate sync error:", e);
          showToast("Failed to write duplicate to database.", 'error');
        }
      }
    }
  };

  const triggerDeleteRow = (rowId: string, company: string) => {
    setDialogConfig({
      isOpen: true,
      type: 'danger',
      title: 'Delete Registry Row',
      message: `Are you sure you want to delete row entries for "${company}"? This will delete all worker breakdowns and notes inside this row.`,
      confirmText: 'Delete Row',
      onConfirm: async () => {
        setRows(prev => prev.filter(r => r.id !== rowId));
        showToast("Deleted payment row", 'info');

        if (dbConnected) {
          const client = getSupabaseClient();
          if (client) {
            try {
              await client.from('rows').delete().eq('id', rowId);
            } catch (e) {
              console.error(e);
              showToast("Failed to delete row from database.", 'error');
            }
          }
        }
      }
    });
  };

  // Mouse Drag to Scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const slider = spreadsheetRef.current;
    if (!slider) return;
    setIsDown(true);
    slider.style.cursor = 'grabbing';
    setStartX(e.pageX - slider.offsetLeft);
    setScrollLeftState(slider.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDown(false);
    if (spreadsheetRef.current) {
      spreadsheetRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseUp = () => {
    setIsDown(false);
    if (spreadsheetRef.current) {
      spreadsheetRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown) return;
    e.preventDefault();
    const slider = spreadsheetRef.current;
    if (!slider) return;
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1.8; // Scroll speed multiplier
    slider.scrollLeft = scrollLeftState - walk;
  };

  // Reset to original values from screenshots
  const handleResetData = () => {
    setDialogConfig({
      isOpen: true,
      type: 'danger',
      title: 'Reset to Screenshot Defaults',
      message: 'Are you sure you want to reset all spreadsheet data to the default Excel screenshot values? All custom sheets, blocks, and entries will be deleted.',
      confirmText: 'Reset Defaults',
      onConfirm: async () => {
        setSheets(DEFAULT_SHEETS);
        setActiveSheetId('sheet-1');
        setSections(DEFAULT_SECTIONS);
        setRows(DEFAULT_ROWS);
        setSearchTerm('');
        setCompanyFilter('All');
        setStatusFilter('All');
        setEditingCell(null);
        showToast("Reset sheets to standard mock layout", 'info');

        if (dbConnected) {
          const client = getSupabaseClient();
          if (client) {
            try {
              setIsDbLoading(true);
              await client.from('sheets').delete().neq('id', 'non-existent');
              await client.from('sheets').insert(DEFAULT_SHEETS);
              await client.from('sections').insert(DEFAULT_SECTIONS.map(s => ({ id: s.id, name: s.name, sheet_id: s.sheetId })));
              await client.from('rows').insert(DEFAULT_ROWS.map(r => ({
                id: r.id,
                no: r.no,
                company: r.company,
                description: r.description,
                duration: r.duration,
                full_amount: r.fullAmount,
                paid_amount: r.paidAmount,
                mode_of_payment: r.modeOfPayment,
                location: r.location,
                remarks: r.remarks,
            section_id: r.sectionId
              })));
              showToast("Cloud database reset completed", 'success');
            } catch (e) {
              console.error(e);
              showToast("Failed to reset database tables.", 'error');
            } finally {
              setIsDbLoading(false);
            }
          }
        }
      }
    });
  };

  // Clear worksheet entirely to start blank
  const handleClearAll = () => {
    setDialogConfig({
      isOpen: true,
      type: 'danger',
      title: 'Clear Workbook data',
      message: 'Delete all sheets and records to start completely blank? This action cannot be undone.',
      confirmText: 'Clear All Data',
      onConfirm: async () => {
        const defaultSheetId = 'sheet-1';
        const defaultSecId = 'sec-1';

        setSheets([{ id: defaultSheetId, name: 'Sheet 1' }]);
        setActiveSheetId(defaultSheetId);
        setSections([{ id: defaultSecId, name: 'NEW SECTION', sheetId: defaultSheetId }]);
        setRows([]);
        setSearchTerm('');
        setCompanyFilter('All');
        setStatusFilter('All');
        setEditingCell(null);
        showToast("Workbook cleared successfully", 'info');

        if (dbConnected) {
          const client = getSupabaseClient();
          if (client) {
            try {
              setIsDbLoading(true);
              await client.from('sheets').delete().neq('id', 'non-existent');
              await client.from('sheets').insert({ id: defaultSheetId, name: 'Sheet 1' });
              await client.from('sections').insert({ id: defaultSecId, name: 'NEW SECTION', sheet_id: defaultSheetId });
              showToast("Cloud database cleared", 'success');
            } catch (e) {
              console.error(e);
              showToast("Failed to clear cloud database.", 'error');
            } finally {
              setIsDbLoading(false);
            }
          }
        }
      }
    });
  };

  // Employee breakdown sub-ledger operations
  const activeBreakdownRow = rows.find(r => r.id === breakdownModalRowId);

  const handleAddWorker = async (name: string, payDate: string, fullAmount: number, paidAmount: number, remarks: string) => {
    if (!breakdownModalRowId) return;

    const status = paidAmount >= fullAmount ? 'Paid' : 'Pending';
    const newItem: WorkerBreakdownItem = {
      id: `w-${Date.now()}`,
      workerName: name,
      payDate,
      fullAmount,
      paidAmount,
      status,
      remarks
    };

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === breakdownModalRowId) {
          const updatedBreakdown = [...(row.workersBreakdown || []), newItem];
          const totalPaid = updatedBreakdown.reduce((sum, item) => sum + item.paidAmount, 0);

          if (dbConnected) {
            const client = getSupabaseClient();
            if (client) {
              client.from('rows').update({
                paid_amount: totalPaid
              }).eq('id', row.id).then(({ error }) => {
                if (error) console.error("Auto-sync parent row error:", error);
              });
            }
          }

          return {
            ...row,
            workersBreakdown: updatedBreakdown,
            paidAmount: totalPaid
          };
        }
        return row;
      })
    );
    showToast(`Added worker details: ${name}`, 'success');

    if (dbConnected) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { error } = await client.from('workers_breakdown').insert({
            id: newItem.id,
            row_id: breakdownModalRowId,
            worker_name: newItem.workerName,
            pay_date: newItem.payDate || null,
            amount: newItem.fullAmount,
            full_amount: newItem.fullAmount,
            paid_amount: newItem.paidAmount,
            status: newItem.status,
            remarks: newItem.remarks
          });
          if (error) throw error;
        } catch (e) {
          console.error("Worker sync error:", e);
          showToast("Failed to save worker to cloud database.", 'error');
        }
      }
    }
  };

  const handleUpdateWorker = async (workerId: string, name: string, payDate: string, fullAmount: number, paidAmount: number, remarks: string) => {
    if (!breakdownModalRowId) return;
    const status = paidAmount >= fullAmount ? 'Paid' : 'Pending';

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === breakdownModalRowId) {
          const updatedBreakdown = (row.workersBreakdown || []).map(w =>
            w.id === workerId ? { ...w, workerName: name, payDate, fullAmount, paidAmount, status, remarks } : w
          );
          const totalPaid = updatedBreakdown.reduce((sum, item) => sum + item.paidAmount, 0);

          if (dbConnected) {
            const client = getSupabaseClient();
            if (client) {
              client.from('rows').update({ paid_amount: totalPaid }).eq('id', row.id).then(({ error }) => {
                if (error) console.error("Auto-sync parent row error:", error);
              });
            }
          }

          return { ...row, workersBreakdown: updatedBreakdown, paidAmount: totalPaid };
        }
        return row;
      })
    );
    showToast(`Updated worker: ${name}`, 'success');

    if (dbConnected) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { error } = await client.from('workers_breakdown').update({
            worker_name: name,
            pay_date: payDate || null,
            amount: fullAmount,
            full_amount: fullAmount,
            paid_amount: paidAmount,
            status,
            remarks
          }).eq('id', workerId);
          if (error) throw error;
        } catch (e) {
          console.error("Worker update sync error:", e);
          showToast("Failed to update worker in cloud database.", 'error');
        }
      }
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!breakdownModalRowId) return;

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === breakdownModalRowId) {
          const updatedBreakdown = (row.workersBreakdown || []).filter(item => item.id !== workerId);
          const totalPaid = updatedBreakdown.reduce((sum, item) => sum + item.paidAmount, 0);

          if (dbConnected) {
            const client = getSupabaseClient();
            if (client) {
              client.from('rows').update({
                paid_amount: totalPaid
              }).eq('id', row.id).then(({ error }) => {
                if (error) console.error("Auto-sync parent row error:", error);
              });
            }
          }

          return {
            ...row,
            workersBreakdown: updatedBreakdown,
            paidAmount: totalPaid
          };
        }
        return row;
      })
    );
    showToast("Worker details removed", 'info');

    if (dbConnected) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { error } = await client.from('workers_breakdown').delete().eq('id', workerId);
          if (error) throw error;
        } catch (e) {
          console.error("Worker delete error:", e);
          showToast("Failed to delete worker from cloud database.", 'error');
        }
      }
    }
  };

  const handleUpdateFullAmount = async (valStr: string) => {
    if (!breakdownModalRowId) return;
    const num = valStr === '' ? null : parseFloat(valStr);

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === breakdownModalRowId) {
          return {
            ...row,
            fullAmount: num !== null && !isNaN(num) ? num : null
          };
        }
        return row;
      })
    );

    if (dbConnected) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { error } = await client.from('rows').update({ full_amount: num }).eq('id', breakdownModalRowId);
          if (error) throw error;
        } catch (e) {
          console.error("Full amount update error:", e);
        }
      }
    }
  };

  const handleSyncTotalsToParent = async () => {
    if (!breakdownModalRowId) return;
    const activeRow = rows.find(r => r.id === breakdownModalRowId);
    if (!activeRow || !activeRow.workersBreakdown) return;

    const totalPaid = activeRow.workersBreakdown.reduce((sum, item) => sum + item.paidAmount, 0);

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === breakdownModalRowId) {
          return { ...row, paidAmount: totalPaid };
        }
        return row;
      })
    );
    showToast("Paid amount synced from worker breakdowns", 'success');

    if (dbConnected) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { error } = await client
            .from('rows')
            .update({ paid_amount: totalPaid })
            .eq('id', breakdownModalRowId);
          if (error) throw error;
        } catch (e) {
          console.error("Subtotal sync error:", e);
          showToast("Failed to write synced parent amount to cloud database.", 'error');
        }
      }
    }
  };

  // Export functions - CSV
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "PAYMENT DETAILS\r\n\r\n";

    sections.forEach(sec => {
      csvContent += `SECTION: ${sec.name}\r\n`;
      csvContent += "NO.,COMPANY,DESCRIPTION,DURATION,FULL AMOUNT,PAID AMOUNT,REMAINING AMOUNT,MODE OF PAYMENT,LOCATION,REMARKS\r\n";

      const secRows = rows.filter(r => r.sectionId === sec.id);
      let subtotalFull = 0;
      let activeEntries = 0;

      secRows.forEach(row => {
        const remaining = (row.fullAmount !== null) ? (row.fullAmount - (row.paidAmount || 0)) : null;
        const fullStr = row.fullAmount !== null ? row.fullAmount : '';
        const paidStr = row.paidAmount !== null ? row.paidAmount : '';
        const remainingStr = remaining !== null ? remaining : '-';

        csvContent += `"${row.no}","${row.company}","${row.description}","${row.duration}","${fullStr}","${paidStr}","${remainingStr}","${row.modeOfPayment}","${row.location}","${row.remarks}"\r\n`;

        if (row.fullAmount !== null) {
          subtotalFull += row.fullAmount;
          activeEntries++;
        }
      });

      csvContent += `SUBTOTAL — ${sec.name},,,${activeEntries} ENTRIES,${subtotalFull.toFixed(2)},,,,\r\n\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "payment_details_excel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Hex overrides for ALL Tailwind v4 color variables (defined as oklch() by default)
  const HEX_OVERRIDES = `--color-red-50:#fef2f2;--color-red-400:#f87171;--color-red-500:#ef4444;--color-red-700:#b91c1c;--color-red-900:#7f1d1d;--color-red-950:#450a0a;
    --color-amber-50:#fffbeb;--color-amber-100:#fef3c7;--color-amber-200:#fde68a;--color-amber-300:#fcd34d;--color-amber-400:#fbbf24;--color-amber-500:#f59e0b;--color-amber-600:#d97706;--color-amber-700:#b45309;--color-amber-800:#92400e;
    --color-yellow-50:#fefce8;--color-yellow-300:#fde047;
    --color-emerald-50:#ecfdf5;--color-emerald-100:#d1fae5;--color-emerald-200:#a7f3d0;--color-emerald-300:#6ee7b7;--color-emerald-400:#34d399;--color-emerald-500:#10b981;--color-emerald-600:#059669;--color-emerald-700:#047857;--color-emerald-800:#065f46;--color-emerald-900:#064e3b;--color-emerald-950:#022c22;
    --color-blue-50:#eff6ff;--color-blue-100:#dbeafe;--color-blue-400:#60a5fa;--color-blue-500:#3b82f6;--color-blue-600:#2563eb;--color-blue-700:#1d4ed8;--color-blue-800:#1e40af;--color-blue-900:#1e3a8a;
    --color-purple-500:#a855f7;
    --color-rose-50:#fff1f2;--color-rose-100:#ffe4e6;--color-rose-300:#fda4af;--color-rose-500:#f43f5e;--color-rose-600:#e11d48;--color-rose-700:#be123c;--color-rose-800:#9f1239;
    --color-slate-50:#f8fafc;--color-slate-100:#f1f5f9;--color-slate-200:#e2e8f0;--color-slate-300:#cbd5e1;--color-slate-400:#94a3b8;--color-slate-500:#64748b;--color-slate-600:#475569;--color-slate-700:#334155;--color-slate-800:#1e293b;--color-slate-900:#0f172a;--color-slate-950:#020617;
    --color-white:#fff;`;

  // Fix oklch/oklab/color-mix in cloned document for html2canvas compatibility.
  // Also injects a <style> block with hex overrides for CSS variables (belt + suspenders:
  // the <style> block works immediately regardless of external CSS loading; the property
  // iterator catches values inside @supports and custom-property values in already-loaded sheets)
  const fixOklForCapture = (doc: Document) => {
    // Inject hex overrides for ALL color variables — this works immediately
    // regardless of whether external stylesheets have loaded yet
    const fixStyle = doc.createElement('style');
    fixStyle.textContent = `:root,:host{${HEX_OVERRIDES.replace(/;/g, ' !important;')}}`;
    (doc.head || doc.body).appendChild(fixStyle);

    const walkAllRules = (rules: CSSRuleList, cb: (rule: CSSStyleRule) => void) => {
      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        if ((r as CSSGroupingRule).cssRules) {
          walkAllRules((r as CSSGroupingRule).cssRules, cb);
        } else if (r.type === CSSRule.STYLE_RULE) {
          cb(r as CSSStyleRule);
        }
      }
    };
    for (let si = 0; si < doc.styleSheets.length; si++) {
      try {
        const sheet = doc.styleSheets[si] as CSSStyleSheet;
        if (!sheet.cssRules) continue;
        walkAllRules(sheet.cssRules, (rule) => {
          const decl = rule.style;
          let changed = false;
          for (let pi = decl.length - 1; pi >= 0; pi--) {
            const name = decl.item(pi);
            const val = decl.getPropertyValue(name);
            if (val && (val.includes('okl') || val.includes('color-mix'))) {
              decl.setProperty(name, '#94a3b8');
              changed = true;
            }
          }
        });
      } catch (e) { /* cross-origin */ }
    }
    // Also fix inline styles on all elements
    const all = doc.querySelectorAll('*');
    for (const el of all) {
      const s = (el as HTMLElement).style;
      if (!s.cssText) continue;
      const parts = s.cssText.split(';');
      let newParts: string[] | null = null;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i].trim();
        if (p && (p.includes('okl') || p.includes('color-mix'))) {
          if (!newParts) newParts = parts.slice();
          const colonIdx = p.indexOf(':');
          newParts[i] = colonIdx >= 0 ? p.substring(0, colonIdx + 1) + ' #94a3b8' : p;
        }
      }
      if (newParts) {
        s.cssText = newParts.join(';');
      }
    }
  };

  // Print/Screenshot Captures
  const captureSpreadsheetImage = async (format: 'png' | 'jpeg'): Promise<string> => {
    if (!spreadsheetRef.current) return '';
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      const element = spreadsheetRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        onclone: (documentClone) => {
          fixOklForCapture(documentClone);
          const style = documentClone.createElement('style');
          style.innerHTML = `
            .no-export { display: none !important; }
            .grid-sheet-container { border: 1px solid #cbd5e1 !important; border-radius: 0px !important; }
            input, select, textarea { border: none !important; pointer-events: none !important; background: transparent !important; }
          `;
          (documentClone.head || documentClone.body).appendChild(style);
        }
      });

      setIsExporting(false);
      return canvas.toDataURL(`image/${format}`, 1.0);
    } catch (e) {
      console.error("Capture failure", e);
      setIsExporting(false);
      return '';
    }
  };

  const handleDownloadImage = async (format: 'png' | 'jpeg') => {
    showToast(`Generating ${format.toUpperCase()} image...`, 'info');
    const dataUrl = await captureSpreadsheetImage(format);
    if (!dataUrl) {
      showToast("Failed to generate image. Please check console errors.", "error");
      return;
    }

    try {
      const link = document.createElement('a');
      link.download = `payment_details_${Date.now()}.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Image downloaded successfully!", "success");
    } catch (err: any) {
      console.error("Link trigger failed:", err);
      showToast("Failed to download image file.", "error");
    }
  };

  // Collect all CSS from the page stylesheets
  const collectCSS = (): string => {
    const parts: string[] = [];
    for (let si = 0; si < document.styleSheets.length; si++) {
      try {
        const sheet = document.styleSheets[si] as CSSStyleSheet;
        if (sheet.cssRules) {
          for (let ri = 0; ri < sheet.cssRules.length; ri++) {
            parts.push(sheet.cssRules[ri].cssText);
          }
        }
      } catch (e) { /* cross-origin */ }
    }
    return parts.join('\n');
  };

  const PDF_SERVER = (window as any).__PDF_SERVER_URL__ || window.location.origin;

  const generateReportHtml = (selectedSectionIds: Set<string>, format: string = 'A4', pdfMonthFilter: string = 'All'): { html: string; css: string } => {
    const fmt = (v: number | null) => v === null || v === undefined ? '-' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const filteredSections = sections.filter(s => selectedSectionIds.has(s.id));
    const filteredSectionIds = new Set(filteredSections.map(s => s.id));
    const allRows = sortedRows.filter(r => filteredSectionIds.has(r.sectionId) && (pdfMonthFilter === 'All' || !r.duration || r.duration.startsWith(pdfMonthFilter)));
    const grandTotal = allRows.reduce((s, r) => s + (r.fullAmount || 0), 0);
    const grandPaid = allRows.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const grandPending = allRows.reduce((s, r) => { const rem = r.fullAmount !== null ? r.fullAmount - (r.paidAmount || 0) : 0; return s + (rem > 0 ? rem : 0); }, 0);

    const rowStatus = (r: typeof allRows[number]): string => {
      if (r.fullAmount === null || r.fullAmount === 0) return 'uncalc';
      const rem = r.fullAmount - (r.paidAmount || 0);
      return rem > 0 ? 'pending' : 'paid';
    };

    const sheetsHtml = sheets.map(sheet => {
      const sheetSections = filteredSections.filter(sec => (sec.sheetId || 'sheet-1') === sheet.id);
      if (sheetSections.length === 0) return '';

      const sectionsHtml = sheetSections.map(sec => {
        const secRows = allRows.filter(r => r.sectionId === sec.id);
        if (secRows.length === 0) return '';

        const secTotal = secRows.reduce((s, r) => s + (r.fullAmount || 0), 0);
        const secPaid = secRows.reduce((s, r) => s + (r.paidAmount || 0), 0);
        const secRemain = secRows.reduce((s, r) => { const rem = r.fullAmount !== null ? r.fullAmount - (r.paidAmount || 0) : 0; return s + (rem > 0 ? rem : 0); }, 0);
        const paidRows = secRows.filter(r => rowStatus(r) === 'paid').length;
        const penRows = secRows.filter(r => rowStatus(r) === 'pending').length;
        const uncalcRows = secRows.filter(r => rowStatus(r) === 'uncalc').length;

        const rowsHtml = secRows.map(r => {
          const rem = r.fullAmount !== null ? r.fullAmount - (r.paidAmount || 0) : null;
          const status = rowStatus(r);
          const badge = status === 'paid' ? '<span class="sb sb-pd">Paid</span>' : status === 'pending' ? '<span class="sb sb-pn">Pending</span>' : '<span class="sb sb-uc">Uncalc</span>';
          return `<tr>
            <td class="no">${r.no || '-'}</td>
            <td class="co">${r.company || '-'}</td>
            <td class="de">${r.description || '-'}</td>
            <td class="du">${r.duration || '-'}</td>
            <td class="am">${fmt(r.fullAmount)}</td>
            <td class="am">${fmt(r.paidAmount)}</td>
            <td class="am">${rem !== null ? fmt(rem) : '-'}</td>
            <td class="st">${badge}</td>
          </tr>`;
        }).join('');

        return `<div class="sec">
          <div class="sh">
            <span>${sec.name}</span>
            <span class="sm">${secRows.length} entries &middot; Paid ${paidRows} &middot; Pending ${penRows} &middot; Uncalc ${uncalcRows}</span>
          </div>
          <table><thead><tr>
            <th style="width:36px">#</th>
            <th style="width:17%">Company</th>
            <th>Description</th>
            <th style="width:13%">Duration</th>
            <th style="width:13%" class="am">Full Amount</th>
            <th style="width:13%" class="am">Paid Amount</th>
            <th style="width:13%" class="am">Remaining</th>
            <th style="width:62px">Status</th>
          </tr></thead><tbody>${rowsHtml}</tbody>
          <tfoot><tr>
            <td colspan="4">Section Subtotal</td>
            <td class="am">${fmt(secTotal)}</td>
            <td class="am">${fmt(secPaid)}</td>
            <td class="am">${fmt(secRemain)}</td>
            <td></td>
          </tr></tfoot></table></div>`;
      }).join('');

      const sheetTotal = allRows.filter(r => sheetSections.some(s => s.id === r.sectionId)).reduce((s, r) => s + (r.fullAmount || 0), 0);
      const sheetPaid = allRows.filter(r => sheetSections.some(s => s.id === r.sectionId)).reduce((s, r) => s + (r.paidAmount || 0), 0);
      const sheetRows = allRows.filter(r => sheetSections.some(s => s.id === r.sectionId)).length;
      const sheetSecs = sheetSections.filter(s => allRows.some(r => r.sectionId === s.id)).length;

      return `<div class="sheet">
        <div class="stitle">${sheet.name}</div>
        <div class="smeta">${sheetSecs} sections &middot; ${sheetRows} rows &middot; Total ${fmt(sheetTotal)} &middot; Paid ${fmt(sheetPaid)}</div>
        ${sectionsHtml}
        <div class="stot">Sheet Total &middot; ${fmt(sheetTotal)} &middot; Paid ${fmt(sheetPaid)} &middot; Remaining ${fmt(grandTotal - grandPaid)}</div>
      </div>`;
    }).join('');

    const totalPaidRows = allRows.filter(r => rowStatus(r) === 'paid').length;
    const totalPenRows = allRows.filter(r => rowStatus(r) === 'pending').length;
    const totalUncRows = allRows.filter(r => rowStatus(r) === 'uncalc').length;
    const totalWorkers = allRows.reduce((s, r) => s + (r.workersBreakdown?.length || 0), 0);

    const css = `
      @page { margin: 18mm 14mm 22mm; size: ${format} ${format === 'A3' ? 'landscape' : 'portrait'}; page-break-inside: auto; }
      body { margin: 0; padding: ${format === 'A3' ? '40px' : '32px'}; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-weight: 400; color: #1e293b; background: #f8fafc; }
      .rp { max-width: ${format === 'A3' ? '1400px' : '1060px'}; margin: 0 auto; }

      .hd { text-align: center; padding: 44px 0 30px; border-bottom: 3px solid #059669; margin-bottom: 32px; }
      .hd h1 { font-size: 30px; font-weight: 800; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.5px; }
      .hd .sub { font-size: 14px; color: #64748b; margin: 0; }
      .hd .dt { font-size: 12px; color: #94a3b8; margin-top: 3px; }

      .sr { display: flex; gap: 14px; margin-bottom: 36px; }
      .sc { flex: 1; padding: 22px 20px; border-radius: 10px; background: #fff; border: 1px solid #e2e8f0; }
      .sc .lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 5px; }
      .sc .val { font-size: 26px; font-weight: 700; color: #0f172a; }
      .sc .subv { font-size: 11px; color: #94a3b8; margin-top: 3px; }
      .sc-tot { border-top: 4px solid #1e293b; }
      .sc-pd { border-top: 4px solid #059669; }
      .sc-pn { border-top: 4px solid #d97706; }

      .sheet { margin-bottom: 34px; }
      .stitle { font-size: 20px; font-weight: 700; color: #0f172a; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; margin-bottom: 2px; }
      .smeta { font-size: 11px; color: #94a3b8; margin-bottom: 18px; }

      .sec { margin-bottom: 20px; }
      .sh { font-size: 14px; font-weight: 600; color: #334155; padding: 9px 14px; background: #f1f5f9; border: 1px solid #e2e8f0; border-bottom: none; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center; break-after: avoid; }
      .sm { font-size: 11px; font-weight: 400; color: #94a3b8; }

      table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; page-break-inside: auto; }
      thead { display: table-header-group; }
      thead th { background: #1e293b; color: #fff; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; padding: 9px 10px; text-align: left; }
      thead th.am { text-align: right; }
      tbody td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; font-weight: 400; }
      tbody tr { page-break-inside: avoid; }
      tbody tr:nth-child(even) { background: #f8fafc; }
      .no { font-weight: 500; color: #94a3b8; text-align: center; }
      .co { font-weight: 500; }
      .de { max-width: 160px; }
      .du { color: #64748b; white-space: nowrap; }
      .am { text-align: right; font-family: 'Consolas', 'Courier New', monospace; font-weight: 500; white-space: nowrap; }
      .st { text-align: center; }
      .sb { display: inline-block; padding: 2px 8px; border-radius: 8px; font-size: 9px; font-weight: 600; }
      .sb-pd { background: #dcfce7; color: #166534; }
      .sb-pn { background: #fef3c7; color: #92400e; }
      .sb-uc { background: #f1f5f9; color: #64748b; }

      tfoot { display: table-footer-group; }
      tfoot td { padding: 9px 10px; background: #fef3c7; font-weight: 800; border-top: 3px solid #d97706; border-bottom: 3px solid #d97706; font-size: 12px; color: #92400e; }
      tfoot td.am { text-align: right; }

      .stot { text-align: right; padding: 10px 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 6px 6px; margin-top: -1px; font-weight: 700; font-size: 13px; color: #0f172a; }



      .ft { text-align: center; padding-top: 28px; margin-top: 36px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }

      .sr-row { display: flex; gap: 20px; justify-content: center; margin-top: 14px; font-size: 11px; color: #64748b; }
      .sr-row span { padding: 3px 10px; background: #f1f5f9; border-radius: 10px; }
      .sr-row strong { color: #334155; }

      .warn { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; }
    `;

    const body = `<div class="rp">

      <div class="hd">
        <h1>Payment Registry Report</h1>
        <p class="sub">Company Payment Tracking Summary</p>
        <p class="dt">Generated on ${dateStr}</p>
        <div class="sr-row">
          <span><strong>${filteredSections.length > 0 ? sheets.filter(s => filteredSections.some(sec => (sec.sheetId || 'sheet-1') === s.id)).length : 0}</strong> sheets</span>
          <span><strong>${filteredSections.length}</strong> sections</span>
          <span><strong>${allRows.length}</strong> rows</span>
          <span><strong>${totalWorkers}</strong> workers</span>
        </div>
      </div>

      <div class="sr">
        <div class="sc sc-tot">
          <div class="lbl">Total Amount (SAR)</div>
          <div class="val">${fmt(grandTotal)}</div>
          <div class="subv">${allRows.length} entries across ${sections.length} sections</div>
        </div>
        <div class="sc sc-pd">
          <div class="lbl">Paid Amount (SAR)</div>
          <div class="val">${fmt(grandPaid)}</div>
          <div class="subv">${totalPaidRows} entries fully paid</div>
        </div>
        <div class="sc sc-pn">
          <div class="lbl">Pending Amount (SAR)</div>
          <div class="val">${fmt(grandPending)}</div>
          <div class="subv">${totalPenRows} entries pending &middot; ${totalUncRows} uncalculated</div>
        </div>
      </div>

      ${sheetsHtml || '<div class="warn">No data available for the report.</div>'}

      <div class="ft">
        Payment Registry Report &middot; Generated on ${dateStr} &middot; Confidential
      </div>

    </div>`;

    return { html: body, css };
  };

  const handleDownloadPDF = async (selectedSectionIds: Set<string>) => {
    const format = pdfFormat;
    setShowBlockSelector(false);
    setIsExporting(true);
    showToast(`Generating PDF (${format})...`, 'info');
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Try Puppeteer server first — stylish report
    try {
      const landscape = format === 'A3';
      const { html, css } = generateReportHtml(selectedSectionIds, format, pdfMonthFilter);
      const resp = await fetch(`${PDF_SERVER}/api/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, css, landscape, format })
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`Server ${resp.status}: ${errText}`);
      }
      const buffer = await resp.arrayBuffer();
      if (buffer.byteLength < 200) throw new Error(`PDF too small (${buffer.byteLength} bytes)`);
      const blob = new Blob([buffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Pending Payment - ${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 3000);
      setIsExporting(false);
      showToast("PDF downloaded successfully!", "success");
      return;
    } catch (serverErr) {
      console.warn('PDF server unavailable, falling back to html2canvas', serverErr);
    }

    // Fallback: html2canvas + jsPDF (captures full spreadsheet — ignores block filter)
    try {
      const element = spreadsheetRef.current;
      if (!element) { setIsExporting(false); return; }

      // Hide non-selected sections by walking DOM tr elements
      const hiddenRows: { el: HTMLElement; display: string }[] = [];
      const allRows = element.querySelectorAll<HTMLElement>('tr');
      let inHiddenSection = false;
      allRows.forEach(tr => {
        const sectionId = tr.getAttribute('data-section-id');
        if (sectionId) {
          inHiddenSection = !selectedSectionIds.has(sectionId);
        }
        if (inHiddenSection) {
          hiddenRows.push({ el: tr, display: tr.style.display });
          tr.style.display = 'none';
        }
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        onclone: (documentClone) => {
          fixOklForCapture(documentClone);
          const style = documentClone.createElement('style');
          style.innerHTML = `
            .no-export { display: none !important; }
            .grid-sheet-container { border: 1px solid #cbd5e1 !important; border-radius: 0px !important; }
          `;
          (documentClone.head || documentClone.body).appendChild(style);
        }
      });

      // Restore hidden rows
      hiddenRows.forEach(({ el, display }) => { el.style.display = display; });

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdf = new jsPDF('l', 'pt', [imgWidth, imgHeight]);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Pending Payment - ${new Date().toISOString().slice(0, 10)}.pdf`);

      setIsExporting(false);
      showToast("PDF downloaded successfully!", "success");
    } catch (e) {
      console.error("PDF download failed", e);
      setIsExporting(false);
      showToast("Failed to generate PDF document.", "error");
    }
  };

  const formatMoney = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  // Duration date helpers
  const MONTHS: Record<string, string> = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
  const MONTHS_REV: Record<string, string> = { '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR', '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AUG', '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC' };

  const parseDuration = (duration: string): { from: string; to: string } | null => {
    const match = duration.match(/^([A-Z]{3})\s+(\d{1,2})-(\d{1,2})\s+(\d{4})$/);
    if (match) {
      const month = MONTHS[match[1]];
      if (month) {
        return {
          from: `${match[4]}-${month}-${match[2].padStart(2, '0')}`,
          to: `${match[4]}-${month}-${match[3].padStart(2, '0')}`
        };
      }
    }
    return null;
  };

  const formatDuration = (from: string, to: string): string => {
    if (!from || !to) return '';
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T00:00:00');
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return '';
    const fromMonth = MONTHS_REV[String(fromDate.getMonth() + 1).padStart(2, '0')];
    const toMonth = MONTHS_REV[String(toDate.getMonth() + 1).padStart(2, '0')];
    const fromDay = String(fromDate.getDate()).padStart(2, '0');
    const toDay = String(toDate.getDate()).padStart(2, '0');
    const year = fromDate.getFullYear();
    if (fromMonth === toMonth) {
      return `${fromMonth} ${fromDay}-${toDay} ${year}`;
    }
    return `${fromMonth} ${fromDay} - ${toMonth} ${toDay} ${year}`;
  };

  // Auto-sort rows by duration then assign sequential no within each section
  const sortedRows = useMemo(() => {
    const durToDate = (d: string): number => {
      const m = d.match(/^([A-Z]{3})\s+(\d{1,2})/);
      if (m && MONTHS[m[1]]) return new Date(`${d.slice(-4)}-${MONTHS[m[1]]}-${m[2].padStart(2, '0')}`).getTime();
      return 0;
    };
    const sorted = [...rows].sort((a, b) => {
      if (a.sectionId !== b.sectionId) return a.sectionId < b.sectionId ? -1 : 1;
      return durToDate(a.duration) - durToDate(b.duration) || a.id.localeCompare(b.id);
    });
    let secId = '';
    let num = 1;
    return sorted.map(r => {
      if (r.sectionId !== secId) { secId = r.sectionId; num = 1; }
      return { ...r, no: String(num++) };
    });
  }, [rows, sections]);

  const allMonths = useMemo(() => {
    const months = new Set<string>();
    rows.forEach(r => {
      if (r.duration) {
        const m = r.duration.match(/^([A-Z]{3})/);
        if (m && MONTHS[m[1]]) months.add(m[1]);
      }
    });
    return ['All', ...Array.from(months).sort((a, b) => +MONTHS[a] - +MONTHS[b])];
  }, [rows]);

  // Multi-column filtering logic (uses sortedRows for display order)
  const getFilteredRowsForSection = (sectionId: string) => {
    let sectionRows = sortedRows.filter(r => r.sectionId === sectionId && (monthFilter === 'All' || !r.duration || r.duration.startsWith(monthFilter)));

    if (searchTerm.trim() !== '') {
      const s = searchTerm.toLowerCase();
      sectionRows = sectionRows.filter(r =>
        (r.company && r.company.toLowerCase().includes(s)) ||
        (r.description && r.description.toLowerCase().includes(s)) ||
        (r.duration && r.duration.toLowerCase().includes(s)) ||
        (r.remarks && r.remarks.toLowerCase().includes(s)) ||
        (r.no && r.no.toLowerCase().includes(s))
      );
    }

    if (companyFilter !== 'All') {
      sectionRows = sectionRows.filter(r => r.company === companyFilter);
    }

    if (statusFilter !== 'All') {
      sectionRows = sectionRows.filter(r => {
        const remaining = r.fullAmount !== null ? r.fullAmount - (r.paidAmount || 0) : null;
        if (statusFilter === 'Pending') {
          return remaining !== null && remaining > 0;
        } else if (statusFilter === 'FullyPaid') {
          return remaining !== null && remaining <= 0 && r.fullAmount > 0;
        } else if (statusFilter === 'Uncalculated') {
          return r.fullAmount === null || r.fullAmount === 0;
        }
        return true;
      });
    }

    return sectionRows;
  };

  // Return sections filtered by the active sheet
  const currentSheetSections = sections.filter(sec => {
    const sId = sec.sheetId || 'sheet-1';
    return sId === activeSheetId;
  });

  const activeSectionIds = currentSheetSections.map(s => s.id);
  const currentSheetRows = sortedRows.filter(r => activeSectionIds.includes(r.sectionId) && (monthFilter === 'All' || !r.duration || r.duration.startsWith(monthFilter)));
  const uniqueCompanies = Array.from(new Set(currentSheetRows.map(r => r.company).filter(Boolean)));

  // Current active sheet metrics
  const totalFullAmount = currentSheetRows.reduce((sum, r) => sum + (r.fullAmount || 0), 0);
  const totalPaidAmount = currentSheetRows.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
  const totalRemainingAmount = currentSheetRows.reduce((sum, r) => {
    const rem = r.fullAmount !== null ? r.fullAmount - (r.paidAmount || 0) : 0;
    return sum + (rem > 0 ? rem : 0);
  }, 0);

  const pendingCount = currentSheetRows.filter(r => {
    const rem = r.fullAmount !== null ? r.fullAmount - (r.paidAmount || 0) : null;
    return rem !== null && rem > 0;
  }).length;

  const paidCount = currentSheetRows.filter(r => {
    const rem = r.fullAmount !== null ? r.fullAmount - (r.paidAmount || 0) : null;
    return rem !== null && rem <= 0 && r.fullAmount > 0;
  }).length;

  const localStats = {
    sheets: sheets.length,
    sections: sections.length,
    rows: rows.length,
    workers: rows.reduce((sum, r) => sum + (r.workersBreakdown?.length || 0), 0)
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans selection:bg-blue-100/60">

      {/* Premium Glassmorphic Header */}
      <header className="sticky top-0 z-35 w-full bg-slate-900 border-b border-slate-800 text-white px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-950/20 border border-emerald-500/35">
            <Grid className="w-5 h-5" id="app_logo_icon" />
          </div>
          <div className="text-left">
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2" id="app_heading">
              Company Payment Registry
              <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 uppercase tracking-wide">
                Enterprise v2
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Tracks direct corporate payments &amp; worker sub-ledgers</p>
          </div>
        </div>

        {/* Action Controls & DB Connection Panel Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Connection status badge */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
            title="Database Settings"
          >
            <Database className="w-3.5 h-3.5 animate-pulse" />
            <span>Supabase Synced</span>
          </button>

          <button
            id="btn_add_section"
            type="button"
            onClick={handleAddSection}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-900/10 border border-blue-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Block Section
          </button>

          <button
            id="btn_add_row"
            type="button"
            onClick={() => {
              if (currentSheetSections.length === 0) {
                showToast("Please create a Block Section first.", "error");
              } else {
                setGlobalAddRowSectionId(currentSheetSections[0].id);
                setShowGlobalAddRowModal(true);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-900/10 border border-emerald-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>

          <button
            id="btn_csv"
            type="button"
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {/* Media Downloader Menu */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              id="btn_download_menu"
              type="button"
              onClick={() => setDownloadMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-800 to-slate-750 hover:from-slate-700 hover:to-slate-650 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download Media
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {downloadMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-slate-850 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm">
                {/* Stats Header */}
                <div className="px-4 pt-3 pb-2.5 bg-gradient-to-br from-slate-800/80 to-slate-850/80 border-b border-slate-700/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Sheet Summary</p>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Sections</span>
                      <span className="text-xs font-extrabold text-white">{currentSheetSections.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Rows</span>
                      <span className="text-xs font-extrabold text-white">{currentSheetRows.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Workers</span>
                      <span className="text-xs font-extrabold text-white">{localStats.workers}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 mt-1.5 pt-1.5 border-t border-slate-700/40">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Total</span>
                      <span className="text-[11px] font-extrabold text-emerald-400">{formatMoney(totalFullAmount)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Paid</span>
                      <span className="text-[11px] font-extrabold text-blue-400">{formatMoney(totalPaidAmount)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Pending</span>
                      <span className="text-[11px] font-extrabold text-amber-400">{formatMoney(totalRemainingAmount)}</span>
                    </div>
                  </div>
                </div>
                {/* Download Options */}
                <div className="px-2 py-1.5">
                  <button
                    id="btn_pdf"
                    onClick={() => { setSelectedBlockIds(new Set(sections.map(s => s.id))); setPdfMonthFilter(monthFilter); setShowBlockSelector(true); setDownloadMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-700/70 text-slate-200 rounded-lg text-xs flex items-center gap-3 cursor-pointer font-semibold transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white">Download PDF</span>
                      <span className="text-[9px] text-slate-400">Vector document, high quality</span>
                    </div>
                  </button>
                  <button
                    id="btn_png"
                    onClick={() => { handleDownloadImage('png'); setDownloadMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-700/70 text-slate-200 rounded-lg text-xs flex items-center gap-3 cursor-pointer font-semibold transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white">Download PNG</span>
                      <span className="text-[9px] text-slate-400">Lossless image, transparent bg</span>
                    </div>
                  </button>
                  <button
                    id="btn_jpeg"
                    onClick={() => { handleDownloadImage('jpeg'); setDownloadMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-700/70 text-slate-200 rounded-lg text-xs flex items-center gap-3 cursor-pointer font-semibold transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white">Download JPEG</span>
                      <span className="text-[9px] text-slate-400">Compressed image, smaller size</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-1"></div>

          {/* Config Settings gear icon */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Database Connection Config"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors bg-transparent cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            id="btn_reset"
            type="button"
            onClick={handleResetData}
            title="Reset workbook to screenshot defaults"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors bg-transparent cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            id="btn_clear"
            type="button"
            onClick={handleClearAll}
            title="Clear worksheet and start blank"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg border border-slate-800 hover:border-red-900/40 transition-colors bg-transparent cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-none mx-auto px-4 md:px-8 mt-6">

        {/* Supabase loading overlay spinner */}
        {isDbLoading && (
          <div className="w-full flex items-center justify-center gap-2.5 p-4 mb-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-xs font-bold animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Syncing database tables live from Supabase Cloud...</span>
          </div>
        )}

        {/* SVG Portfolio Analytics Charts */}
        <AnalyticsPanel
          currentSheetRows={currentSheetRows}
          currencySymbol={currencySymbol}
          totalFullAmount={totalFullAmount}
          totalPaidAmount={totalPaidAmount}
          totalRemainingAmount={totalRemainingAmount}
          pendingCount={pendingCount}
          paidCount={paidCount}
        />

        {/* Dashboard Cards Panel */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="space-y-1 text-left">
              <span className="text-[10px] text-slate-450 font-bold tracking-wider uppercase block">Total Volume</span>
              <p className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
                {formatMoney(totalFullAmount)} <span className="text-[10px] font-bold text-slate-400">{currencySymbol}</span>
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="space-y-1 text-left">
              <span className="text-[10px] text-slate-450 font-bold tracking-wider uppercase block">Paid Total</span>
              <p className="text-xl font-extrabold text-emerald-600 font-mono tracking-tight">
                {formatMoney(totalPaidAmount)} <span className="text-[10px] font-bold text-slate-400">{currencySymbol}</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="space-y-1 text-left">
              <span className="text-[10px] text-slate-450 font-bold tracking-wider uppercase block">Outstanding Pending</span>
              <p className="text-xl font-extrabold text-amber-600 font-mono tracking-tight">
                {formatMoney(totalRemainingAmount)} <span className="text-[10px] font-bold text-slate-400">{currencySymbol}</span>
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-450 font-bold tracking-wider uppercase">Collection Status</span>
              <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700 border border-amber-200">
                {pendingCount} Pending
              </span>
            </div>
            <div className="mt-3 text-left">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-505 mb-1.5">
                <span>Income Progress</span>
                <span>{totalFullAmount ? Math.round((totalPaidAmount / totalFullAmount) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${totalFullAmount ? Math.min(100, (totalPaidAmount / totalFullAmount) * 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters and Config Panel */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="search_field"
                type="text"
                placeholder="Search spreadsheet content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs rounded-lg transition-all outline-hidden focus:ring-1 focus:ring-blue-500 font-semibold"
              />
            </div>

            {/* Status select filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase hidden sm:inline">Status:</span>
              <select
                id="status_filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs rounded-lg py-2 px-3.5 outline-hidden font-bold text-slate-700 h-[34px]"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Outstanding ({pendingCount})</option>
                <option value="FullyPaid">Fully Paid ({paidCount})</option>
                <option value="Uncalculated">To Be Calculated</option>
              </select>
            </div>

            {/* Company filter select */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase hidden sm:inline">Company:</span>
              <select
                id="company_filter"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs rounded-lg py-2 px-3.5 outline-hidden max-w-[190px] font-bold text-slate-700 h-[34px]"
              >
                <option value="All">All Companies</option>
                {uniqueCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Currency display */}
          <div className="flex items-center gap-2.5 border-t pt-3.5 lg:pt-0 lg:border-t-0 border-slate-100">
            <span className="text-[10px] text-slate-405 font-extrabold uppercase whitespace-nowrap">Currency: SAR</span>
          </div>
        </section>

        {/* Interactive Spreadsheet Canvas */}
        <section className="bg-white border border-slate-250 rounded-xl overflow-hidden shadow-sm relative">

          {/* Spreadsheet controls assist */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs no-export">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5 text-left select-none">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Spreadsheet Note: Double-click any cell to type and edit. Updates save automatically.</span>
            </span>
            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 select-none">
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white shadow-3xs">
                <button
                  id="btn_scroll_left"
                  type="button"
                  onClick={() => spreadsheetRef.current?.scrollBy({ left: -250, behavior: 'smooth' })}
                  title="Scroll Left"
                  className="px-3 py-1 text-[10px] font-bold text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  ◀ Scroll Left
                </button>
                <span className="h-4 w-[1px] bg-slate-200"></span>
                <button
                  id="btn_scroll_right"
                  type="button"
                  onClick={() => spreadsheetRef.current?.scrollBy({ left: 250, behavior: 'smooth' })}
                  title="Scroll Right"
                  className="px-3 py-1 text-[10px] font-bold text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Scroll Right ▶
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span className="text-[9px] text-slate-500 uppercase">ONLINE</span>
              </div>
            </div>
          </div>

          <div
            ref={spreadsheetRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="w-full overflow-x-auto custom-scrollbar p-1.5 bg-white cursor-grab active:cursor-grabbing select-none"
          >
            {/* Master Sheet */}
            <table className="w-full text-left border-collapse table-fixed min-w-[1100px] select-text">

              {/* Header Excel ABC Grid columns */}
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="select-none">
                  <th className="w-[45px] text-center bg-slate-100 text-[9px] font-extrabold text-slate-400 border border-slate-200 h-6"></th>
                  <th className="w-[50px] text-center text-xs font-bold text-slate-400 border border-slate-200">A</th>
                  <th className="w-[180px] text-center text-xs font-bold text-slate-400 border border-slate-200">B</th>
                  <th className="w-[220px] text-center text-xs font-bold text-slate-400 border border-slate-200">C</th>
                  <th className="w-[130px] text-center text-xs font-bold text-slate-400 border border-slate-200">D</th>
                  <th className="w-[120px] text-center text-xs font-bold text-slate-400 border border-slate-200">E</th>
                  <th className="w-[120px] text-center text-xs font-bold text-slate-400 border border-slate-200">F</th>
                  <th className="w-[130px] text-center text-xs font-bold text-slate-400 border border-slate-200">G</th>
                  <th className="w-[120px] text-center text-xs font-bold text-slate-400 border border-slate-200">H</th>
                  <th className="w-[120px] text-center text-xs font-bold text-slate-400 border border-slate-200">I</th>
                  <th className="w-[200px] text-center text-xs font-bold text-slate-400 border border-slate-200">J</th>
                  <th className="w-[90px] text-center bg-slate-100 text-xs font-bold text-slate-400 border border-slate-200 no-export">Actions</th>
                </tr>
              </thead>

              {/* Excel Table Title Bar */}
              <tbody>
                <tr className="bg-slate-900 text-white select-none">
                  <td className="text-center bg-slate-200 border border-slate-300 text-[9px] font-bold text-slate-500 h-9">
                    1
                  </td>
                  <td colSpan={10} className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest text-left">
                    PAYMENT DETAILS
                  </td>
                  <td className="no-export bg-slate-900 border border-slate-300"></td>
                </tr>

                {/* Col Headers Row */}
                <tr className="bg-slate-800 text-white text-[10px] font-bold text-center uppercase tracking-wider h-8 select-none">
                  <td className="text-center bg-slate-200 border border-slate-300 text-[9px] font-bold text-slate-500">
                    2
                  </td>
                  <td className="border border-slate-700 px-1 py-1 text-center">NO.</td>
                  <td className="border border-slate-700 px-3 py-1 text-left">COMPANY</td>
                  <td className="border border-slate-700 px-3 py-1 text-left">DESCRIPTION</td>
                  <td className="border border-slate-700 px-3 py-1 text-left bg-amber-400 text-slate-900 font-extrabold text-xs">DURATION</td>
                  <td className="border border-slate-700 px-3 py-1 text-right">FULL AMOUNT ({currencySymbol})</td>
                  <td className="border border-slate-700 px-3 py-1 text-right">PAID AMOUNT ({currencySymbol})</td>
                  <td className="border border-slate-700 px-3 py-1 text-right text-emerald-300 font-extrabold">REMAINING ({currencySymbol})</td>
                  <td className="border border-slate-700 px-3 py-1 text-left">MODE OF PAYMENT</td>
                  <td className="border border-slate-700 px-3 py-1 text-left">LOCATION</td>
                  <td className="border border-slate-700 px-3 py-1 text-left">REMARKS</td>
                  <td className="border border-slate-700 px-2 py-1 text-center">INVOICE</td>
                  <td className="border border-slate-700 py-1 no-export"></td>
                </tr>

                {/* Render Sections dynamically */}
                {currentSheetSections.length === 0 && (
                  <tr>
                    <td className="text-center bg-slate-100 border border-slate-200 text-[9px] text-slate-400 select-none">-</td>
                    <td colSpan={11} className="px-6 py-12 text-center border border-slate-200 bg-slate-50/20">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <AlertTriangle className="w-8 h-8 text-amber-500 animate-bounce" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">No Section Blocks in this Worksheet</p>
                          <p className="text-[11px] text-slate-400 font-medium">Create at least one Section Block before you can add registry rows.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddSection}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create Section Block</span>
                        </button>
                      </div>
                    </td>
                    <td className="no-export border border-slate-200"></td>
                  </tr>
                )}

                {currentSheetSections.map((section, secIndex) => {
                  const sRows = getFilteredRowsForSection(section.id);
                  if (sRows.length === 0) return null;

                  let sumFullAmount = 0;
                  let entriesWithValues = 0;

                  sRows.forEach(r => {
                    if (r.fullAmount !== null) {
                      sumFullAmount += r.fullAmount;
                      entriesWithValues++;
                    }
                  });

                  return (
                    <React.Fragment key={section.id}>
                      {/* Section Block Title Header */}
                      <tr data-section-id={section.id} className="bg-slate-50 border-b border-slate-200 group/block">
                        <td className="text-center bg-slate-100 border border-slate-200 text-[9px] text-slate-400 h-7 select-none">
                          *
                        </td>
                        <td colSpan={11} className="px-3 py-1.5 font-extrabold text-xs text-blue-900 border border-slate-200 text-left bg-slate-50">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 uppercase font-extrabold tracking-wider text-[11px] text-slate-750">
                              📁 BLOCK {secIndex + 1}: {section.name}
                            </span>
                            <div className="flex items-center gap-2.5 no-export opacity-0 group-hover/block:opacity-100 transition-all">
                              <button
                                type="button"
                                onClick={() => handleRenameSection(section.id)}
                                className="text-blue-600 hover:text-blue-800 text-[10px] font-extrabold uppercase tracking-wide cursor-pointer"
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(section.id)}
                                className="text-red-500 hover:text-red-700 text-[10px] font-extrabold uppercase tracking-wide cursor-pointer"
                              >
                                Delete Block
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="no-export border border-slate-200 bg-slate-50"></td>
                      </tr>

                      {/* Render rows */}
                      {sRows.map((row, rowIndex) => {
                        const calculatedRemaining = (row.fullAmount !== null)
                          ? row.fullAmount - (row.paidAmount || 0)
                          : null;

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/70 border-b border-slate-200 transition-colors h-8 group/row">
                            <td className="text-center bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-450 select-none">
                              {rowIndex + 3 + (secIndex * 12)}
                            </td>

                            {/* NO */}
                            <td
                              className="border border-slate-200 px-1 py-1 text-center font-mono text-xs cursor-pointer bg-slate-50/20 text-slate-700 font-bold"
                              onDoubleClick={() => startEditing(row.id, 'no', row.no)}
                            >
                              {editingCell?.rowId === row.id && editingCell?.field === 'no' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveCell}
                                  onKeyDown={handleKeyDown}
                                  className="w-full text-center py-0.5 outline-hidden text-xs font-mono font-bold bg-yellow-50 text-blue-900 ring-1 ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                row.no || '-'
                              )}
                            </td>

                            {/* COMPANY */}
                            <td
                              className="border border-slate-200 px-3 py-1 font-bold text-xs cursor-pointer text-slate-800 text-left"
                              onDoubleClick={() => startEditing(row.id, 'company', row.company)}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="truncate flex-1">
                                  {editingCell?.rowId === row.id && editingCell?.field === 'company' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveCell}
                                      onKeyDown={handleKeyDown}
                                      className="w-full text-left py-0.5 outline-hidden text-xs font-bold bg-yellow-50 text-slate-900 ring-1 ring-blue-500"
                                      autoFocus
                                    />
                                  ) : (
                                    row.company || ''
                                  )}
                                </span>

                                {/* Employee sub-ledger trigger */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBreakdownModalRowId(row.id);
                                  }}
                                  title="Manage Employee Ledger"
                                  className={`no-export shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer ${row.workersBreakdown && row.workersBreakdown.length > 0
                                      ? 'bg-slate-800 text-white hover:bg-slate-900 border border-slate-700 shadow-3xs'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 opacity-60 group-hover/row:opacity-100'
                                    }`}
                                >
                                  <Users className="w-2.5 h-2.5" />
                                  <span>{row.workersBreakdown && row.workersBreakdown.length > 0 ? `${row.workersBreakdown.length} workers` : 'Ledger'}</span>
                                </button>
                              </div>
                            </td>

                            {/* DESCRIPTION */}
                            <td
                              className="border border-slate-200 px-3 py-1 text-xs cursor-pointer text-slate-650 truncate text-left font-semibold uppercase"
                              onDoubleClick={() => startEditing(row.id, 'description', row.description)}
                            >
                              {editingCell?.rowId === row.id && editingCell?.field === 'description' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveCell}
                                  onKeyDown={handleKeyDown}
                                  className="w-full text-left py-0.5 outline-hidden text-xs bg-yellow-50 text-slate-900 ring-1 ring-blue-500 uppercase"
                                  autoFocus
                                />
                              ) : (
                                row.description || ''
                              )}
                            </td>

                            {/* DURATION */}
                            <td
                              className="border border-slate-200 px-3 py-1 text-xs font-mono cursor-pointer truncate text-left font-bold bg-amber-50 text-amber-900"
                              onDoubleClick={() => {
                                const parsed = parseDuration(row.duration || '');
                                if (parsed) {
                                  setDurationFrom(parsed.from);
                                  setDurationTo(parsed.to);
                                } else {
                                  setDurationFrom('');
                                  setDurationTo('');
                                }
                                startEditing(row.id, 'duration', row.duration || '');
                              }}
                            >
                              {editingCell?.rowId === row.id && editingCell?.field === 'duration' ? (
                                <div
                                  className="flex items-center gap-1"
                                  onBlur={(e) => {
                                    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
                                      setTimeout(saveCell, 0);
                                    }
                                  }}
                                >
                                  <input
                                    type="date"
                                    value={durationFrom}
                                    onChange={(e) => { setDurationFrom(e.target.value); }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const next = (e.currentTarget as HTMLElement).parentElement?.querySelectorAll('input')[1] as HTMLInputElement;
                                        if (next) next.focus();
                                      }
                                      if (e.key === 'Escape') { setEditingCell(null); }
                                    }}
                                    className="w-full min-w-0 flex-1 py-0.5 outline-hidden text-[10px] font-mono bg-yellow-50 text-slate-900 ring-1 ring-blue-500"
                                    autoFocus
                                  />
                                  <span className="text-[9px] font-bold text-slate-400">→</span>
                                  <input
                                    type="date"
                                    value={durationTo}
                                    onChange={(e) => { setDurationTo(e.target.value); }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        saveCell();
                                      }
                                      if (e.key === 'Escape') { setEditingCell(null); }
                                    }}
                                    className="w-full min-w-0 flex-1 py-0.5 outline-hidden text-[10px] font-mono bg-yellow-50 text-slate-900 ring-1 ring-blue-500"
                                  />
                                </div>
                              ) : (
                                <span className="text-sm font-extrabold tracking-wide">{row.duration || '-'}</span>
                              )}
                            </td>

                            {/* FULL AMOUNT */}
                            <td
                              className="border border-slate-200 px-3 py-1 text-right font-extrabold text-xs font-mono text-slate-800 cursor-pointer bg-slate-50/10"
                              onDoubleClick={() => startEditing(row.id, 'fullAmount', row.fullAmount)}
                            >
                              {editingCell?.rowId === row.id && editingCell?.field === 'fullAmount' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveCell}
                                  onKeyDown={handleKeyDown}
                                  placeholder="0.00"
                                  className="w-full text-right py-0.5 outline-hidden text-xs font-bold font-mono bg-yellow-50 text-slate-900 ring-1 ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                row.fullAmount !== null ? formatMoney(row.fullAmount) : ''
                              )}
                            </td>

                            {/* PAID AMOUNT */}
                            <td
                              className="border border-slate-200 px-3 py-1 text-right font-mono text-xs cursor-pointer text-slate-650 font-semibold"
                              onDoubleClick={() => startEditing(row.id, 'paidAmount', row.paidAmount)}
                            >
                              {editingCell?.rowId === row.id && editingCell?.field === 'paidAmount' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveCell}
                                  onKeyDown={handleKeyDown}
                                  placeholder="0.00"
                                  className="w-full text-right py-0.5 outline-hidden text-xs font-mono bg-yellow-50 text-slate-900 ring-1 ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                row.paidAmount ? formatMoney(row.paidAmount) : ''
                              )}
                            </td>

                            {/* REMAINING AMOUNT */}
                            <td className="border border-slate-200 px-3 py-1 text-right font-extrabold font-mono text-xs text-slate-700 bg-slate-55/30">
                              {calculatedRemaining !== null ? (
                                calculatedRemaining <= 0 ? (
                                  <span className="text-emerald-600 font-bold">-</span>
                                ) : (
                                  <span className="text-rose-600 font-extrabold">{formatMoney(calculatedRemaining)}</span>
                                )
                              ) : (
                                <span className="text-slate-400 font-bold">-</span>
                              )}
                            </td>

                            {/* MODE OF PAYMENT */}
                            <td
                              className="border border-slate-200 px-3 py-1 text-xs cursor-pointer text-slate-600 text-left font-semibold"
                              onDoubleClick={() => startEditing(row.id, 'modeOfPayment', row.modeOfPayment)}
                            >
                              {editingCell?.rowId === row.id && editingCell?.field === 'modeOfPayment' ? (
                                <select
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => setTimeout(saveCell, 100)}
                                  className="w-full py-0.5 outline-hidden text-xs bg-yellow-50 ring-1 ring-blue-500 text-slate-900 font-semibold h-[24px]"
                                  autoFocus
                                >
                                  <option value="">Choose Options</option>
                                  <option value="BANK TRANSFER">Bank Transfer</option>
                                  <option value="CHECK / CHEQUE">Check / Cheque</option>
                                  <option value="CASH">Cash</option>
                                  <option value="MADA / DEBIT CARD">Mada / Debit Card</option>
                                  <option value="CREDIT">Saudi Credit</option>
                                </select>
                              ) : (
                                row.modeOfPayment || ''
                              )}
                            </td>

                            {/* LOCATION */}
                            <td
                              className="border border-slate-200 px-3 py-1 text-xs cursor-pointer text-slate-650 text-left font-medium"
                              onDoubleClick={() => startEditing(row.id, 'location', row.location)}
                            >
                              {editingCell?.rowId === row.id && editingCell?.field === 'location' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveCell}
                                  onKeyDown={handleKeyDown}
                                  className="w-full py-0.5 outline-hidden text-xs bg-yellow-50 text-slate-900 ring-1 ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                row.location || ''
                              )}
                            </td>

                            {/* REMARKS */}
                            <td
                              className="border border-slate-200 px-3 py-1 text-[11px] cursor-pointer text-slate-500 text-left font-sans truncate uppercase"
                              onDoubleClick={() => startEditing(row.id, 'remarks', row.remarks)}
                              title={row.remarks || undefined}
                            >
                              {editingCell?.rowId === row.id && editingCell?.field === 'remarks' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveCell}
                                  onKeyDown={handleKeyDown}
                                  className="w-full text-left py-0.5 outline-hidden text-xs bg-yellow-50 text-slate-900 ring-1 ring-blue-500 uppercase"
                                  autoFocus
                                />
                              ) : (
                                row.remarks || ''
                              )}
                            </td>

                            {/* INVOICE */}
                            <td className="border border-slate-200 px-1 py-1 text-center align-middle">
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                id={`invoice-${row.id}`}
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 15 * 1024 * 1024) {
                                    showToast("File too large (max 15MB)", 'error');
                                    e.target.value = '';
                                    return;
                                  }
                                  showToast("Uploading invoice...", 'info');

                                  // Try Supabase Storage first
                                  if (dbConnected) {
                                    try {
                                      const client = getSupabaseClient();
                                      if (client) {
                                        const fileName = `invoices/${row.id}-${file.name}`;
                                        const { error: upErr } = await client.storage.from('invoices').upload(fileName, file, { contentType: file.type, upsert: true });
                                        if (!upErr) {
                                          const { data: { publicUrl } } = client.storage.from('invoices').getPublicUrl(fileName);
                                          setRows(prev => {
                                            const updated = prev.map(r => r.id === row.id ? { ...r, invoiceUrl: publicUrl } : r);
                                            try {
                                              const urls: Record<string, string> = {};
                                              updated.forEach(u => { if (u.invoiceUrl) urls[u.id] = u.invoiceUrl; });
                                              localStorage.setItem('payment_invoice_urls', JSON.stringify(urls));
                                            } catch (_) {}
                                            return updated;
                                          });
                                          showToast("Invoice uploaded", "success");
                                          try { await client.from('rows').update({ invoice_url: publicUrl }).eq('id', row.id); } catch (_) {}
                                          e.target.value = '';
                                          return;
                                        }
                                        console.warn("Storage upload error:", upErr);
                                      }
                                    } catch (e) {
                                      console.warn("Storage upload failed, falling back", e);
                                    }
                                  }

                                  // Fallback: read as data URL
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    try {
                                      const dataUrl = ev.target?.result as string;
                                      setRows(prev => prev.map(r => r.id === row.id ? { ...r, invoiceUrl: dataUrl } : r));
                                      showToast("Invoice attached (local only)", "success");
                                    } catch (err) {
                                      console.error("Invoice attach error:", err);
                                      showToast("Failed to attach invoice", 'error');
                                    }
                                  };
                                  reader.onerror = () => { showToast("Failed to read file", 'error'); };
                                  reader.readAsDataURL(file);
                                  e.target.value = '';
                                }}
                              />
                              {row.invoiceUrl ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setInvoicePreviewUrl(row.invoiceUrl || null)}
                                    className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                                    title="View Invoice"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById(`invoice-${row.id}`) as HTMLInputElement;
                                      if (input) input.click();
                                    }}
                                    className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                    title="Replace Invoice"
                                  >
                                    <Upload className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = document.getElementById(`invoice-${row.id}`) as HTMLInputElement;
                                    if (input) input.click();
                                  }}
                                  className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
                                  title="Upload Invoice"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>

                            {/* Actions column */}
                            <td className="no-export border border-slate-200 py-1 px-2 text-center">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  title="Duplicate Row"
                                  onClick={() => duplicateRow(row)}
                                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Delete Row"
                                  onClick={() => triggerDeleteRow(row.id, row.company || 'unnamed')}
                                  className="p-1 hover:bg-slate-100 text-slate-450 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Section fallback if filter returned empty list */}
                      {sRows.length === 0 && (
                        <tr>
                          <td className="text-center bg-slate-100 border border-slate-200 text-[9px] text-slate-400 select-none">-</td>
                          <td colSpan={10} className="px-4 py-3.5 text-xs italic text-slate-400 text-center border border-slate-200 bg-slate-50/20 font-semibold">
                            No records found matching current status/search filters inside this block.
                          </td>
                          <td className="no-export border border-slate-200 bg-white"></td>
                        </tr>
                      )}

                      {/* Subtotal calculations row block */}
                      <tr className="bg-slate-800 text-white text-[11px] font-bold h-10 select-none">
                        <td className="text-center bg-slate-200 border border-slate-300 text-[9px] font-bold text-slate-500 select-none">
                          {sRows.length + 3 + (secIndex * 12)}
                        </td>
                        <td colSpan={3} className="px-3 border border-slate-700 font-extrabold text-left uppercase text-slate-300 tracking-wider">
                          SUBTOTAL — {section.name}
                        </td>
                        <td className="px-2 border border-slate-700 font-bold text-center tracking-wider text-amber-300 italic">
                          {entriesWithValues} ENTRIES
                        </td>
                        <td className="px-3 border border-slate-700 font-mono text-right text-yellow-300 font-extrabold">
                          {formatMoney(sumFullAmount)}
                        </td>
                        <td className="px-3 border border-slate-700 font-mono text-right text-emerald-300">
                          {formatMoney(sRows.reduce((a, b) => a + (b.paidAmount || 0), 0))}
                        </td>
                        <td className="px-3 border border-slate-700 font-mono text-right text-rose-300 font-extrabold bg-slate-900/60">
                          {formatMoney(sRows.reduce((a, b) => {
                            const rem = b.fullAmount !== null ? b.fullAmount - (b.paidAmount || 0) : 0;
                            return a + (rem > 0 ? rem : 0);
                          }, 0))}
                        </td>
                        <td className="border border-slate-700"></td>
                        <td className="border border-slate-700"></td>
                        <td className="border border-slate-700"></td>
                        <td className="no-export border border-slate-700 bg-slate-850"></td>
                      </tr>

                      {/* Insert Row button card below block */}
                      <tr className="no-export bg-slate-50/30 border-b border-slate-200">
                        <td className="bg-slate-100 border border-slate-200"></td>
                        <td colSpan={10} className="px-4 py-2 border border-slate-200 text-left bg-slate-50/20">
                          {addingRowToSection === section.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                submitNewRow(section.id);
                              }}
                              className="bg-blue-50/40 p-4 rounded-xl border border-blue-100/60 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3"
                            >
                              <div className="space-y-1">
                                <label className="block text-[9px] uppercase font-bold text-slate-505">Line No / ID</label>
                                <input
                                  type="text"
                                  placeholder="Auto"
                                  value={newRowData.no}
                                  onChange={(e) => setNewRowData({ ...newRowData, no: e.target.value })}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-1.5 text-xs font-mono transition-all font-semibold"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[9px] uppercase font-bold text-slate-505">Company *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="ADK DIRECT WORKERS"
                                  value={newRowData.company}
                                  onChange={(e) => setNewRowData({ ...newRowData, company: e.target.value })}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-1.5 text-xs transition-all font-semibold"
                                />
                              </div>

                              <div className="sm:col-span-2 space-y-1">
                                <label className="block text-[9px] uppercase font-bold text-slate-505">Description *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="APRIL 2026 PAYROLL/OT"
                                  value={newRowData.description}
                                  onChange={(e) => setNewRowData({ ...newRowData, description: e.target.value })}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-1.5 text-xs transition-all font-semibold"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[9px] uppercase font-bold text-slate-505">Duration</label>
                                <input
                                  type="text"
                                  placeholder="APR 01-30 2026"
                                  value={newRowData.duration}
                                  onChange={(e) => setNewRowData({ ...newRowData, duration: e.target.value })}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-1.5 text-xs transition-all font-semibold"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[9px] uppercase font-bold text-slate-505">Full Amount ({currencySymbol})</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={newRowData.fullAmount || ''}
                                  onChange={(e) => setNewRowData({
                                    ...newRowData,
                                    fullAmount: e.target.value === '' ? null : parseFloat(e.target.value)
                                  })}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-1.5 text-xs font-mono transition-all font-bold"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[9px] uppercase font-bold text-slate-505">Paid Amount ({currencySymbol})</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={newRowData.paidAmount || ''}
                                  onChange={(e) => setNewRowData({
                                    ...newRowData,
                                    paidAmount: e.target.value === '' ? null : parseFloat(e.target.value)
                                  })}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-1.5 text-xs font-mono transition-all font-semibold"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[9px] uppercase font-bold text-slate-505">Remarks / Status note</label>
                                <input
                                  type="text"
                                  placeholder="TO BE CALCULATED"
                                  value={newRowData.remarks}
                                  onChange={(e) => setNewRowData({ ...newRowData, remarks: e.target.value })}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-1.5 text-xs transition-all font-semibold"
                                />
                              </div>

                              <div className="flex items-end gap-1.5 justify-end sm:col-span-3 md:col-span-1">
                                <button
                                  type="button"
                                  onClick={() => setAddingRowToSection(null)}
                                  className="px-3 py-2 text-xs text-slate-600 bg-white border border-slate-200 hover:bg-slate-55 rounded-lg font-bold transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold shadow-xs transition-all cursor-pointer"
                                >
                                  Add Row
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button
                              id={`btn_add_in_${section.id}`}
                              type="button"
                              onClick={() => setAddingRowToSection(section.id)}
                              className="text-slate-500 hover:text-blue-600 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Insert Row in "{section.name}"</span>
                            </button>
                          )}
                        </td>
                        <td className="no-export border border-slate-200"></td>
                      </tr>
                    </React.Fragment>
                  );
                })}

                {currentSheetSections.length > 0 && (
                  <tr className="no-export bg-slate-50/20 border-t border-slate-200">
                    <td className="bg-slate-100 border border-slate-200 h-10"></td>
                    <td colSpan={10} className="px-4 py-2 border border-slate-200 text-left bg-slate-50/10">
                      <button
                        type="button"
                        onClick={handleAddSection}
                        className="text-slate-500 hover:text-blue-600 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-blue-500" />
                        <span>Add New Section Block</span>
                      </button>
                    </td>
                    <td className="no-export border border-slate-200"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Excel Sheet Tabs Bar */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between no-export select-none text-xs gap-4">
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto py-0.5">
              {sheets.map((sheet) => {
                const isActive = sheet.id === activeSheetId;
                return (
                  <div
                    key={sheet.id}
                    className={`group relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    onClick={() => setActiveSheetId(sheet.id)}
                    onDoubleClick={() => handleRenameSheet(sheet.id)}
                  >
                    <span>{sheet.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameSheet(sheet.id);
                        }}
                        title="Rename Sheet"
                        className={`p-0.5 rounded transition-colors ${isActive ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-400 hover:text-blue-600'
                          }`}
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {sheets.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSheet(sheet.id);
                          }}
                          title="Delete Sheet"
                          className={`p-0.5 rounded transition-colors ${isActive ? 'hover:bg-slate-800 text-slate-350' : 'hover:bg-slate-100 text-slate-400 hover:text-red-500'
                            }`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleCreateSheet}
                className="flex items-center gap-1 px-3.5 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-all font-bold shadow-xs cursor-pointer"
                title="Add New Sheet"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Sheet</span>
              </button>

              <button
                type="button"
                onClick={handleAddSection}
                className="flex items-center gap-1 px-3.5 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-all font-bold shadow-xs cursor-pointer"
                title="Add New Section Block"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section Block</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-450 self-end sm:self-auto bg-slate-200/50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="uppercase text-slate-650">Active: {sheets.find(s => s.id === activeSheetId)?.name || activeSheetId}</span>
              <span className="h-3 w-[1px] bg-slate-300"></span>
              <span>SHEETS: {sheets.length}</span>
            </div>
          </div>

          {/* Month Filter Bar */}
          {allMonths.length > 1 && (
            <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center gap-2 no-export select-none text-xs overflow-x-auto">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Month:</span>
              {allMonths.map(m => (
                <button
                  key={m}
                  onClick={() => setMonthFilter(m)}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${monthFilter === m
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Info footer box */}
        <footer className="mt-8 text-center text-xs text-slate-400 max-w-xl mx-auto space-y-2">
          <p>© 2026 Corporate Payments Audit &amp; Registry Panel.</p>
          <p className="italic">Pro Tip: Double-click cells to quickly update balances. Enable Supabase configurations above to back up registries to cloud networks.</p>
        </footer>

        {/* Custom dialog modals alerts/prompts (no-export) */}
        <CustomDialog
          isOpen={dialogConfig.isOpen}
          type={dialogConfig.type}
          title={dialogConfig.title}
          message={dialogConfig.message}
          defaultValue={dialogConfig.defaultValue}
          placeholder={dialogConfig.placeholder}
          confirmText={dialogConfig.confirmText}
          onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
          onConfirm={dialogConfig.onConfirm}
        />

        {/* Block Selector for PDF Export */}
        {showBlockSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200/80 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left max-h-[80vh] flex flex-col">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" />
                Select Blocks for PDF Export
              </h3>
              <p className="text-xs text-slate-500">Choose which sections to include in the report.</p>

              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setSelectedBlockIds(new Set(sections.map(s => s.id)))} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold text-slate-700 transition-colors cursor-pointer">Select All</button>
                <button type="button" onClick={() => setSelectedBlockIds(new Set())} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold text-slate-700 transition-colors cursor-pointer">Deselect All</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2">
                {sheets.map(sheet => {
                  const sheetSecs = sections.filter(sec => (sec.sheetId || 'sheet-1') === sheet.id);
                  if (sheetSecs.length === 0) return null;
                  const allSelected = sheetSecs.every(sec => selectedBlockIds.has(sec.id));
                  const someSelected = sheetSecs.some(sec => selectedBlockIds.has(sec.id));
                  return (
                    <div key={sheet.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <label className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors text-sm font-bold text-slate-800">
                        <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                          onChange={() => {
                            const next = new Set(selectedBlockIds);
                            sheetSecs.forEach(sec => allSelected ? next.delete(sec.id) : next.add(sec.id));
                            setSelectedBlockIds(next);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                        {sheet.name}
                      </label>
                      <div className="divide-y divide-slate-100">
                        {sheetSecs.map(sec => (
                          <label key={sec.id} className="flex items-center gap-3 px-3 py-2 pl-10 hover:bg-slate-50 cursor-pointer transition-colors text-xs text-slate-700">
                            <input type="checkbox" checked={selectedBlockIds.has(sec.id)}
                              onChange={() => {
                                const next = new Set(selectedBlockIds);
                                next.has(sec.id) ? next.delete(sec.id) : next.add(sec.id);
                                setSelectedBlockIds(next);
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            <span className="font-medium">{sec.name}</span>
                            <span className="text-slate-400 ml-auto">{rows.filter(r => r.sectionId === sec.id).length} rows</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">Page Size:</span>
                  <label className={`px-3 py-1.5 rounded-md cursor-pointer font-bold transition-colors ${pdfFormat === 'A4' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <input type="radio" name="pdfSize" value="A4" checked={pdfFormat === 'A4'} onChange={() => setPdfFormat('A4')} className="sr-only" />
                    A4
                  </label>
                  <label className={`px-3 py-1.5 rounded-md cursor-pointer font-bold transition-colors ${pdfFormat === 'A3' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <input type="radio" name="pdfSize" value="A3" checked={pdfFormat === 'A3'} onChange={() => setPdfFormat('A3')} className="sr-only" />
                    A3
                  </label>
                  <span className="h-4 w-px bg-slate-300 mx-1"></span>
                  <span className="text-slate-500 font-semibold">Month:</span>
                  {allMonths.filter(m => m === 'All' || rows.some(r => r.duration?.startsWith(m))).map(m => (
                    <label key={m} className={`px-3 py-1.5 rounded-md cursor-pointer font-bold transition-colors ${pdfMonthFilter === m ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      <input type="radio" name="pdfMonth" value={m} checked={pdfMonthFilter === m} onChange={() => setPdfMonthFilter(m)} className="sr-only" />
                      {m}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowBlockSelector(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">Cancel</button>
                  <button type="button" onClick={() => handleDownloadPDF(selectedBlockIds)} disabled={selectedBlockIds.size === 0}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${selectedBlockIds.size === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}>
                    Export PDF ({selectedBlockIds.size} sections)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Preview Modal */}
        {invoicePreviewUrl && (
          <InvoicePreview url={invoicePreviewUrl} onClose={() => setInvoicePreviewUrl(null)} />
        )}

        {/* Settings modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSyncLocalData={handleSyncLocalData}
          localStats={localStats}
        />

        {/* Workers Breakdown Modal (no-export) */}
        <WorkerBreakdownModal
          isOpen={breakdownModalRowId !== null}
          rowId={breakdownModalRowId}
          activeRow={activeBreakdownRow}
          currencySymbol={currencySymbol}
          onClose={() => setBreakdownModalRowId(null)}
          onAddWorker={handleAddWorker}
          onUpdateWorker={handleUpdateWorker}
          onDeleteWorker={handleDeleteWorker}
          onUpdateFullAmount={handleUpdateFullAmount}
          onSyncTotalsToParent={handleSyncTotalsToParent}
        />

        {/* Global Add Row Modal */}
        {showGlobalAddRowModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200/80 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600 animate-pulse" />
                Add New Payment Row
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitNewRow(globalAddRowSectionId);
                  setShowGlobalAddRowModal(false);
                }}
                className="space-y-4 text-left"
              >
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Target Block Section *</label>
                  <select
                    value={globalAddRowSectionId}
                    onChange={(e) => setGlobalAddRowSectionId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 outline-hidden transition-all h-[36px] focus:ring-1 focus:ring-blue-500"
                  >
                    {currentSheetSections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Line No / Display ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 1 (optional)"
                      value={newRowData.no}
                      onChange={(e) => setNewRowData({ ...newRowData, no: e.target.value })}
                      className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-xs transition-all font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Company *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ADK DIRECT WORKERS"
                      value={newRowData.company}
                      onChange={(e) => setNewRowData({ ...newRowData, company: e.target.value })}
                      className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-xs transition-all font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JANUARY 2026 PAYROLL/OT"
                    value={newRowData.description}
                    onChange={(e) => setNewRowData({ ...newRowData, description: e.target.value })}
                    className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-xs transition-all font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. JAN 01-31 2026"
                      value={newRowData.duration}
                      onChange={(e) => setNewRowData({ ...newRowData, duration: e.target.value })}
                      className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-xs transition-all font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Full Amount ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newRowData.fullAmount || ''}
                      onChange={(e) => setNewRowData({
                        ...newRowData,
                        fullAmount: e.target.value === '' ? null : parseFloat(e.target.value)
                      })}
                      className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-xs font-mono transition-all font-bold text-slate-850 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Paid Amount ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newRowData.paidAmount || ''}
                      onChange={(e) => setNewRowData({
                        ...newRowData,
                        paidAmount: e.target.value === '' ? null : parseFloat(e.target.value)
                      })}
                      className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-xs font-mono transition-all font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. ADK SEPARATE NOT INCLUDED"
                    value={newRowData.remarks}
                    onChange={(e) => setNewRowData({ ...newRowData, remarks: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-xs transition-all font-semibold text-slate-850 focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowGlobalAddRowModal(false)}
                    className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold shadow-xs transition-all cursor-pointer"
                  >
                    Create Row
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating Toast Notification Center */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none select-none">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 pointer-events-auto min-w-[200px] border-slate-100 ${toast.type === 'error'
                    ? 'bg-rose-50 text-rose-700'
                    : toast.type === 'info'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-800'
                  }`}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-rose-500 animate-pulse' : toast.type === 'info' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}></span>
                <span>{toast.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </main>

    </div>
  );
}

function InvoicePreview({ url, onClose }: { url: string; onClose: () => void }) {
  const isImage = url.startsWith('data:image/') || /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(url);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200/80 max-w-3xl w-full p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Invoice</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer text-slate-400 hover:text-slate-600">
            <span className="text-lg font-bold">&times;</span>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto bg-slate-100 rounded-lg flex items-center justify-center p-2">
          {isImage ? (
            <img src={url} alt="Invoice" className="max-w-full max-h-[70vh] object-contain rounded" />
          ) : (
            <iframe src={url} className="w-full h-[70vh] rounded" title="Invoice" />
          )}
        </div>
      </div>
    </div>
  );
}
