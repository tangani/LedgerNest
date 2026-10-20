import { useCurrencyCatalogue } from '../hooks/useCurrencyCatalogue'
export function CurrencySelect({ value, onChange }: { value: string; onChange: (currency: string) => void }) {
  const currencies = useCurrencyCatalogue()
  return <select value={value} onChange={event => onChange(event.target.value)}>
    {!currencies.some(item => item.code === value) && <option value={value}>{value} · Previously selected</option>}
    {currencies.map(item => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}
  </select>
}
