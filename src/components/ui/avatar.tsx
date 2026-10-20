"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/utils"

interface AvatarProps {
  name?: string | null
  image?: string | null
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
}

const colorFor = (name?: string | null) => {
  const colors = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-fuchsia-500",
  ]
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ name, image, className, size = "md" }: AvatarProps) {
  const initials = getInitials(name)
  const color = colorFor(name)

  if (image) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-full ring-2 ring-white dark:ring-[var(--background)]",
          sizeClasses[size],
          className
        )}
      >
        <Image
          src={image}
          alt={name || "Avatar"}
          fill
          sizes="(max-width: 768px) 32px, (max-width: 1024px) 40px, 48px"
          className="object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-[var(--background)]",
        color,
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}