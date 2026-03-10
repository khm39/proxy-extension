/** devMode のメモリキャッシュ（毎リクエストのストレージ読み込みを回避） */
let devModeCache = false

export function setDevModeCache(enabled: boolean): void {
  devModeCache = enabled
}

export function getDevModeCache(): boolean {
  return devModeCache
}
