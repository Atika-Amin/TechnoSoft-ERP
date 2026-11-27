import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createJournal,
  createVoucher,
  getNextJournalNo,
  getNextVoucherNo,
  getVoucherSetup,
  updateJournal,
  updateVoucher,
  type SaveJournalInput,
  type SaveVoucherInput,
  type VoucherType,
} from '../api/vouchers.api';

export const useVoucherSetup = () => useQuery({ queryKey: ['voucher-setup'], queryFn: getVoucherSetup });

// Next free number for this type (and bank, for cheque vouchers)
export const useNextVoucherNo = (type: VoucherType, bank: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['voucher-next', type, bank],
    queryFn: () => getNextVoucherNo(type, bank),
    enabled,
  });

export function useSaveVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    // editNo set → update that voucher; otherwise create a new one
    mutationFn: ({ input, editNo }: { input: SaveVoucherInput; editNo: string | null }) =>
      editNo ? updateVoucher(editNo, input) : createVoucher(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['voucher-next'] }),
  });
}

// Journal numbers restart each day, so the next number depends on the date
export const useNextJournalNo = (date: string, enabled: boolean) =>
  useQuery({ queryKey: ['journal-next', date], queryFn: () => getNextJournalNo(date), enabled });

export function useSaveJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, editNo }: { input: SaveJournalInput; editNo: string | null }) =>
      editNo ? updateJournal(editNo, input) : createJournal(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal-next'] }),
  });
}
