import type { PlasmoMessaging } from "@plasmohq/messaging"

import { setLastError } from "~lib/storage"

export type RequestBody = Record<string, never>
export type ResponseBody = { success: boolean }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (_req, res) => {
  await setLastError(null)
  res.send({ success: true })
}

export default handler
