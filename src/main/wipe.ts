import { destroyWorkspace, getWorkspace } from './workspace'
import { clearManifest } from './staging'
import { persistAutoWipe } from './crash'

/** Full workspace wipe — RAM cleared, manifest reset. No disk I/O. */
export function discardAll(): void {
  destroyWorkspace()
  clearManifest()
}

/** Toggle auto-wipe and immediately persist the preference (GL-602). */
export function toggleAutoWipe(enabled: boolean): void {
  const ws = getWorkspace()
  if (ws) ws.autoWipe = enabled
  persistAutoWipe(enabled)   // survive restart even if workspace is later destroyed
}

export function shouldWipeOnExit(): boolean {
  return getWorkspace()?.autoWipe ?? false
}
