"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save } from "lucide-react"
import { createProject } from "./actions"

interface ClientOption {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  country: string | null
  notes: string | null
  status: string
}

interface ProjectFormProps {
  org: { id: string; name: string }
  clients: ClientOption[]
}

export function ProjectForm({ org, clients }: ProjectFormProps) {
  const [clientId, setClientId] = useState("")
  const [clientError, setClientError] = useState("")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!clientId) {
      e.preventDefault()
      setClientError("Please select a client before creating the project")
      return
    }
    setClientError("")
  }

  return (
    <form
      action={createProject}
      className="space-y-6"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="organizationId" value={org.id} />
      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Project Name *</Label>
          <Input id="name" name="name" placeholder="Q4 Website Redesign" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientId">Client *</Label>
          <Select
            value={clientId}
            onValueChange={(value) => {
              setClientId(value)
              setClientError("")
            }}
            name="clientId-select"
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => {
                const name = client.companyName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unnamed"
                return (
                  <SelectItem key={client.id} value={client.id}>{name}</SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {clientError && (
            <p className="text-sm text-red-600 mt-1">{clientError}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue="MEDIUM">
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget">Budget ($)</Label>
          <Input id="budget" name="budget" type="number" placeholder="50000" step="100" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Due Date</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" placeholder="Project description and goals..." />
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" /> Create Project
        </Button>
      </div>
    </form>
  )
}