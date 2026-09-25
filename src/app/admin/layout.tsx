import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { KnowledgeProvider } from "@/lib/knowledge/KnowledgeContext"
import { CommandPalette } from "./_components/CommandPalette"
import { SupportCard } from "./_components/SupportCard"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role

  if (!session?.user || role !== "ADMIN") {
    redirect("/logowanie")
  }

  return (
    <KnowledgeProvider>
      <div className="min-h-[calc(100vh-80px)] w-full bg-background selection:bg-primary/20">
        <CommandPalette />
        <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-6 flex flex-col xl:flex-row gap-8">
          <main className="flex-1 min-w-0">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {children}
            </div>
          </main>
          <SupportCard />
        </div>
      </div>
    </KnowledgeProvider>
  )
}
