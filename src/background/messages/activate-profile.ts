import type { PlasmoMessaging } from "@plasmohq/messaging"

import { applyProfile, getAuthFromProfile, updateBadge } from "~lib/proxy-manager"
import { getProfiles, setActiveProfileId } from "~lib/storage"

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

    await applyProfile(profile)
    await setActiveProfileId(profile.id)
    await updateBadge(profile)

    // 認証ハンドラーのセットアップ
    const auth = getAuthFromProfile(profile)
    if (auth) {
      // 認証が必要な場合、service worker の restoreActiveProxy で処理される
      // ここでは設定の保存のみ行う
    }

    res.send({ success: true })
  } catch (e) {
    res.send({ success: false, error: String(e) })
  }
}

export default handler
