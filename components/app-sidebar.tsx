"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  RiDashboardLine,
  RiProjectorLine,
  RiSettings3Line,
} from "@remixicon/react"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: RiDashboardLine },
  { label: "Projects", href: "/dashboard", icon: RiProjectorLine },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:block">
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
    </aside>
  )
}
