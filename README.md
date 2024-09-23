# `@neurelo/auth-next` - NextJS wrapper for Neurelo User Auth

If you have not set up your Neurelo project with User Auth yet, head to https://docs.neurelo.com/guides/guides/user-auth for a guide to get started.

# Usage

First add `@neurelo/auth-next` and your Neurelo TypeScript SDK to your NextJS app.

```
# Copy the downloaded SDK into your app directory if you haven't already
cp ~/Downloads/neurelo-sdk-typescript-cmt....tgz .

# Install packages
npm i --save @neurelo/auth-next ./neurelo-sdk-typescript-cmt....tgz
```

Then initialize the package with your SDK configuration.

```.ts
// app/neurelo-auth.ts
import { neureloConfig } from "neurelo-sdk";
import NeureloAuth from "@neurelo/auth-next";

const { getAuthContext, getSession, signIn, signOut } = NeureloAuth({
  neureloConfig,
});

export { getAuthContext, getSession, signIn, signOut };
```

As a last step, add the `SessionProvider` the root layout.

```.tsx
// app/layout.tsx
import { SessionProvider } from "@neurelo/auth-next/react";
import { getAuthContext } from "./neurelo-auth";

...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider context={getAuthContext}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

## Client Components

You can access the session state in client components using the `useSession` hook.

```.tsx
import { useSession } from "@neurelo/auth-next/react";

export default function MyComponent() {
  const { session, signIn, signOut } = useSession();

  return (
    <div>
      {session ? (
        <button onClick={signOut}>Sign out</button>
      ) : (
        <button onClick={signIn}>Sign in</button>
      )}
    </div>
  );
}
```

## Server Components

To get and manipulate the session you can use the functions returned and re-exported from `NeureloAuth` directly.

```.ts
import { getSession, signIn, signOut } from './context';
```

## Example

For a complete example you can also check out the example [here](https://github.com/neurelo-public/neurelo-auth-next/tree/main/example). The easiest way to run this is to follow the [Development](#development) section.

# Development

To develop @neurelo/auth-next you will need a project set up for auth (see https://docs.neurelo.com/guides/guides/user-auth).

After you set up your environment, create a `.env` file from the example

```
# Copy the example environment
cp example/.env.example example/.env
# Fill in the environment
vim example/.env
```

After that, you will need to install the dependencies.

```
npm install
```

Now you are ready to run the example project in dev-mode

```
npm run dev
```

This will watch for code-changes in both the library and the example so that you can debug live.

```
5:04:54 PM - Starting compilation in watch mode...
[build]
[example]
[example] > dev
[example] > next dev
[example]
[build]
[build] 5:04:54 PM - Found 0 errors. Watching for file changes.
[example]   ▲ Next.js 14.2.12
[example]   - Local:        http://localhost:3000
[example]   - Environments: .env
[example]
[example]  ✓ Starting...
[example]  ✓ Ready in 1340ms
```
