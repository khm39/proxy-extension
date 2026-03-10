import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getState } from "~lib/storage"
import type { AppState } from "~lib/types"

export type RequestBody = Record<string, never>
export type ResponseBody = AppState

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (_req, res) => {
  try {
    const state = await getState()
    res.send(state)
  } catch (e) {
    console.error("[ProxySwitcher] Failed to get state:", e)
    res.send({
      profiles: [],
      activeProfileId: null,
      lastError: null,
      devMode: false
    })
  }
}

export default handler
