"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";

export function AuthUI() {
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect: login,
    logout: auth0Logout,
    user,
  } = useAuth0();

  const signup = () =>
    login({ authorizationParams: { screen_hint: "signup" } });

  const logout = () =>
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <p className="text-sm">
          Logged in as <strong>{user.email ?? user.name}</strong>
        </p>
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            User profile (JSON)
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-muted p-2">
            {JSON.stringify(user, null, 2)}
          </pre>
        </details>
        <Button variant="outline" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-sm text-destructive">Error: {error.message}</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={signup}>
          Signup
        </Button>
        <Button variant="outline" size="sm" onClick={login}>
          Login
        </Button>
      </div>
    </div>
  );
}
