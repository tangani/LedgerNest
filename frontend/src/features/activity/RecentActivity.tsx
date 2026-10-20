import type { Activity, ExchangeRate } from '../../models/ledger'
import { money, dateLabel } from '../../lib/formatters'
import { ConvertedAmount } from '../../components/ConvertedAmount'
export function RecentActivity({ activity, currency, rate }: { activity: Activity[]; currency: string; rate?: ExchangeRate }) {
  return <><div className="section-heading"><h2>Recent activity</h2><p>Record changes and payments, newest first by date.</p></div>
    <ul className="activity-list">{[...activity].sort((a, b) => b.date.localeCompare(a.date)).map((item) => <li key={item.id}><div><time dateTime={item.date}>{dateLabel(item.date)}</time><h3>{item.title}</h3><p>{item.detail}</p></div><strong>{money(item.amount, item.currency)}<ConvertedAmount amount={item.amount} from={item.currency} to={currency} rate={rate} /></strong></li>)}</ul>
    {!activity.length && <p className="empty-state">Your entries and payments will appear here.</p>}
  </>
}
