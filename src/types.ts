export interface ExcelSheet {
  id: string;
  name: string;
}

export interface WorkerBreakdownItem {
  id: string;
  workerName: string;
  payDate: string;
  fullAmount: number;
  paidAmount: number;
  status: 'Pending' | 'Paid';
  remarks: string;
}

export interface PaymentRow {
  id: string;
  no: string; // Excel display index, can be edited or automatically calculated
  company: string;
  description: string;
  duration: string;
  fullAmount: number | null;
  paidAmount: number | null;
  modeOfPayment: string;
  location: string;
  remarks: string;
  invoiceUrl?: string; // Data URL or storage URL for attached invoice PDF/image
  sectionId: string; // References the table/section group
  workersBreakdown?: WorkerBreakdownItem[]; // List of separate worker breakdowns
}

export interface TableSection {
  id: string;
  name: string; // Name of the section (e.g. "ADK CO LTD")
  sheetId?: string; // References the sheet this section belongs to
}
