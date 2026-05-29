"use client";

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { z } from "zod";

import { apiRequest, ApiClientError } from "@/lib/api-client";
import type { ApiRequestOptions } from "@/lib/api-types";

type UseApiQueryOptions<TResponse> = Omit<
  UseQueryOptions<TResponse, ApiClientError, TResponse, QueryKey>,
  "queryFn" | "queryKey"
> & {
  path: string;
  queryKey: QueryKey;
  request?: ApiRequestOptions;
  schema: z.ZodType<TResponse>;
};

export function useApiQuery<TResponse>({
  path,
  queryKey,
  request,
  schema,
  ...options
}: UseApiQueryOptions<TResponse>): UseQueryResult<TResponse, ApiClientError> {
  return useQuery({
    ...options,
    queryKey,
    queryFn: () => apiRequest(path, schema, request),
  });
}
