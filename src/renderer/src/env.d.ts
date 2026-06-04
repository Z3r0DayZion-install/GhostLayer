/// <reference types="vite/client" />

import type { GhostLayerAPI } from '../../preload/index'

declare global {
  interface Window {
    ghostlayer: GhostLayerAPI
  }
}
