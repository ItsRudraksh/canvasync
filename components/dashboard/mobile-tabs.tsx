"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { WhiteboardList } from "@/components/whiteboard/whiteboard-list"
import { useState } from "react"

interface MobileTabsProps {
  myWhiteboards: any[]
  sharedWhiteboards: any[]
  publicWhiteboards: any[]
}

export function MobileTabs({ 
  myWhiteboards, 
  sharedWhiteboards, 
  publicWhiteboards 
}: MobileTabsProps) {
  const [activeTab, setActiveTab] = useState("my-whiteboards")
  const [isOpen, setIsOpen] = useState(false)
  
  const tabLabels = {
    "my-whiteboards": "My Whiteboards",
    "shared-whiteboards": "Shared with Me",
    "public-whiteboards": "Public Whiteboards"
  }

  return (
    <div className="mt-6 sm:hidden">
      <Collapsible 
        open={isOpen} 
        onOpenChange={setIsOpen}
        className="w-full"
      >
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="flex w-full justify-between">
            <span className="font-medium">{tabLabels[activeTab as keyof typeof tabLabels]}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 border rounded-md p-2">
          <div className="flex flex-col space-y-2">
            <Button 
              variant={activeTab === "my-whiteboards" ? "default" : "ghost"} 
              className="justify-start"
              onClick={() => {
                setActiveTab("my-whiteboards")
                setIsOpen(false)
              }}
            >
              My Whiteboards
            </Button>
            <Button 
              variant={activeTab === "shared-whiteboards" ? "default" : "ghost"} 
              className="justify-start"
              onClick={() => {
                setActiveTab("shared-whiteboards")
                setIsOpen(false)
              }}
            >
              Shared with Me
            </Button>
            <Button 
              variant={activeTab === "public-whiteboards" ? "default" : "ghost"} 
              className="justify-start"
              onClick={() => {
                setActiveTab("public-whiteboards")
                setIsOpen(false)
              }}
            >
              Public Whiteboards
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      <div className="mt-4">
        {activeTab === "my-whiteboards" && (
          <WhiteboardList whiteboards={myWhiteboards} showOwner={false} listType="my" />
        )}
        
        {activeTab === "shared-whiteboards" && (
          <WhiteboardList whiteboards={sharedWhiteboards} showOwner={true} showAccessLevel={true} listType="shared" />
        )}
        
        {activeTab === "public-whiteboards" && (
          <WhiteboardList whiteboards={publicWhiteboards} showOwner={true} listType="public" />
        )}
      </div>
    </div>
  )
} 