"use client"

import { useState } from "react"
import { WhiteboardEditor } from "./whiteboard-editor"
import { ShareButton } from "./share-button"
import { HeaderMenuWrapper } from "./header-menu-wrapper"
import { UserCounts } from "./user-counts"
import { PageHeader } from "@/components/ui/page-header"

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
      <PageHeader 
        title={whiteboard.title}
        breadcrumbs={[{ label: whiteboard.title }]}
      >
        <div className="flex items-center gap-2 w-full justify-between">
          <UserCounts 
            whiteboardId={whiteboard.id} 
            canEdit={isOwner || isCollaborator} 
            currentUser={{
              id: currentUser.id,
              name: currentUser.name,
            }}
          />
          <div className="flex items-center gap-4">
            {(isOwner || isCollaborator) && <ShareButton whiteboardId={whiteboard.id} />}
            <HeaderMenuWrapper 
              clipboardCount={clipboardCount}
              onClearClipboard={handleClearClipboard}
            />
          </div>
        </div>
      </PageHeader>
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