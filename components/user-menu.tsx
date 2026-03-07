"use client"

import { useAuth0 } from "@auth0/auth0-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function UserMenu() {
  const { user, logout } = useAuth0()

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full outline-none hover:opacity-80">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.picture} alt={user?.name ?? "User"} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col gap-1 px-2 py-1.5">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            logout({ logoutParams: { returnTo: window.location.origin } })
          }
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
