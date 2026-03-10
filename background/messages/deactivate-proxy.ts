import type { PlasmoMessaging } from "@plasmohq/messaging"

import { deactivateProxy, setupAuthHandler, updateBadge } from "~lib/proxy-manager"
import { setActiveProfileId, setLastError } from "~lib/storage"

export type RequestBody = Record<string, never>
export type ResponseBody = { success: boolean; error?: string }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (_req, res) => {
  try {
    await setLastError(null)
    await deactivateProxy()
    await setActiveProfileId(null)
    await updateBadge(null)
    setupAuthHandler(null)
    res.send({ success: true })
  } catch (e) {
    res.send({ success: false, error: String(e) })
  }
}

export default handler
