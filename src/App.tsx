import { lazy, Suspense, useEffect, useState, Component, type ReactNode, type ErrorInfo } from 'react'
import {
  BookCheck,
  LayoutDashboard,
  ListOrdered,
  Plus,
  ChartNoAxesColumnIncreasing,
  PiggyBank,
  CalendarDays,
  WifiOff
} from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAuth } from './context/AuthContext'
import { useOnline } from './hooks/useOnline'
import { useInstall } from './hooks/useInstall'
import { useAsync } from './hooks/useAsync'
import { getCategories } from './services/categoryService'
import { retryReceiptCleanup } from './services/storageService'
import type { Budget, Page, Transaction, TransactionType } from './types'
import { Loading, ErrorState } from './components/ui/States'
import { useToast } from './components/ui/Toast'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const History = lazy(() => import('./pages/History'))
const BudgetPlan = lazy(() => import('./pages/BudgetPlan'))
const Savings = lazy(() => import('./pages/Savings'))
const Statistics = lazy(() => import('./pages/Statistics'))
const Settings = lazy(() => import('./pages/Settings'))
const TransactionForm = lazy(() => import('./components/TransactionForm').then(m => ({ default: m.TransactionForm })))
const TransactionDetail = lazy(() => import('./components/TransactionDetail').then(m => ({ default: m.TransactionDetail })))
const BudgetForm = lazy(() => import('./components/BudgetForm').then(m => ({ default: m.BudgetForm })))

export default function App() {
  const { session, loading, error } = useAuth()
  const online = useOnline()
  const install = useInstall()
  const toast = useToast()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({ onRegisterError: () => { /* App remains usable without SW registration. */ } })

  return (
    <ErrorBoundary>
      <div className="app-root">
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={16} /> Kamu sedang offline. Hubungkan internet untuk membuka dan menyimpan data.
          </div>
        )}
        {needRefresh && (
          <div className="update-banner" role="status">
            <span>Versi baru tersedia. Simpan form Kamu sebelum memperbarui.</span>
            <button onClick={() => updateServiceWorker(true).catch(() => toast('Pembaruan gagal. Coba lagi.', 'error'))}>
              Perbarui
            </button>
            <button aria-label="Nanti saja" onClick={() => setNeedRefresh(false)}>
              Nanti
            </button>
          </div>
        )}
        <Suspense fallback={<Loading text="Membuka Dicatat…" />}>
          {loading ? (
            <Loading text="Memeriksa sesi…" />
          ) : error ? (
            <ErrorState message={error} retry={() => window.location.reload()} />
          ) : session ? (
            <AuthenticatedApp key={session.user.id} install={install} />
          ) : (
            <Login />
          )}
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}

