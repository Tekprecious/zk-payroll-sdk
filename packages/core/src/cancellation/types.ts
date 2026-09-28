/**
 * Errors and helpers for caller-driven cancellation of SDK operations.
 *
 * Cancellation never echoes payroll values, recipient identifiers, or any
 * other sensitive data — only the stable operation name is included.
 */

/** 
 * Closed set of safe, non-identifying reason codes for an operation cancellation.
 * We restrict this list to ensure that sensitive payroll or PII values do not 
 * leak into logs via user-supplied cancellation text.
 */
export const CANCELLATION_REASON_CODES = [
  "USER_ABORTED",
  "TIMEOUT",
  "NETWORK_ERROR",
  "APP_BACKGROUNDED",
  "INSUFFICIENT_FUNDS",
  "OTHER",
] as const;

export type CancellationReasonCode = typeof CANCELLATION_REASON_CODES[number];

/**
 * Validates whether a given string is a recognized cancellation reason code.
 */
export function isCancellationReasonCode(value: unknown): value is CancellationReasonCode {
  return typeof value === "string" && (CANCELLATION_REASON_CODES as readonly string[]).includes(value);
}

/**
 * Sanitizes a reason into a recognized `CancellationReasonCode`.
 * Unrecognized reasons become "OTHER", protecting sensitive values.
 */
export function sanitizeCancellationReason(reason: unknown): CancellationReasonCode {
  if (isCancellationReasonCode(reason)) {
    return reason;
  }
  return "OTHER";
}

export class OperationCancelledError extends Error {
  public readonly code = "OPERATION_CANCELLED";
  public readonly reasonCode: CancellationReasonCode;

  constructor(operationName: string, reason?: unknown) {
    super(`Operation "${operationName}" was cancelled by the caller.`);
    this.name = "OperationCancelledError";
    this.reasonCode = sanitizeCancellationReason(reason);
  }
}

export interface CancellableOptions {
  /**
   * Optional AbortSignal. When aborted, any pending operation rejects with
   * `OperationCancelledError`. Passing no signal preserves existing behavior.
   */
  readonly signal?: AbortSignal;
}

/**
 * Throws `OperationCancelledError` if the signal is already aborted.
 * Call this at the top of any cancellable code path and at the top of
 * each iteration of a polling loop.
 */
export function throwIfAborted(
  signal: AbortSignal | undefined,
  operation: string,
): void {
  if (signal?.aborted) {
    throw new OperationCancelledError(operation, signal.reason);
  }
}
