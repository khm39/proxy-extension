import type { PlasmoMessaging } from "@plasmohq/messaging"

import { exportProfiles } from "~lib/storage"

export type RequestBody = Record<string, never>
export type ResponseBody = { data: string }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (_req, res) => {
  const data = await exportProfiles()
  res.send({ data })
}

export default handler
