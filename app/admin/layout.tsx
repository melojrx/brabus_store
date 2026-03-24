import { auth } from "@/auth"
import AdminNavigation from "@/components/AdminNavigation"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user?.role !== "ADMIN") {
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
