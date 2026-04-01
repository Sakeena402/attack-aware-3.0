'use client';

import { useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/toast-notification';
import { onApiError, ApiError, ErrorCodes, getErrorMessage } from '@/app/services/api';

interface UseApiErrorOptions {
  showToast?: boolean;
  onError?: (error: ApiError) => void;
}

export function useApiError(options: UseApiErrorOptions = {}) {
  const { showToast = true, onError } = options;
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = onApiError((error: ApiError) => {
      // Call custom error handler if provided
      onError?.(error);

      // Skip showing toast for certain errors
      if (!showToast) return;

      // Don't show toast for 401 errors (handled by redirect)
      if (error.statusCode === 401) return;

      // Show appropriate toast based on error type
      const message = getErrorMessage(error);

      switch (error.errorCode) {
        case ErrorCodes.VALIDATION_ERROR:
          toast.warning('Validation Error', message);
          break;
        case ErrorCodes.FORBIDDEN:
          toast.error('Access Denied', message);
          break;
        case ErrorCodes.NOT_FOUND:
          toast.warning('Not Found', message);
          break;
        case ErrorCodes.RATE_LIMIT_EXCEEDED:
          toast.warning('Please Slow Down', message);
          break;
        case ErrorCodes.SERVICE_UNAVAILABLE:
        case ErrorCodes.DB_CONNECTION_ERROR:
          toast.error('Service Unavailable', message);
          break;
        case ErrorCodes.TWILIO_SMS_FAILED:
        case ErrorCodes.TWILIO_CALL_FAILED:
          toast.error('Communication Error', message);
          break;
        default:
          if (error.statusCode >= 500) {
            toast.error('Server Error', message);
          } else if (error.statusCode >= 400) {
            toast.error('Request Failed', message);
          } else {
            toast.error('Error', message);
          }
      }
    });

    return unsubscribe;
  }, [showToast, onError, toast]);
}

// Hook for handling async operations with loading state and error handling
interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  successMessage?: string;
}

export function useAsyncOperation() {
  const toast = useToast();

  const execute = useCallback(
    async <T>(
      operation: () => Promise<{ data: T }>,
      options: UseAsyncOptions<T> = {}
    ): Promise<T | null> => {
      const { onSuccess, onError, successMessage } = options;

      try {
        const result = await operation();
        
        if (successMessage) {
          toast.success('Success', successMessage);
        }
        
        onSuccess?.(result.data);
        return result.data;
      } catch (error) {
        if (error instanceof ApiError) {
          onError?.(error);
          const message = getErrorMessage(error);
          toast.error('Error', message);
        } else {
          toast.error('Error', 'An unexpected error occurred');
        }
        return null;
      }
    },
    [toast]
  );

  return { execute };
}

// Hook for form submissions with proper error handling
export function useFormSubmit() {
  const toast = useToast();

  const submit = useCallback(
    async <T, D>(
      submitFn: (data: D) => Promise<{ data: T }>,
      data: D,
      options: {
        successMessage?: string;
        errorMessage?: string;
        onSuccess?: (data: T) => void;
        onError?: (error: unknown) => void;
      } = {}
    ): Promise<{ success: boolean; data: T | null; error: unknown | null }> => {
      const { successMessage, errorMessage, onSuccess, onError } = options;

      try {
        const result = await submitFn(data);
        
        if (successMessage) {
          toast.success('Success', successMessage);
        }
        
        onSuccess?.(result.data);
        return { success: true, data: result.data, error: null };
      } catch (error) {
        const message = error instanceof ApiError 
          ? getErrorMessage(error) 
          : errorMessage || 'Failed to submit';
        
        toast.error('Error', message);
        onError?.(error);
        
        return { success: false, data: null, error };
      }
    },
    [toast]
  );

  return { submit };
}

export default useApiError;
