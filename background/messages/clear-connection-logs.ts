import type { PlasmoMessaging } from "@plasmohq/messaging"

import { clearConnectionLogs } from "~lib/storage"

export type RequestBody = Record<string, never>
export type ResponseBody = { success: boolean }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (_req, res) => {
  try {
    await clearConnectionLogs()
    res.send({ success: true })
  } catch (e) {
    console.error("[ProxySwitcher] Failed to clear connection logs:", e)
    res.send({ success: false })
  }
}

export default handler
