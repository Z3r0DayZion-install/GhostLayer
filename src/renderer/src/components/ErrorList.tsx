import React from 'react'

export interface AppError {
  id:      string
  message: string
  ts:      number
}

interface Props {
  errors:   AppError[]
  onDismiss:(id: string) => void
}

export function ErrorList({ errors, onDismiss }: Props) {
  if (errors.length === 0) return null

  return (
    <ul className="error-list" role="alert" aria-live="polite">
      {errors.map(e => (
        <li key={e.id} className="error-item">
          <span className="error-item__msg">{e.message}</span>
          <button
            className="error-item__dismiss"
            onClick={() => onDismiss(e.id)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  )
}
