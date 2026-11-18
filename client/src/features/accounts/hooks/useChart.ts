import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAccount, getAccounts, updateAccount, type AccountInput } from '../api/chart.api';

export const useAccounts = () => useQuery({ queryKey: ['chart'], queryFn: getAccounts });

export function useSaveAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    // editCode set → update that account; otherwise create a new one
    mutationFn: ({ account, editCode }: { account: AccountInput; editCode: string | null }) =>
      editCode ? updateAccount(editCode, account) : createAccount(account),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chart'] }),
  });
}
