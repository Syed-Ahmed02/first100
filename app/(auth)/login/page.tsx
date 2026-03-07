"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { useConvex } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/convex/_generated/api"

export default function LoginPage() {
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect,
    user,
  } = useAuth0()
  const router = useRouter()

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/")
    }
  }, [isAuthenticated, router])

  if (isLoading) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold">
          Welcome to HundredUsers
        </CardTitle>
        <CardDescription>
          Sign in to your account or create a new one to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full"
          onClick={() => loginWithRedirect()}
        >
          Log in
        </Button>

        <Separator />

        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            loginWithRedirect({
              authorizationParams: { screen_hint: "signup" },
            })
          }
        >
          Create an account
        </Button>
      </CardContent>
    </Card>
  )
}
