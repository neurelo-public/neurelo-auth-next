export type AuthContext = {
    readonly authBaseUrl: string;
    readonly environmentId: string;
    readonly verifyToken: (sessionToken: string) => Promise<Session>
}

export type Session = {
    readonly user: {
        readonly id: string;
        readonly name: string;
        readonly email: string;
        readonly image: string;
    };
    readonly provider: string;
    readonly provider_account_id: string;
    readonly refresh_at: Date;
    readonly expires: Date;
}