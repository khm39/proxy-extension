import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getConnectionLogs } from "~lib/storage"
import type { ConnectionLogEntry } from "~lib/types"

export type RequestBody = Record<string, never>
export type ResponseBody = { logs: ConnectionLogEntry[] }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (_req, res) => {
  const logs = await getConnectionLogs()
  res.send({ logs })
}

export default handler
