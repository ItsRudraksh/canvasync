"use client"

import { ReactNode } from "react"
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface Crumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  children?: ReactNode
  breadcrumbs?: Crumb[]
}

export function PageHeader({ title, children, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="flex flex-col border-b bg-background">
      {breadcrumbs && (
        <div className="md:hidden px-4 py-2 border-b">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="text-sm">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb, index) => (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem key={index}>
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href} className="text-sm">
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-sm font-medium truncate">
                        {crumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}
      <div className="flex h-16 items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold hidden md:block">{title}</h1>
          {children}
        </div>
      </div>
    </header>
  )
} 