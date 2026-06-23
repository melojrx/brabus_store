export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    })

    if (!response.ok) {
      console.error("Telegram send failed:", response.status, await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error("Telegram send error:", error)
    return false
  }
}
