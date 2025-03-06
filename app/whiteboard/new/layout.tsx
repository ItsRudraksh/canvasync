import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create New Whiteboard | CanvaSync",
  description: "Create a new whiteboard for real-time collaboration in CanvaSync",
}

export default function NewWhiteboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 