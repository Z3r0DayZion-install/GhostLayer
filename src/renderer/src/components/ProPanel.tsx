import React from 'react'
import { GhostLogo } from './GhostLogo'

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURE YOUR SUITE HERE
// Replace the placeholder entries with your actual paid products.
// ─────────────────────────────────────────────────────────────────────────────
const SUITE_URL = 'https://example.com'  // ← your main landing / storefront URL

interface Tool {
  icon: string           // emoji or short symbol shown in the tile
  name: string
  tagline: string
  href: string           // product page URL (empty = coming soon, no link)
  tier: 'free' | 'pro' | 'soon'
}

const TOOLS: Tool[] = [
  // ── GhostLayer itself (always first, always free) ─────────────────────────
  {
    icon:    '👻',
    name:    'GhostLayer',
    tagline: 'RAM workspace · zero cloud · zero telemetry',
    href:    '',
    tier:    'free',
  },
  // ── Your paid tools — replace these ──────────────────────────────────────
  {
    icon:    '⚡',
    name:    'Tool Name Here',           // ← replace
    tagline: 'One-line pitch goes here', // ← replace
    href:    'https://example.com',      // ← replace with product URL
    tier:    'pro',
  },
  {
    icon:    '🔒',
    name:    'Tool Name Here',
    tagline: 'One-line pitch goes here',
    href:    'https://example.com',
    tier:    'pro',
  },
  {
    icon:    '🛠',
    name:    'Coming Soon',
    tagline: 'More tools in the pipeline',
    href:    '',
    tier:    'soon',
  },
]
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

const openLink = (url: string) => {
  if (url) window.ghostlayer.shell.openExternal(url)
}

export function ProPanel({ onClose }: Props) {
  return (
    <>
      {/* Invisible backdrop — click anywhere outside to close */}
      <div className="pro-panel__backdrop" onClick={onClose} />

      <div className="pro-panel" role="dialog" aria-label="GhostLayer Suite">
        {/* Header */}
        <div className="pro-panel__header">
          <div className="pro-panel__header-top">
            <GhostLogo variant="tray" />
            <span className="pro-panel__suite-label">GHOSTLAYER SUITE</span>
          </div>
          <p className="pro-panel__pitch">Free · Local · No cloud. One of many.</p>
        </div>

        <div className="pro-panel__divider" />

        {/* Tool list */}
        <ul className="pro-panel__tools">
          {TOOLS.map(tool => (
            <li
              key={tool.name}
              className={`pro-panel__tool pro-panel__tool--${tool.tier}`}
              onClick={() => openLink(tool.href)}
              role={tool.href ? 'button' : undefined}
              tabIndex={tool.href ? 0 : undefined}
            >
              <span className="pro-panel__tool-icon">{tool.icon}</span>
              <div className="pro-panel__tool-body">
                <span className="pro-panel__tool-name">{tool.name}</span>
                <span className="pro-panel__tool-tagline">{tool.tagline}</span>
              </div>
              <span className={`pro-panel__badge pro-panel__badge--${tool.tier}`}>
                {tool.tier === 'free' ? 'FREE' : tool.tier === 'pro' ? 'PRO' : '···'}
              </span>
            </li>
          ))}
        </ul>

        <div className="pro-panel__divider" />

        {/* Footer CTA */}
        <button
          className="pro-panel__cta"
          onClick={() => openLink(SUITE_URL)}
        >
          Explore the full suite ↗
        </button>
      </div>
    </>
  )
}
