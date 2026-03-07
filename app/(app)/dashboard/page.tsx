"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RiAddLine } from "@remixicon/react"

const statusColors: Record<string, string> = {
  draft: "secondary",
  active: "default",
  paused: "outline",
  completed: "secondary",
}

export default function DashboardPage() {
  const projects = useQuery(api.projects.list)
  const user = useQuery(api.users.me)
  const createProject = useMutation(api.projects.create)
  const router = useRouter()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    productDescription: "",
    targetAudience: "",
    goals: "",
  })

  async function handleCreateProject() {
    if (!newProject.name || !newProject.productDescription) return
    setCreating(true)
    try {
      await createProject({
        name: newProject.name,
        productDescription: newProject.productDescription,
        targetAudience: newProject.targetAudience || undefined,
        goals: newProject.goals || undefined,
      })
      setNewProject({
        name: "",
        productDescription: "",
        targetAudience: "",
        goals: "",
      })
      setDialogOpen(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {user && (
            <p className="text-sm text-muted-foreground">
              Welcome back, {user.name}
            </p>
          )}
        </div>
        <NewProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          values={newProject}
          onChange={setNewProject}
          onSubmit={handleCreateProject}
          creating={creating}
        />
      </div>

      {/* Project list */}
      {projects === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-1 h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="mb-1 text-sm font-medium">No projects yet</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Create your first project to start running campaigns.
            </p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <RiAddLine className="mr-1 h-4 w-4" />
              New project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Card
              key={project._id}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => router.push(`/projects/${project._id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge
                    variant={
                      (statusColors[project.status] as "default" | "secondary" | "outline" | "destructive") ??
                      "secondary"
                    }
                  >
                    {project.status}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {project.productDescription}
                </CardDescription>
              </CardHeader>
              {project.targetAudience && (
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Audience: {project.targetAudience}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function NewProjectDialog({
  open,
  onOpenChange,
  values,
  onChange,
  onSubmit,
  creating,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: { name: string; productDescription: string; targetAudience: string; goals: string }
  onChange: (values: { name: string; productDescription: string; targetAudience: string; goals: string }) => void
  onSubmit: () => void
  creating: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <RiAddLine className="h-4 w-4" />
          New project
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
          <DialogDescription>
            Set up a new GTM campaign project.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              placeholder="e.g. Q1 SaaS Launch"
              value={values.name}
              onChange={(e) =>
                onChange({ ...values, name: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-desc">Product description</Label>
            <Textarea
              id="project-desc"
              placeholder="Describe the product or service..."
              rows={3}
              value={values.productDescription}
              onChange={(e) =>
                onChange({
                  ...values,
                  productDescription: e.target.value,
                })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-audience">
              Target audience{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="project-audience"
              placeholder="e.g. B2B SaaS founders"
              value={values.targetAudience}
              onChange={(e) =>
                onChange({
                  ...values,
                  targetAudience: e.target.value,
                })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-goals">
              Goals{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="project-goals"
              placeholder="e.g. Get 100 signups"
              value={values.goals}
              onChange={(e) =>
                onChange({ ...values, goals: e.target.value })
              }
            />
          </div>
          <Button onClick={onSubmit} disabled={creating || !values.name || !values.productDescription}>
            {creating ? "Creating..." : "Create project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
