/**
 * Manual rubric hooks — Orval skips Rubric/RubricCriterion schemas.
 * These use the same customFetch + TanStack Query pattern as generated hooks.
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { Rubric, RubricCriterion } from "./generated/api.schemas";
import type { ErrorType } from "./custom-fetch";

type Awaited<T> = T extends PromiseLike<infer T> ? T : never;

const getRubricUrl = (projectId: number, quizId: number) =>
  `/api/projects/${projectId}/quizzes/${quizId}/rubric`;

const getRubric = async (
  projectId: number,
  quizId: number
): Promise<Rubric> => {
  return customFetch<Rubric>(getRubricUrl(projectId, quizId), {
    method: "GET",
  });
};

const generateRubric = async (
  projectId: number,
  quizId: number,
  data: { manualNotes?: string }
): Promise<Rubric> => {
  return customFetch<Rubric>(getRubricUrl(projectId, quizId), {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
};

const updateRubric = async (
  projectId: number,
  quizId: number,
  data: { criteria?: RubricCriterion[]; manualNotes?: string }
): Promise<Rubric> => {
  return customFetch<Rubric>(getRubricUrl(projectId, quizId), {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
};

const deleteRubric = async (
  projectId: number,
  quizId: number
): Promise<void> => {
  return customFetch<void>(getRubricUrl(projectId, quizId), {
    method: "DELETE",
  });
};

export const getRubricQueryKey = (projectId: number, quizId: number) => [
  getRubricUrl(projectId, quizId),
];

export type GetRubricQueryResult = NonNullable<
  Awaited<ReturnType<typeof getRubric>>
>;
export type GetRubricQueryError = ErrorType<void>;

export function useGetRubric<
  TData = Awaited<ReturnType<typeof getRubric>>,
  TError = ErrorType<void>
>(
  projectId: number,
  quizId: number,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getRubric>>,
      TError,
      TData
    >;
  }
) {
  const queryKey = getRubricQueryKey(projectId, quizId);
  return useQuery({
    queryKey,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      getRubric(projectId, quizId),
    enabled: projectId != null && quizId != null,
    ...options?.query,
  }) as UseQueryOptions<TData, TError> extends never
    ? never
    : ReturnType<
        typeof useQuery<
          TData,
          TError,
          TData,
          QueryKey
        >
      >;
}

export type GenerateRubricMutationResult = NonNullable<
  Awaited<ReturnType<typeof generateRubric>>
>;
export type GenerateRubricMutationError = ErrorType<void>;

export function useGenerateRubric<
  TError = ErrorType<void>,
  TContext = unknown
>(
  projectId: number,
  quizId: number,
  options?: {
    mutation?: UseMutationOptions<
      Awaited<ReturnType<typeof generateRubric>>,
      TError,
      { data: { manualNotes?: string } },
      TContext
    >;
  }
) {
  return useMutation<
    Awaited<ReturnType<typeof generateRubric>>,
    TError,
    { data: { manualNotes?: string } },
    TContext
  >({
    mutationFn: (props) =>
      generateRubric(projectId, quizId, props.data),
    ...options?.mutation,
  });
}

export type UpdateRubricMutationResult = NonNullable<
  Awaited<ReturnType<typeof updateRubric>>
>;
export type UpdateRubricMutationError = ErrorType<void>;

export function useUpdateRubric<
  TError = ErrorType<void>,
  TContext = unknown
>(
  projectId: number,
  quizId: number,
  options?: {
    mutation?: UseMutationOptions<
      Awaited<ReturnType<typeof updateRubric>>,
      TError,
      { data: { criteria?: RubricCriterion[]; manualNotes?: string } },
      TContext
    >;
  }
) {
  return useMutation<
    Awaited<ReturnType<typeof updateRubric>>,
    TError,
    { data: { criteria?: RubricCriterion[]; manualNotes?: string } },
    TContext
  >({
    mutationFn: (props) => updateRubric(projectId, quizId, props.data),
    ...options?.mutation,
  });
}

export type DeleteRubricMutationResult = NonNullable<
  Awaited<ReturnType<typeof deleteRubric>>
>;
export type DeleteRubricMutationError = ErrorType<void>;

export function useDeleteRubric<
  TError = ErrorType<void>,
  TContext = unknown
>(
  projectId: number,
  quizId: number,
  options?: {
    mutation?: UseMutationOptions<
      Awaited<ReturnType<typeof deleteRubric>>,
      TError,
      void,
      TContext
    >;
  }
) {
  return useMutation<
    Awaited<ReturnType<typeof deleteRubric>>,
    TError,
    void,
    TContext
  >({
    mutationFn: () => deleteRubric(projectId, quizId),
    ...options?.mutation,
  });
}