function AuthenticatedApp({ install }: { install: ReturnType<typeof useInstall> }) {
  const { session } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState<Page>('dashboard')
  const [revision, setRevision] = useState(0)
  const [form, setForm] = useState<{
    transaction?: Transaction
    initialType?: TransactionType
    photoFirst?: boolean
  } | null>(null)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [budgetForm, setBudgetForm] = useState<{
    budget: Budget | null
    month: number
    year: number
  } | null>(null)

  const categories = useAsync(() => getCategories(session!.user.id), [session!.user.id, revision])

  useEffect(() => {
    let active = true
    retryReceiptCleanup(session!.user.id)
      .then(count => {
        if (active && count) toast('Ada foto yang menunggu penghapusan di Pengaturan.', 'error')
      })
      .catch(() => { /* Cleanup can be retried from Settings. */ })
    return () => {
      active = false
    }
  }, [session!.user.id])

  function navigate(value: Page) {
    setPage(value)
    window.scrollTo({ top: 0 })
  }

  function changed() {
    setRevision(value => value + 1)
  }

  function add(photoFirst = false, initialType: TransactionType = 'expense') {
    if (categories.error || !categories.data) {
      toast('Kategori belum siap. Coba lagi sebentar.', 'error')
      return
    }
    setForm({ photoFirst, initialType })
  }

  function budget(
    budget: Budget | null,
    month = new Date().getMonth() + 1,
    year = new Date().getFullYear()
  ) {
    setBudgetForm({ budget, month, year })
  }

  const primaryNav = [
    { id: 'dashboard' as const, label: 'Ringkasan', Icon: LayoutDashboard },
    { id: 'history' as const, label: 'Transaksi', Icon: ListOrdered }
  ]

  const secondaryNav = [
    { id: 'plan' as const, label: 'Anggaran', Icon: CalendarDays },
    { id: 'savings' as const, label: 'Tabungan', Icon: PiggyBank }
  ]

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => navigate('dashboard')} aria-label="Dicatat, buka dashboard">
          <span className="brand-icon">
            <BookCheck size={22} />
          </span>
          dicatat<span className="brand-dot">.</span>
        </button>

        <div className="header-actions">
          <button
            className={`header-stat-btn ${page === 'statistics' ? 'active' : ''}`}
            onClick={() => navigate('statistics')}
            aria-label="Buka laporan & statistik"
            title="Laporan & Statistik"
          >
            <ChartNoAxesColumnIncreasing size={20} />
          </button>
          <button
            className={`header-avatar ${page === 'settings' ? 'active-avatar' : ''}`}
            onClick={() => navigate('settings')}
            aria-label="Buka pengaturan akun"
          >
            {(session!.user.user_metadata.name || session!.user.email || 'A').charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <main className="app-main" id="main-content">
        <Suspense fallback={<Loading />}>
          {categories.loading && !categories.data ? (
            <Loading />
          ) : categories.error ? (
            <ErrorState message={categories.error} retry={categories.retry} />
          ) : (
            <>
              {page === 'dashboard' && (
                <Dashboard
                  revision={revision}
                  onAdd={add}
                  onHistory={() => navigate('history')}
                  onSelect={setSelected}
                  onBudget={budget}
                  onPlan={() => navigate('plan')}
                  onSavings={() => navigate('savings')}
                />
              )}
              {page === 'history' && (
                <History
                  categories={categories.data || []}
                  revision={revision}
                  onSelect={setSelected}
                />
              )}
              {page === 'plan' && (
                <BudgetPlan
                  categories={categories.data || []}
                  revision={revision}
                  onEditBudget={budget}
                />
              )}
              {page === 'savings' && (
                <Savings revision={revision} />
              )}
              {page === 'statistics' && (
                <Statistics revision={revision} onBudget={budget} />
              )}
              {page === 'settings' && (
                <Settings
                  categories={categories.data || []}
                  onChanged={changed}
                  install={install}
                />
              )}
            </>
          )}
        </Suspense>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi utama">
        {primaryNav.map(({ id, label, Icon }) => (
          <button
            className={page === id ? 'active' : ''}
            key={id}
            onClick={() => navigate(id)}
            aria-current={page === id ? 'page' : undefined}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}

        <button className="nav-add" onClick={() => add()} aria-label="Catat transaksi">
          <span className="nav-add-icon">
            <Plus size={27} />
          </span>
          <span>Catat</span>
        </button>

        {secondaryNav.map(({ id, label, Icon }) => (
          <button
            className={page === id ? 'active' : ''}
            key={id}
            onClick={() => navigate(id)}
            aria-current={page === id ? 'page' : undefined}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <Suspense fallback={<Loading text="Menyiapkan form…" />}>
        {form && (
          <TransactionForm
            categories={categories.data || []}
            {...form}
            onClose={() => setForm(null)}
            onSaved={() => {
              setForm(null)
              changed()
            }}
          />
        )}
        {selected && (
          <TransactionDetail
            transaction={selected}
            onClose={() => setSelected(null)}
            onEdit={() => {
              setForm({ transaction: selected })
              setSelected(null)
            }}
            onDeleted={() => {
              setSelected(null)
              changed()
            }}
          />
        )}
        {budgetForm && (
          <BudgetForm
            {...budgetForm}
            onClose={() => setBudgetForm(null)}
            onSaved={() => {
              setBudgetForm(null)
              changed()
            }}
          />
        )}
      </Suspense>
    </div>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* No sensitive financial data is logged. */
  }
  render() {
    return this.state.failed ? (
      <ErrorState
        message="Aplikasi mengalami kendala. Muat ulang untuk mencoba kembali."
        retry={() => window.location.reload()}
      />
    ) : (
      this.props.children
    )
  }
}
