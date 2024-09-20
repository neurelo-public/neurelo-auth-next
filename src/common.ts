
import * as jose from 'jose';
import { AuthContext, Session } from './types';

export function getSessionFromPayload(payload: jose.JWTPayload): Session {
    return {
        user: {
            id: payload.sub as string,
            name: payload.name as string,
            email: payload.email as string,
            image: payload.picture as string,
        },
        provider: payload.provider as string,
        provider_account_id: payload.sub as string,
        refresh_at: new Date((payload as any).refresh_at! * 1000),
        expires: new Date(payload.exp! * 1000),
    };
}

export function getSessionCookieName(context: AuthContext): string {
    return `neurelo_session_${context.environmentId}`;
}