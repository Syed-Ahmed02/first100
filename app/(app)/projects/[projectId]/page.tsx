"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { RiArrowLeftLine } from "@remixicon/react"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as Id<"projects">
  const project = useQuery(api.projects.get, { projectId })
  const updateStatus = useMutation(api.projects.updateStatus)

  if (project === undefined) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-2 h-4 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (project === null) {
    return (
      <div className="mx-auto max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => router.push("/dashboard")}
        >
          <RiArrowLeftLine className="mr-1 h-4 w-4" />
          Back to dashboard
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Project not found or you don&apos;t have access.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusOptions = ["draft", "active", "paused", "completed"] as const

  return (
    <div className="mx-auto max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => router.push("/dashboard")}
      >
        <RiArrowLeftLine className="mr-1 h-4 w-4" />
        Back to dashboard
      </Button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge
          variant={
            project.status === "active"
              ? "default"
              : project.status === "completed"
                ? "secondary"
                : "outline"
          }
        >
          {project.status}
        </Badge>
      </div>

      <div className="grid gap-4">
        {/* Product */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{project.productDescription}</p>
          </CardContent>
        </Card>

        {/* Target audience */}
        {project.targetAudience && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Target audience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{project.targetAudience}</p>
            </CardContent>
          </Card>
        )}

        {/* Goals */}
        {project.goals && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{project.goals}</p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Campaign sections (placeholder for GTM pipeline) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign pipeline</CardTitle>
            <CardDescription>
              ICP, pain points, messaging, leads, and outreach will appear here
              as the GTM pipeline is implemented.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {["ICP", "Research", "Pain Points", "Messaging", "Leads", "Outreach"].map(
                (stage) => (
                  <div
                    key={stage}
                    className="flex flex-col items-center rounded-lg border border-dashed p-4 text-center"
                  >
                    <p className="text-xs font-medium">{stage}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Coming soon
                    </p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={project.status === status ? "default" : "outline"}
                  disabled={project.status === status}
                  onClick={() =>
                    updateStatus({ projectId: project._id, status })
                  }
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
