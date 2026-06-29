import React, { useState } from 'react';
import { 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Briefcase,
  Layers
} from 'lucide-react';
import { motion } from 'motion/react';
import { PaymentRow } from '../types';

interface AnalyticsPanelProps {
  currentSheetRows: PaymentRow[];
  currencySymbol: string;
  totalFullAmount: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
  pendingCount: number;
  paidCount: number;
}

export default function AnalyticsPanel({
  currentSheetRows,
  currencySymbol,
  totalFullAmount,
  totalPaidAmount,
  totalRemainingAmount,
  pendingCount,
  paidCount,
}: AnalyticsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Format currency
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  // 1. Calculate Collection Progress
  const collectionRate = totalFullAmount ? Math.min(100, (totalPaidAmount / totalFullAmount) * 100) : 0;
  
  // Donut chart stroke attributes
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (collectionRate / 100) * circumference;

  // 2. Aggregate data by Company
  const companyMap: { [name: string]: { full: number; paid: number } } = {};
  currentSheetRows.forEach(row => {
    const name = row.company?.trim() || 'Unknown Company';
    if (!companyMap[name]) {
      companyMap[name] = { full: 0, paid: 0 };
    }
    companyMap[name].full += row.fullAmount || 0;
    companyMap[name].paid += row.paidAmount || 0;
  });

  const companyStats = Object.keys(companyMap)
    .map(name => {
      const { full, paid } = companyMap[name];
      const remaining = Math.max(0, full - paid);
      const paidPct = full ? (paid / full) * 100 : 0;
      return { name, full, paid, remaining, paidPct };
    })
    .sort((a, b) => b.full - a.full) // Order by total budget descending
    .slice(0, 5); // Take top 5 companies

  // 3. Aggregate by Mode of Payment
  const modeMap: { [mode: string]: number } = {};
  currentSheetRows.forEach(row => {
    const mode = row.modeOfPayment?.trim() || 'Not Designated';
    modeMap[mode] = (modeMap[mode] || 0) + (row.paidAmount || 0);
  });

  const modeStats = Object.keys(modeMap)
    .map(name => ({ name, value: modeMap[name] }))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs mb-6 text-left">
      {/* Header Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors border-b border-slate-100 cursor-pointer"
      >
        <div className="flex items-center gap-2 text-slate-800">
          <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <h2 className="font-sans font-bold text-sm leading-tight text-slate-900">
              Visual Portfolio Insights &amp; Analytics
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">Real-time charts, collection tracking, and budgets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
            Interactive Live Metrics
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Contents */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6"
        >
          {/* Radial Donut Progress Chart (Col Span 3) */}
          <div className="md:col-span-3 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 pr-0 md:pr-6">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 self-center md:self-start">
              Collections Progress
            </h3>
            
            <div className="relative flex items-center justify-center">
              <svg
                height={radius * 2}
                width={radius * 2}
                className="transform -rotate-90 select-none drop-shadow-sm"
              >
                {/* Background Ring */}
                <circle
                  stroke="#f1f5f9"
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
                {/* Colored Ring */}
                <motion.circle
                  stroke="#10b981"
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{ strokeDashoffset }}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </svg>
              {/* Radial Center percentage */}
              <div className="absolute text-center select-none space-y-0.5">
                <span className="block text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {Math.round(collectionRate)}%
                </span>
                <span className="block text-[8px] font-sans font-bold text-slate-400 uppercase tracking-wide">
                  Paid
                </span>
              </div>
            </div>

            <div className="mt-4 text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <span className="text-sm font-extrabold text-amber-600 block">
                {formatMoney(totalRemainingAmount)} <span className="text-[10px] font-semibold text-slate-400">{currencySymbol}</span>
              </span>
              <span className="text-[9px] text-slate-400 font-medium italic block">
                {pendingCount} rows pending collection
              </span>
            </div>
          </div>

          {/* Company Outstandings Bar Chart (Col Span 5) */}
          <div className="md:col-span-5 flex flex-col justify-start border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 pr-0 md:pr-6">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">
              Outstanding Balance by Company (Top 5)
            </h3>
            
            <div className="space-y-3.5">
              {companyStats.length === 0 ? (
                <div className="text-xs italic text-slate-400 py-8 text-center font-medium">
                  No company data available. Insert rows to populate chart.
                </div>
              ) : (
                companyStats.map(stat => (
                  <div key={stat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 truncate max-w-[200px]" title={stat.name}>
                        {stat.name}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {formatMoney(stat.remaining)} {currencySymbol}
                      </span>
                    </div>
                    {/* Visual Segment Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden">
                      {/* Paid Segment */}
                      <div 
                        style={{ width: `${stat.full ? (stat.paid / stat.full) * 100 : 0}%` }} 
                        className="bg-emerald-500 h-full transition-all duration-500"
                      />
                      {/* Remaining Segment */}
                      <div 
                        style={{ width: `${stat.full ? (stat.remaining / stat.full) * 100 : 0}%` }} 
                        className="bg-amber-500 h-full transition-all duration-500"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Mode Allocation & Metrics (Col Span 4) */}
          <div className="md:col-span-4 flex flex-col justify-start">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">
              Disbursed Sum by Mode of Payment
            </h3>

            <div className="space-y-3 overflow-y-auto max-h-[160px] custom-scrollbar pr-1">
              {modeStats.length === 0 || (modeStats.length === 1 && modeStats[0].name === '') ? (
                <div className="text-xs italic text-slate-400 py-8 text-center font-medium">
                  No payment mode allocations recorded.
                </div>
              ) : (
                modeStats.map(stat => {
                  if (stat.name === '') return null;
                  return (
                    <div 
                      key={stat.name} 
                      className="flex items-center justify-between bg-slate-50/70 border border-slate-100 rounded-lg p-2.5 hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-white rounded border border-slate-200 text-slate-500 text-[10px] font-bold">
                          {stat.name.substring(0, 4)}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                          {stat.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {formatMoney(stat.value)} {currencySymbol}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}
