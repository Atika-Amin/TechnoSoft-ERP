// The four voucher types of the old ventry form.
// payment: each line is DEBITED and the cash/bank account is CREDITED.
// receipt: the cash/bank account is DEBITED and each line is CREDITED.
export const VOUCHER_TYPES = ['CP', 'CR', 'BP', 'BR'] as const;
export type VoucherType = (typeof VOUCHER_TYPES)[number];

export const TYPE_INFO: Record<VoucherType, { vtype: number; label: string; isBank: boolean; isPayment: boolean }> = {
  CP: { vtype: 1, label: 'Cash Payment', isBank: false, isPayment: true },
  CR: { vtype: 2, label: 'Cash Received', isBank: false, isPayment: false },
  BP: { vtype: 4, label: 'Cheque Payment', isBank: true, isPayment: true },
  BR: { vtype: 5, label: 'Cheque Received', isBank: true, isPayment: false },
};

export const NO_PROJECT = '000000'; // FoxPro used 000000 for "no project on this side"
export const CASH_TYPE = 1; // lcodes.codesign
export const BANK_TYPE = 2;
export const LEDGER_LEVEL = 3; // lcodes.ledlabel
