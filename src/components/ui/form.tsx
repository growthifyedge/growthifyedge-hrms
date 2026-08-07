import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface FieldWrapperProps {
  label: string
  error?: string
  required?: boolean
  hint?: string
  id: string
  children: ReactNode
}

function FieldWrapper({ label, error, required, hint, id, children }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass = (hasError?: boolean) =>
  cn(
    'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400',
    'focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100',
    hasError ? 'border-red-400' : 'border-slate-300',
  )

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, required, className, ...rest },
  ref,
) {
  const id = useId()
  return (
    <FieldWrapper label={label} error={error} required={required} hint={hint} id={id}>
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        className={cn(inputClass(!!error), className)}
        {...rest}
      />
    </FieldWrapper>
  )
})

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, required, className, children, ...rest },
  ref,
) {
  const id = useId()
  return (
    <FieldWrapper label={label} error={error} required={required} hint={hint} id={id}>
      <select ref={ref} id={id} aria-invalid={!!error} className={cn(inputClass(!!error), className)} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  )
})

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, error, hint, required, className, ...rest }, ref) {
    const id = useId()
    return (
      <FieldWrapper label={label} error={error} required={required} hint={hint} id={id}>
        <textarea ref={ref} id={id} rows={3} aria-invalid={!!error} className={cn(inputClass(!!error), className)} {...rest} />
      </FieldWrapper>
    )
  },
)

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mb-6">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
