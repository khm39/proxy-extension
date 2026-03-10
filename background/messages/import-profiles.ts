import type { PlasmoMessaging } from "@plasmohq/messaging"

import { importProfiles } from "~lib/storage"

export type RequestBody = { profiles: unknown[] }
export type ResponseBody = {
  success: boolean
  imported?: number
  skipped?: number
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (req, res) => {
  try {
    const { imported, skipped } = await importProfiles(req.body.profiles)
    res.send({ success: true, imported, skipped })
  } catch (e) {
    res.send({ success: false, error: String(e) })
  }
}

export default handler
