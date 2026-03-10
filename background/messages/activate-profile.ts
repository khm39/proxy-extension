import type { PlasmoMessaging } from "@plasmohq/messaging"

import {
  applyProfile,
  setupAuthHandler,
  updateBadge
} from "~lib/proxy-manager"
import { getProfiles, setActiveProfileId, setLastError } from "~lib/storage"

export type RequestBody = { profileId: string }
export type ResponseBody = { success: boolean; error?: string }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (req, res) => {
  const { profileId } = req.body

  try {
    const profiles = await getProfiles()
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) {
      res.send({ success: false, error: "Profile not found" })
      return
    }

    await setLastError(null)
    await applyProfile(profile)
    await setActiveProfileId(profile.id)
    await updateBadge(profile)
    setupAuthHandler(profile)

    res.send({ success: true })
  } catch (e) {
    res.send({ success: false, error: String(e) })
  }
}

export default handler
