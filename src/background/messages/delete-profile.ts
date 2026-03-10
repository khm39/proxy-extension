import type { PlasmoMessaging } from "@plasmohq/messaging"

import { deactivateProxy, updateBadge } from "~lib/proxy-manager"
import {
  deleteProfile,
  getActiveProfileId
} from "~lib/storage"

export type RequestBody = { profileId: string }
export type ResponseBody = { success: boolean; error?: string }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (req, res) => {
  try {
    const activeId = await getActiveProfileId()
    const { profileId } = req.body

    // アクティブなプロファイルが削除される場合はプロキシも解除
    if (activeId === profileId) {
      await deactivateProxy()
      await updateBadge(null)
    }

    await deleteProfile(profileId)
    res.send({ success: true })
  } catch (e) {
    res.send({ success: false, error: String(e) })
  }
}

export default handler
