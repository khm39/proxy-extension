import type { PlasmoMessaging } from "@plasmohq/messaging"

import { setDevModeCache } from "~lib/dev-mode-cache"
import { getDevMode, setDevMode } from "~lib/storage"

export type RequestBody = { enabled?: boolean }
export type ResponseBody = { devMode: boolean }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (req, res) => {
  try {
    const enabled =
      req.body?.enabled !== undefined
        ? req.body.enabled
        : !(await getDevMode())
    await setDevMode(enabled)
    setDevModeCache(enabled)
    res.send({ devMode: enabled })
  } catch (e) {
    const current = await getDevMode()
    res.send({ devMode: current })
  }
}

export default handler
