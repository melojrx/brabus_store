import { auth } from "@/auth"
import AdminNavigation from "@/components/AdminNavigation"
import { redirect } from "next/navigation"
import { isStaffRole } from "@/lib/auth-guard"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || !isStaffRole(session.user?.role)) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-black md:flex">
      <AdminNavigation />

      <main className="min-w-0 flex-1 bg-background overflow-y-auto">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
