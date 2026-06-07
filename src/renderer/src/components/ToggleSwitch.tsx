import React from 'react'

interface Props {
  checked:  boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?:      string
}

/**
 * Pill-style toggle switch — replaces native checkboxes throughout the settings panel.
 * Uses a hidden <input type="checkbox"> for accessibility; all styling is via CSS.
 */
export function ToggleSwitch({ checked, onChange, disabled = false, id }: Props) {
  return (
    <label className={`toggle${disabled ? ' toggle--disabled' : ''}`}>
      <input
        id={id}
        type="checkbox"
        className="toggle__input"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
    </label>
  )
}
