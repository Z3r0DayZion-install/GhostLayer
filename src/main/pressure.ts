import os from 'os'
import { getWorkspace } from './workspace'
import type { RAMPressure } from '../shared/types'

const WARN_FREE_BYTES      = 512 * 1024 * 1024  // 512 MB system free
const WARN_CAPACITY_RATIO  = 0.90               // workspace at 90% of cap

export function getRAMPressure(): RAMPressure {
  const ws               = getWorkspace()
  const systemFreeBytes  = os.freemem()
  const workspaceUsed    = ws?.usedBytes  ?? 0
  const workspaceMax     = ws?.maxBytes   ?? 0

  const lowSystem   = systemFreeBytes < WARN_FREE_BYTES
  const highUsage   = workspaceMax > 0 && workspaceUsed / workspaceMax >= WARN_CAPACITY_RATIO

  let pressure: RAMPressure['pressure'] = 'ok'
  if (lowSystem || highUsage)           pressure = 'warn'
  if (lowSystem && highUsage)           pressure = 'critical'

  return {
    workspaceUsedBytes: workspaceUsed,
    workspaceMaxBytes:  workspaceMax,
    systemFreeBytes,
    pressure,
  }
}
