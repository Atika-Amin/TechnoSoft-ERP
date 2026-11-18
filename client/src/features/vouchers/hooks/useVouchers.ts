import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVoucher,
  getNextVoucherNo,
  getVoucherSetup,
  updateVoucher,
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
