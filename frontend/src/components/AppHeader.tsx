import ledgernestLogo from '../assets/ledgernest.png'

type Props = {
    onAccount: () => void
    onLogout: () => void
}

export function AppHeader({ onAccount, onLogout }: Props) {
    return (
        <header className="app-header">
            <a className="brand" href="#main" aria-label="LedgerNest home">
                <img
                    className="brand-logo"
                    src={ledgernestLogo}
                    alt=""
                    width={44}
                    height={44}
                />
            </a>

            <nav className="account-controls" aria-label="Account">
                <button
                    type="button"
                    className="header-button header-account"
                    onClick={onAccount}
                >
                    Account
                </button>

                <button
                    type="button"
                    className="header-button header-signout"
                    onClick={onLogout}
                >
                    Sign out
                </button>
            </nav>
        </header>
    )
}