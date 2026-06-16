"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

import { ApiClientError } from "@/lib/api-client";

type UseApiMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiClientError, TVariables>,
  "mutationFn"
> & {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: string[][];
};

export function useApiMutation<TData, TVariables>({
  mutationFn,
  invalidateKeys,
  ...options
}: UseApiMutationOptions<TData, TVariables>): UseMutationResult<
  TData,
  ApiClientError,
  TVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn,
    onSuccess: async (data, variables, context, mutation) => {
      if (invalidateKeys) {
        await Promise.all(
          invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
        );
      }
      if (options.onSuccess) {
        await options.onSuccess(data, variables, context, mutation);
      }
    },
  });
}
