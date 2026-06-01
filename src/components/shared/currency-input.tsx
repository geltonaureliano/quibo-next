"use client"

import { Input } from "@/components/ui/input"
import { formatCurrencyMask, parseCurrencyToFloat } from "@/lib/currency"

interface CurrencyInputProps {
  value: string
  onChange: (masked: string, float: number) => void
  placeholder?: string
  id?: string
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  id,
}: CurrencyInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = formatCurrencyMask(e.target.value)
    onChange(masked, parseCurrencyToFloat(masked))
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
        R$
      </span>
      <Input
        id={id}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode="numeric"
        className="pl-9"
      />
    </div>
  )
}
