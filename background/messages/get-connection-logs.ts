import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getConnectionLogs } from "~lib/storage"
import type { ConnectionLogEntry } from "~lib/types"

export type RequestBody = Record<string, never>
export type ResponseBody = { logs: ConnectionLogEntry[] }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (_req, res) => {
  try {
    const logs = await getConnectionLogs()
    res.send({ logs })
  } catch (e) {
    console.error("[ProxySwitcher] Failed to get connection logs:", e)
    res.send({ logs: [] })
  }
}

export default handler
