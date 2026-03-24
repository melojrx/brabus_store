"use client"

import { AlertCircle, CheckCircle2 } from "lucide-react"

export type AdminInlineFeedbackState =
  | {
      type: "success" | "error"
      message: string
    }
  | null

export default function AdminInlineFeedback({
  feedback,
}: {
  feedback: AdminInlineFeedbackState
}) {
  if (!feedback) {
    return null
  }

  const isSuccess = feedback.type === "success"

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          : "border-red-500/20 bg-red-500/10 text-red-200"
      }`}
    >
      {isSuccess ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <p>{feedback.message}</p>
    </div>
  )
}
