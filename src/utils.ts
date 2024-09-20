import retry, { Options as RetryOptions } from 'async-retry';
import { useEffect, useMemo, useState } from 'react';

export type { RetryOptions };

export type RetryResult<A> = {
    kind: 'success';
    value: A;
    restart: () => void;
} | {
    kind: 'failure';
    error: Error;
    restart: () => void;
} | {
    kind: 'pending';
};

export function useRetrying<A>(
    action: () => Promise<A>,
    { onRetry, ...optionsRaw }: RetryOptions = {},
): RetryResult<A> {
    const [result, setResult] = useState<RetryResult<A>>({ kind: 'pending' });
    const [retryCounter, setRetryCounter] = useState(0);

    // NOTE: we need to memoize the options object to avoid infinite loops
    const options = useMemo(() => {
        const res: retry.Options = {
            ...optionsRaw,
        };
        if (onRetry) {
            res.onRetry = onRetry;
        }
        return res;
    }, [onRetry, JSON.stringify(optionsRaw)]);

    const restart = () => {
        setRetryCounter(prev => prev + 1);
    };

    useEffect(() => {
        let isCancelled = false;

        const runAction = async () => {
            if (result.kind !== 'pending') {
                setResult({ kind: 'pending' });
            }
            try {
                const value = await retry((bail) => {
                    if (isCancelled) {
                        bail(new Error('cancelled'));
                    }
                    return action();
                }, options);
                if (!isCancelled) {
                    setResult({ kind: 'success', value, restart });
                }
            } catch (error) {
                if (!isCancelled) {
                    setResult({ kind: 'failure', error: error as Error, restart });
                }
            }
        };

        runAction();

        return () => {
            isCancelled = true;
        };
    }, [action, options, retryCounter]);

    return result;
}
