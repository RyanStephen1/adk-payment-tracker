import React, { useState, useMemo } from 'react';
import { 
  Users, 
  X, 
  Download,
  UserPlus, 
  Calendar, 
  Trash2, 
  TrendingUp, 
  RefreshCw,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentRow, WorkerBreakdownItem } from '../types';

interface WorkerBreakdownModalProps {
  isOpen: boolean;
  rowId: string | null;
  activeRow: PaymentRow | undefined;
  currencySymbol: string;
  onClose: () => void;
  onAddWorker: (workerName: string, payDate: string, fullAmount: number, paidAmount: number, remarks: string) => void;
  onUpdateWorker: (workerId: string, workerName: string, payDate: string, fullAmount: number, paidAmount: number, remarks: string) => void;
  onDeleteWorker: (workerId: string) => void;
  onUpdateFullAmount: (valStr: string) => void;
  onSyncTotalsToParent: () => void;
}

export default function WorkerBreakdownModal({
  isOpen,
  rowId,
  activeRow,
  currencySymbol,
  onClose,
  onAddWorker,
  onUpdateWorker,
  onDeleteWorker,
  onUpdateFullAmount,
  onSyncTotalsToParent,
}: WorkerBreakdownModalProps) {
  // Local form state
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPayDate, setNewWorkerPayDate] = useState('');
  const [newWorkerFullAmount, setNewWorkerFullAmount] = useState('');
  const [newWorkerPaidAmount, setNewWorkerPaidAmount] = useState('');
  const [newWorkerRemarks, setNewWorkerRemarks] = useState('');
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [workerFilter, setWorkerFilter] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [workerSort, setWorkerSort] = useState<'default' | 'amount-asc' | 'amount-desc'>('default');
  const [isExporting, setIsExporting] = useState(false);
  const modalContentRef = React.useRef<HTMLDivElement>(null);

  const allWorkers = (activeRow?.workersBreakdown) || [];
  const filteredWorkers = useMemo(() => {
    let list = [...allWorkers];
    if (workerFilter !== 'All') list = list.filter(w => w.status === workerFilter);
    if (workerSort === 'amount-asc') list.sort((a, b) => (a.fullAmount ?? 0) - (b.fullAmount ?? 0));
    else if (workerSort === 'amount-desc') list.sort((a, b) => (b.fullAmount ?? 0) - (a.fullAmount ?? 0));
    return list;
  }, [allWorkers, workerFilter, workerSort]);

  if (!isOpen || !activeRow) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerFullAmount) return;

    const fullAmt = parseFloat(newWorkerFullAmount);
    const paidAmt = parseFloat(newWorkerPaidAmount || '0');
    if (isNaN(fullAmt)) return;

    const payDate = paidAmt > 0 && newWorkerPayDate ? newWorkerPayDate : '';
    if (editingWorkerId) {
      onUpdateWorker(editingWorkerId, newWorkerName.trim(), payDate, fullAmt, paidAmt, newWorkerRemarks.trim());
    } else {
      onAddWorker(newWorkerName.trim(), payDate, fullAmt, paidAmt, newWorkerRemarks.trim());
    }

    setNewWorkerName('');
    setNewWorkerPayDate('');
    setNewWorkerFullAmount('');
    setNewWorkerPaidAmount('');
    setNewWorkerRemarks('');
    setEditingWorkerId(null);
  };

  const generateWorkerReportHtml = (): { html: string; css: string } => {
    const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const workers = filteredWorkers;
    const totalFull = workers.reduce((s, w) => s + w.fullAmount, 0);
    const totalPaid = workers.reduce((s, w) => s + w.paidAmount, 0);
    const totalRemain = totalFull - totalPaid;

    const rowsHtml = workers.map((w, i) => {
      const rem = w.fullAmount - w.paidAmount;
      const status = w.paidAmount >= w.fullAmount ? 'Paid' : 'Pending';
      const badge = status === 'Paid' ? '<span class="sb sb-pd">Paid</span>' : '<span class="sb sb-pn">Pending</span>';
      return `<tr>
        <td class="no">${i + 1}</td>
        <td>${w.workerName}</td>
        <td class="dt">${w.paidAmount > 0 ? (w.payDate || '') : ''}</td>
        <td class="am">${fmt(w.fullAmount)}</td>
        <td class="am">${fmt(w.paidAmount)}</td>
        <td class="am ${rem > 0 ? 'rm-pn' : 'rm-pd'}">${fmt(rem)}</td>
        <td class="st">${badge}</td>
        <td>${w.remarks || '-'}</td>
      </tr>`;
    }).join('');

    const css = `
      @page { margin: 18mm 14mm 22mm; size: A4 portrait; }
      body { margin: 0; padding: 32px; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-weight: 400; color: #1e293b; background: #f8fafc; }
      .rp { max-width: 1060px; margin: 0 auto; }
      .hd { text-align: center; padding: 36px 0 24px; border-bottom: 3px solid #059669; margin-bottom: 28px; }
      .hd h1 { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
      .hd .sub { font-size: 13px; color: #64748b; margin: 0; }
      .hd .dt { font-size: 11px; color: #94a3b8; margin-top: 2px; }

      .info { display: flex; gap: 14px; margin-bottom: 28px; }
      .ic { flex: 1; padding: 16px 18px; border-radius: 8px; background: #fff; border: 1px solid #e2e8f0; }
      .ic .lbl { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; margin-bottom: 3px; }
      .ic .val { font-size: 18px; font-weight: 700; color: #0f172a; }
      .ic-fa { border-top: 3px solid #1e293b; }
      .ic-pd { border-top: 3px solid #059669; }
      .ic-rm { border-top: 3px solid #d97706; }

      table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; }
      thead th { background: #1e293b; color: #fff; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; padding: 9px 10px; text-align: left; }
      thead th.am { text-align: right; }
      thead th.st { text-align: center; }
      tbody td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: 400; }
      tbody tr:nth-child(even) { background: #f8fafc; }
      .no { color: #94a3b8; text-align: center; font-weight: 500; width: 32px; }
      .dt { color: #64748b; white-space: nowrap; }
      .am { text-align: right; font-family: 'Consolas', 'Courier New', monospace; font-weight: 500; white-space: nowrap; }
      .st { text-align: center; }
      .rm-pn { color: #d97706; font-weight: 700; }
      .rm-pd { color: #16a34a; }
      .sb { display: inline-block; padding: 2px 8px; border-radius: 8px; font-size: 9px; font-weight: 600; }
      .sb-pd { background: #dcfce7; color: #166534; }
      .sb-pn { background: #fef3c7; color: #92400e; }

      tfoot td { padding: 8px 10px; background: #fef3c7; font-weight: 800; border-top: 3px solid #d97706; border-bottom: 3px solid #d97706; font-size: 12px; color: #92400e; }
      tfoot td.am { text-align: right; }
      tfoot .lbl { text-align: left; }

      .ft { text-align: center; padding-top: 24px; margin-top: 32px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
    `;

    const html = `<div class="rp">
      <div class="hd">
        <h1>${activeRow.company}</h1>
        <p class="sub">${activeRow.company} &mdash; ${activeRow.description}</p>
        <p class="dt">${activeRow.duration ? `Duration: ${activeRow.duration} &middot; ` : ''}Generated on ${dateStr}</p>
      </div>

      <div class="info">
        <div class="ic ic-fa">
          <div class="lbl">Total Full Amount (SAR)</div>
          <div class="val">${fmt(totalFull)}</div>
        </div>
        <div class="ic ic-pd">
          <div class="lbl">Total Paid Amount (SAR)</div>
          <div class="val">${fmt(totalPaid)}</div>
        </div>
        <div class="ic ic-rm">
          <div class="lbl">Total Remaining (SAR)</div>
          <div class="val">${fmt(totalRemain)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:32px">#</th>
            <th>Worker Name</th>
            <th style="width:100px">Pay Date</th>
            <th style="width:120px" class="am">Full Amount</th>
            <th style="width:120px" class="am">Paid Amount</th>
            <th style="width:110px" class="am">Remaining</th>
            <th style="width:65px" class="st">Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8">No workers recorded.</td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="lbl">Total (${workers.length} workers)</td>
            <td class="am">${fmt(totalFull)}</td>
            <td class="am">${fmt(totalPaid)}</td>
            <td class="am">${fmt(totalRemain)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>

      <div class="ft">${activeRow.company} &middot; Generated on ${dateStr} &middot; Confidential</div>
    </div>`;

    return { html, css };
  };

  const handleDownloadModalPDF = async () => {
    setIsExporting(true);
    const { html, css } = generateWorkerReportHtml();
    const companySlug = (activeRow.company || 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const PDF_SERVER = (window as any).__PDF_SERVER_URL__ || window.location.origin;
    try {
      const resp = await fetch(`${PDF_SERVER}/api/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, css, landscape: false })
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
      link.download = `worker_breakdown_${companySlug}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 3000);
      setIsExporting(false);
    } catch (e) {
      console.error("PDF download failed:", e);
      window.alert(`PDF generation failed.\n\n${e instanceof Error ? e.message : ''}`);
      setIsExporting(false);
    }
  };

  const totalBreakdown = filteredWorkers.reduce((sum, w) => sum + (w.fullAmount ?? (w as any).amount ?? 0), 0);
  const totalCollected = filteredWorkers.reduce((sum, w) => sum + (w.paidAmount ?? 0), 0);
  const totalRemaining = totalBreakdown - totalCollected;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto no-export">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-transparent"
        />

        <motion.div 
          ref={modalContentRef}
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative bg-white rounded-xl shadow-2xl border border-slate-200/80 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-sans font-bold text-sm leading-tight uppercase tracking-wide">
                  Worker Payment Breakdown
                </h3>
                <p className="text-[9px] text-slate-400 font-mono">
                  Line Row ID: {activeRow.id}
                </p>
              </div>
            </div>

            {/* Report Download Suite */}
            <div className="flex items-center gap-2 no-export-modal select-none">
              <button
                type="button"
                onClick={handleDownloadModalPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                title="Download Worker List as PDF Statement"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF Statement</span>
              </button>
              <span className="h-6 w-[1px] bg-slate-700 mx-1"></span>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Close Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
            {/* Details Banner */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs font-semibold">
              <div>
                <span className="block text-slate-400 font-bold uppercase text-[9px] mb-1">Company Name</span>
                <span className="font-bold text-slate-800 text-xs truncate block">{activeRow.company}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold uppercase text-[9px] mb-1">Description</span>
                <span className="text-slate-700 font-semibold text-xs truncate block">{activeRow.description}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold uppercase text-[9px] mb-1">Duration</span>
                <span className="text-slate-600 font-mono text-xs uppercase block">{activeRow.duration || 'Not set'}</span>
              </div>
              <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/60">
                <span className="block text-blue-700 font-extrabold uppercase text-[9px] mb-1">Row Full Payroll ({currencySymbol})</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={activeRow.fullAmount !== null ? activeRow.fullAmount : ''}
                  onChange={(e) => onUpdateFullAmount(e.target.value)}
                  className="w-full bg-white border border-slate-350 rounded-md font-mono font-bold text-slate-800 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-hidden shadow-3xs"
                  title="Adjust overall payroll amount details for this row"
                />
              </div>
              <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/60 flex flex-col justify-center">
                <span className="block text-emerald-800 font-extrabold uppercase text-[9px] mb-0.5">Synced Paid Sum ({currencySymbol})</span>
                <span className="font-mono text-xs font-bold text-emerald-700 block mt-0.5">
                  {activeRow.paidAmount !== null ? `${activeRow.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currencySymbol}` : `0.00 ${currencySymbol}`}
                </span>
              </div>
            </div>

            {/* Form to Add Worker Item */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 no-export-modal hover:bg-slate-100/40 transition-colors">
              <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-750 mb-3.5 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-600 animate-pulse" />
                {editingWorkerId ? 'Edit Worker Entry' : 'Add Worker Entry'}
                {editingWorkerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingWorkerId(null);
                      setNewWorkerName('');
                      setNewWorkerPayDate('');
                      setNewWorkerFullAmount('');
                      setNewWorkerPaidAmount('');
                      setNewWorkerRemarks('');
                    }}
                    className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                  >
                    Cancel edit
                  </button>
                )}
              </h4>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-end">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-400">Worker Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. AL-ZAHID"
                    value={newWorkerName}
                    onChange={(e) => setNewWorkerName(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-semibold transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-400">Pay Date</label>
                  <input 
                    type="date"
                    value={newWorkerPayDate}
                    onChange={(e) => setNewWorkerPayDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-hidden transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-400">Full Amount ({currencySymbol}) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newWorkerFullAmount}
                    onChange={(e) => setNewWorkerFullAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-hidden font-bold transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-400">Paid Amount ({currencySymbol})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={newWorkerPaidAmount}
                    onChange={(e) => setNewWorkerPaidAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-hidden font-bold transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-400">Remarks</label>
                  <input 
                    type="text" 
                    placeholder="Details..."
                    value={newWorkerRemarks}
                    onChange={(e) => setNewWorkerRemarks(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-semibold transition-all"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full px-4 py-1.5 bg-blue-600 hover:bg-blue-750 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center justify-center cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>

            {/* Worker Listing Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-700">
                  Workers ({filteredWorkers.length}/{allWorkers.length})
                </h4>
                <div className="flex items-center gap-2">
                  <select
                    value={workerFilter}
                    onChange={(e) => setWorkerFilter(e.target.value as typeof workerFilter)}
                    className="text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-hidden text-slate-600 cursor-pointer"
                  >
                    <option value="All">All</option>
                    <option value="Paid">Paid only</option>
                    <option value="Pending">Pending only</option>
                  </select>
                  <select
                    value={workerSort}
                    onChange={(e) => setWorkerSort(e.target.value as typeof workerSort)}
                    className="text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-hidden text-slate-600 cursor-pointer"
                  >
                    <option value="default">Default order</option>
                    <option value="amount-asc">Amount ↑</option>
                    <option value="amount-desc">Amount ↓</option>
                  </select>
                </div>
              </div>
              
              <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                      <th className="px-3 py-2.5 w-[50px] text-center">No</th>
                      <th className="px-4 py-2.5">Worker Name</th>
                      <th className="px-4 py-2.5 w-[120px]">Pay Date</th>
                      <th className="px-4 py-2.5 w-[140px] text-right">Full Amount ({currencySymbol})</th>
                      <th className="px-4 py-2.5 w-[140px] text-right">Paid Amount ({currencySymbol})</th>
                      <th className="px-4 py-2.5 w-[120px] text-right">Remaining</th>
                      <th className="px-4 py-2.5 w-[100px] text-center">Status</th>
                      <th className="px-4 py-2.5">Remarks</th>
                      <th className="px-3 py-2.5 w-[60px] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic bg-white font-medium">
                          {allWorkers.length === 0 ? 'No employees/workers listed. Add worker records above.' : 'No workers match the current filter.'}
                        </td>
                      </tr>
                    ) : (
                      filteredWorkers.map((worker, index) => {
                        const fullAmt = worker.fullAmount ?? (worker as any).amount ?? 0;
                        const paidAmt = worker.paidAmount ?? 0;
                        const remaining = fullAmt - paidAmt;
                        return (
                        <tr key={worker.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors bg-white font-medium">
                          <td className="px-3 py-2.5 text-center font-mono text-slate-400 select-none">
                            {index + 1}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-850">
                            {worker.workerName}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {worker.paidAmount > 0 ? (worker.payDate || '') : ''}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-950 text-sm">
                            {fullAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 text-sm">
                            {paidAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-sm">
                            <span className={remaining > 0 ? 'text-amber-600' : remaining < 0 ? 'text-rose-600' : 'text-slate-400'}>
                              {remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              worker.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${worker.status === 'Paid' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                              {worker.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 max-w-[160px] truncate" title={worker.remarks}>
                            {worker.remarks || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingWorkerId(worker.id);
                                  setNewWorkerName(worker.workerName);
                                  setNewWorkerPayDate(worker.payDate);
                                  setNewWorkerFullAmount(String(fullAmt));
                                  setNewWorkerPaidAmount(String(paidAmt));
                                  setNewWorkerRemarks(worker.remarks || '');
                                }}
                                className="p-1 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded transition-colors cursor-pointer"
                                title="Edit Worker"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteWorker(worker.id)}
                                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                                title="Delete Employee Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculation Stats / Sync Widget */}
            {filteredWorkers.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Live Calculation Breakdown Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-6 text-xs text-slate-500 font-mono">
                    <div>
                      <span className="block text-[9px] font-sans font-bold uppercase text-slate-400">Total Full Amount</span>
                      <span className="text-xs font-extrabold text-[#112233]">
                        {totalBreakdown.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currencySymbol}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-sans font-bold uppercase text-slate-400">Total Paid Amount</span>
                      <span className="text-xs font-extrabold text-emerald-600">
                        {totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currencySymbol}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-sans font-bold uppercase text-slate-400">Total Remaining</span>
                      <span className={`text-xs font-extrabold ${totalRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currencySymbol}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center self-end md:self-center">
                  <button
                    type="button"
                    onClick={onSyncTotalsToParent}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync to Main Sheet Row
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 no-export-modal">
            <span className="text-[10px] text-slate-400 font-bold select-none uppercase tracking-wide">
              {filteredWorkers.length} of {allWorkers.length} workers shown
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Close Panel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
