import { forwardRef, useState } from 'react'

const buttonClasses = {
  primary: 'button button-primary',
  secondary: 'button button-secondary',
  ghost: 'button button-ghost',
}

export const PrimaryButton = forwardRef(function PrimaryButton({ className = '', ...props }, ref) {
  return <button ref={ref} className={`${buttonClasses.primary} ${className}`.trim()} {...props} />
})

export const SecondaryButton = forwardRef(function SecondaryButton({ className = '', ...props }, ref) {
  return <button ref={ref} className={`${buttonClasses.secondary} ${className}`.trim()} {...props} />
})

export const GhostButton = forwardRef(function GhostButton({ className = '', ...props }, ref) {
  return <button ref={ref} className={`${buttonClasses.ghost} ${className}`.trim()} {...props} />
})

export function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return <Component className={`glass-card ${className}`.trim()} {...props}>{children}</Component>
}

export function NumericInput({ value, onChange, defaultValue = 0, ...props }) {
  const [draft, setDraft] = useState(value ?? '')
  const [editing, setEditing] = useState(false)

  const focus = (event) => {
    setDraft(value ?? '')
    setEditing(true)
    if (Number(value) === 0) event.target.select()
    props.onFocus?.(event)
  }

  const change = (event) => {
    setDraft(event.target.value)
    onChange(event.target.value)
  }

  const blur = (event) => {
    setEditing(false)
    if (draft === '') {
      setDraft(defaultValue)
      onChange(defaultValue)
    }
    props.onBlur?.(event)
  }

  return <input {...props} type="number" value={editing ? draft : value ?? ''} onFocus={focus} onChange={change} onBlur={blur} />
}
