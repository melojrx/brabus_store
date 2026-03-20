import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminNavigation from "@/components/AdminNavigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user?.role !== "ADMIN") {
    redirect('/')
  }

  return (
    <div className="flex bg-black min-h-screen">
      <AdminNavigation />

      <main className="flex-1 min-w-0 bg-background overflow-y-auto">
        <div className="p-4 md:p-8">
           {children}
        </div>
      </main>
    </div>
  )
}
