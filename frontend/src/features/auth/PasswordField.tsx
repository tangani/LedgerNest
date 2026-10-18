import { useState } from 'react'
import './PasswordField.css'

type Props = {
  label: string
  name: string
  autoComplete: 'new-password' | 'current-password'
  minLength?: number
  maxLength: number
  describedBy?: string
}

export function PasswordField({
  label, name, autoComplete, minLength, maxLength, describedBy,
}: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-field">
      <label htmlFor={name}>{label}</label>
      <div className="password-input-wrap">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          minLength={minLength}
          maxLength={maxLength}
          aria-describedby={describedBy}
          required
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-controls={name}
          onClick={() => setVisible((current) => !current)}
        >
          <svg
            width="22" height="22" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" focusable="false"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M3 3 21 21" />}
          </svg>
        </button>
      </div>
    </div>
  )
}
