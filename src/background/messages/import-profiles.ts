import type { PlasmoMessaging } from "@plasmohq/messaging"

import { importProfiles } from "~lib/storage"
import type { ProxyProfile } from "~lib/types"

export type RequestBody = { profiles: ProxyProfile[] }
export type ResponseBody = { success: boolean; error?: string }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (req, res) => {
  try {
    await importProfiles(req.body.profiles)
    res.send({ success: true })
  } catch (e) {
    res.send({ success: false, error: String(e) })
  }
}

export default handler
