"use client"

import { useState } from "react"
import { WhiteboardEditor } from "./whiteboard-editor"
import { ShareButton } from "./share-button"
import { HeaderMenuWrapper } from "./header-menu-wrapper"
import { UserCounts } from "./user-counts"

interface WhiteboardClientProps {
  whiteboard: any // TODO: Add proper type
  currentUser: {
    id: string
    name: string
    email: string
  }
  isOwner: boolean
  isCollaborator: boolean
  isReadOnly: boolean
}

export function WhiteboardClient({ 
  whiteboard,
  currentUser,
  isOwner,
  isCollaborator,
  isReadOnly
}: WhiteboardClientProps) {
  const [clipboardCount, setClipboardCount] = useState(0);
  const [handleClearClipboard, setHandleClearClipboard] = useState<() => void>(() => {});

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">{whiteboard.title}</h1>
          <UserCounts 
            whiteboardId={whiteboard.id} 
            canEdit={isOwner || isCollaborator} 
            currentUser={{
              id: currentUser.id,
              name: currentUser.name,
            }}
          />
        </div>
        <div className="flex items-center gap-4">
          {(isOwner || isCollaborator) && <ShareButton whiteboardId={whiteboard.id} />}
          <HeaderMenuWrapper 
            clipboardCount={clipboardCount}
            onClearClipboard={handleClearClipboard}
          />
        </div>
      </header>
      <main className="flex-1">
        <WhiteboardEditor
          id={whiteboard.id}
          initialData={whiteboard.content}
          isReadOnly={isReadOnly}
          currentUser={currentUser}
          showExportInToolbar={false}
          onClipboardChange={(count, clearFn) => {
            setClipboardCount(count);
            setHandleClearClipboard(() => clearFn);
          }}
        />
      </main>
    </div>
  )
} 