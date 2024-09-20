'use client'
import React, { useCallback } from 'react';
import { useState, useEffect } from 'react';
import { AuthContext, Session } from './lib/types';
import { getSessionCookieName } from './lib/common';
export type * from './lib/types';
import Cookies from 'universal-cookie';
import { useRetrying } from './lib/utils';
import retry from 'async-retry';

export type SessionContextValue = {
    data: Session | null;
    signIn: () => void;
    signOut: () => void;
}

const SessionContext = React.createContext<SessionContextValue | undefined>(undefined);

export function useSession(): SessionContextValue {
    const context = React.useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
}

export type SessionProviderProps = {
    context: AuthContext | Promise<AuthContext> | (() => AuthContext | Promise<AuthContext>);
    children: React.ReactNode;
}

export function SessionProvider({ children, context }: SessionProviderProps) {
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [locationHash, setLocationHash] = useState(undefined as string | undefined);

    const getContext = useCallback(async () => {
        if (typeof context === 'function') {
            context = context();
        }
        if (context instanceof Promise) {
            return await context;
        }
        return context;
    }, [context]);
    const authConfig = useRetrying(getContext);

    useEffect(() => {
        console.debug('Setting up hash listener');
        setLocationHash(window.location.hash);
        const handleHashChange = () => {
            setLocationHash(window.location.hash);
        }
        window.addEventListener('popstate', handleHashChange);
        return () => {
            window.removeEventListener('popstate', handleHashChange);
        }
    }, []);

    useEffect(() => {
        if (authConfig.kind !== 'success') {
            return;
        }
        const cookieName = getSessionCookieName(authConfig.value);
        const cookies = new Cookies();
        const sessionTokenCurrent = cookies.get(cookieName);
        if (locationHash && locationHash.match(/^#sessionToken=/)) {
            console.debug('Setting session token from hash');
            const newSessionToken = locationHash.replace('#sessionToken=', '');
            cookies.set(cookieName, newSessionToken, { sameSite: true });
            history.replaceState(null, '', window.location.pathname + window.location.search);
            setSessionToken(newSessionToken);
        } else if (sessionTokenCurrent && !sessionToken) {
            console.debug('Setting session token from cookie');
            setSessionToken(sessionTokenCurrent);
        }
    }, [authConfig, locationHash]);

    const [session, setSession] = useState<Session | null>(null);
    // Listen for changes to the session token and update the session
    useEffect(() => {
        if (authConfig.kind !== 'success') {
            return;
        }
        console.debug('Session token changed');
        if (sessionToken) {
            const doVerify = async () => {
                console.debug('Verifying session token');
                try {
                    const session = await authConfig.value.verifyToken(sessionToken);
                    console.debug('Session verified', session);
                    setSession(session);
                } catch (error) {
                    console.error('Error verifying session token', error);
                }
            }
            doVerify();
        } else {
            console.debug('No session token');
        }
    }, [sessionToken]);

    // Run a periodic task to refresh the session
    useEffect(() => {
        if (!session || authConfig?.kind !== 'success') {
            return;
        }
        const refreshAt = session.refresh_at;
        const delay = refreshAt.getTime() - Date.now()
        let bailFn: ((error: Error) => void) | undefined;
        const timeout = setTimeout(async () => {
            const cookies = new Cookies();
            if (session.expires.getTime() < Date.now()) {
                console.debug('Session expired');
                setSession(null);
                cookies.remove(getSessionCookieName(authConfig.value));
                setSessionToken(null);
                return;
            }
            console.debug('Refreshing session');
            try {
                await retry(async (bail) => {
                    bailFn = bail;
                    const newSessionRes = await fetch(authConfig.value.authBaseUrl + '/session', {
                        headers: {
                            Authorization: `Bearer ${sessionToken}`,
                        },
                    });
                    if (!newSessionRes.ok) {
                        console.error('Error refreshing session', newSessionRes);
                        const error = new Error('Error refreshing session');
                        (error as any).response = newSessionRes;
                        throw error;
                    }
                    const newSessionToken = newSessionRes.headers.get('X-Session-Token');
                    if (!newSessionToken) {
                        console.error('No new session token, headers:', newSessionRes.headers);
                        const error = new Error('No new session token');
                        (error as any).response = newSessionRes;
                        throw error;
                    }
                    setSessionToken(newSessionToken);
                }, {
                    onRetry: (error, attempt) => {
                        console.debug('Retried finish', { error, attempt });
                    }
                });
            } catch (error) {
                console.error('Error refreshing session', error);
            }
        }, delay);
        return () => {
            clearTimeout(timeout);
            if (bailFn) {
                bailFn(new Error('Cancelled refresh because component unmounted'));
            }
        }
    }, [authConfig, session])

    const signIn = useCallback(() => {
        if (authConfig.kind === 'success') {
            window.location.href = authConfig.value!.authBaseUrl + '/signin';
        } else {
            console.error('Not ready to sign in yet');
        }
    }, [authConfig]);

    const signOut = useCallback(() => {
        if (authConfig.kind !== 'success') {
            debugger
            console.error('Not ready to sign out yet');
            return;
        }
        const cookieName = getSessionCookieName(authConfig.value);
        // FIXME: This should be a configuration option
        const cookies = new Cookies();
        cookies.remove(cookieName);
        setSession(null);
    }, [authConfig]);

    return (
        <SessionContext.Provider value={{ data: session, signIn, signOut }}>{children}</ SessionContext.Provider>
    )
}