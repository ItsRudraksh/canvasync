interface UserCursorProps {
  x: number
  y: number
  name: string
  className?: string
}

export function UserCursor({ x, y, name, className }: UserCursorProps) {
  return (
    <div
      className={`absolute pointer-events-none ${className || ''}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="flex flex-col items-center">
        <div className="h-4 w-4 rounded-full bg-blue-500" />
        <div className="mt-1 rounded-md bg-blue-500 px-1.5 py-0.5 text-xs text-white">
          {name}
        </div>
      </div>
    </div>
  )
}

