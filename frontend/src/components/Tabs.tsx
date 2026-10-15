import { useRef } from 'react'
type TabOption<T extends string> = { value: T; label: string }

export function Tabs<T extends string>({ id, label, options, value, onChange }: {
  id: string
  label: string
  options: readonly TabOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(element) => { buttons.current[index] = element }}
          type="button"
          role="tab"
          id={`${id}-tab-${option.value}`}
          aria-controls={`${id}-panel-${option.value}`}
          aria-selected={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            let next = index
            if (event.key === 'ArrowRight') next = (index + 1) % options.length
            else if (event.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = options.length - 1
            else return
            event.preventDefault()
            const optionToSelect = options[next]
            if (optionToSelect) {
              onChange(optionToSelect.value)
              buttons.current[next]?.focus()
            }
          }}
        >{option.label}</button>
      ))}
    </div>
  )
}

