'use client'
import React, { useCallback } from 'react';
import { useState, useEffect } from 'react';
import { AuthContext, Session } from './lib/types';
import { getSessionCookieName } from './lib/common';
export type * from './lib/types';
import { useRetrying } from './lib/utils';
import retry from 'async-retry';
import { useCookies } from 'react-cookie';

export type SessionContextValue = {
    data: Session | null;
    signIn: () => void;
    signOut: () => void;
}

const SessionContext = React.createContext<SessionContextValue | undefined>(undefined);

/**
 * Get the current session in a react component.
 *
 * @example
 * function MyComponent() {
 *   const { data: session, signIn, signOut } = useSession();
 *   if (session) {
 *     return <div>Hello, {session.user.name}!</div>;
 *   } else {
 *     return <button onClick={signIn}>Sign in</button>;
 *   }
 * }
 */
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

/**
 * Top-level react client component for initializing user auth.
 *
 * @example
 * // file: app/layout.tsx
 * import "./globals.css";
 * import { SessionProvider } from "neurelo-auth-next/react";
 * import { getAuthContext } from "./context";
 *
 * export default function RootLayout({
 *   children,
 * }: {
 *   children: React.ReactNode;
 * }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <SessionProvider context={getAuthContext}>
 *           {children}
 *         </SessionProvider>
 *       </body>
 *     </html>
 *   );
 * }
 */
export function SessionProvider({ children, context }: SessionProviderProps) {
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

    const sessionCookieName = authConfig.kind === 'success' ? getSessionCookieName(authConfig.value) : null;
    const [cookies, setCookie, removeCookie, updateCookies] = useCookies();
    const sessionToken: string | null = sessionCookieName ? (cookies[sessionCookieName] ?? null) : null;
    const setSessionToken = (newSessionToken: string | null) => {
        if (!sessionCookieName) {
            console.error('No session cookie name');
            return;
        }
        if (!newSessionToken) {
            console.debug('Removing session token');
            removeCookie(sessionCookieName);
        } else {
            console.debug('Setting session token', newSessionToken);
            setCookie(sessionCookieName, newSessionToken, { sameSite: true });
        }
    }

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
        if (locationHash && locationHash.match(/^#sessionToken=/)) {
            console.debug('Setting session token from hash', locationHash);
            const newSessionToken = locationHash.replace('#sessionToken=', '');
            setSessionToken(newSessionToken);
            setLocationHash(undefined);
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }, [authConfig, locationHash]);

    const [session, setSession] = useState<Session | null>(null);
    // Listen for changes to the session token and update the session
    useEffect(() => {
        if (authConfig.kind !== 'success') {
            return;
        }
        console.debug('Session token changed', sessionToken);
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
            setSession(null);
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
            if (session.expires.getTime() < Date.now()) {
                console.debug('Session expired');
                setSession(null);
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
            authConfig.value.signIn();
        } else {
            console.error('Not ready to sign in yet');
        }
    }, [authConfig]);

    const signOut = useCallback(async () => {
        if (authConfig.kind === 'success') {
            await authConfig.value.signOut();
            updateCookies();
        } else {
            console.error('Not ready to sign out yet');
        }
    }, [authConfig]);

    return (
        <SessionContext.Provider value={{ data: session, signIn, signOut }}>{children}</ SessionContext.Provider>
    )
}