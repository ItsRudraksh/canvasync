interface UserCursorProps {
  x: number
  y: number
  name: string
}

export function UserCursor({ x, y, name }: UserCursorProps) {
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="flex flex-col items-center">
        <div className="h-4 w-4 rounded-full bg-primary" />
        <div className="mt-1 rounded border bg-background px-2 py-1 text-xs shadow-sm">{name}</div>
      </div>
    </div>
  )
}

