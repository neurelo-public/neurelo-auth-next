'use client';
import { useSession } from 'neurelo-auth-next/react';
import { useEffect, useState } from 'react';

function SignIn() {
  let { signIn } = useSession();
  return (
    <form action={signIn}>
      <p>You are not logged in</p>
      <button type="submit">Sign in</button>
    </form>
  );
}

function SignOut({ children }: { children: React.ReactNode }) {
  let { signOut } = useSession();
  return (
    <form action={signOut}>
      <p>{children}</p>
      <button type="submit">Sign out</button>
    </form>
  );
}

export default function Page() {
  let { data: session } = useSession();
  let user = session?.user;

  const [refreshIn, setRefreshIn] = useState<number | undefined>();
  useEffect(() => {
    const updateRefreshIn = () => {
      if (session) {
        setRefreshIn((session.refresh_at.getTime() - Date.now()) / 1000);
      }
    };
    updateRefreshIn();
    const interval = setInterval(updateRefreshIn, 1000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <section>
      <h1>Home</h1>
      <div>
        {user ? (
          <SignOut>
            <>
              {`Welcome ${user.name}`}
              <br />
              {`You are signed in with ${session!.provider}`}
              <br />
              {`Your session will expire at ${session!.expires.toLocaleString()}`}
              <br />
              {`Your session will refresh in ${Math.round(refreshIn!)} seconds`}
            </>
          </SignOut>
        ) : (
          <SignIn />
        )}
      </div>
    </section>
  );
}
