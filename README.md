# `@neurelo/auth-next` - NextJS wrapper for Neurelo User Auth

If you have not set up your Neurelo project with User Auth yet, head to https://docs.neurelo.com/guides/guides/user-auth for a guide to get started.

# Usage

First add `@neurelo/auth-next` and your Neurelo TypeScript SDK to your NextJS app.

```
# Copy the downloaded SDK into your app directory if you haven't already
cp ~/Downloads/neurelo-sdk-typescript-cmt....tgz .

# Install packages
npm i --save @neurelo/auth-next ./neurelo-sdk-typescript-cmt_9039d2.tgz
```

Then initialize the package with your SDK configuration.

```.ts
// app/neurelo-auth.ts
import { neureloConfig } from "neurelo-sdk";
import NeureloAuth from "@neurelo/auth-next";

const { getAuthContext } = NeureloAuth({
    neureloConfig,
});

export { getAuthContext };
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

Now you can access the session state in any of your components.

```.tsx
import { useSession } from "@neurelo/auth-next/react";

export default function MyComponent() {
  const { data: session, signIn, signOut } = useSession();

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

For a complete example you can also check out the example [here](https://github.com/neurelo-public/neurelo-auth-next/tree/main/example).

# Development

To develop @neurelo/auth-next first install all the dependencies

```
npm install
```

After that, you can run the example by running

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
[example]   - Local:        http://localhost:1234
[example]   - Environments: .env
[example]
[example]  ✓ Starting...
[example]  ✓ Ready in 1340ms
```