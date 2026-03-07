"use client"

import Link from "next/link"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { RiMenuLine, RiDashboardLine, RiProjectorLine } from "@remixicon/react"
import { usePathname } from "next/navigation"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: RiDashboardLine },
  { label: "Projects", href: "/dashboard", icon: RiProjectorLine },
]

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent md:hidden">
            <RiMenuLine className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-14 items-center border-b px-4">
              <Link href="/dashboard" className="text-lg font-semibold">
                HundredUsers
              </Link>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.label} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2"
                      size="sm"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Mobile brand */}
        <span className="text-sm font-medium md:hidden">HundredUsers</span>
      </div>
      <UserMenu />
    </header>
  )
}
