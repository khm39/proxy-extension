import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getDevMode, setDevMode } from "~lib/storage"

export type RequestBody = { enabled?: boolean }
export type ResponseBody = { devMode: boolean }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (req, res) => {
  const enabled =
    req.body?.enabled !== undefined ? req.body.enabled : !(await getDevMode())
  await setDevMode(enabled)
  res.send({ devMode: enabled })
}

export default handler
