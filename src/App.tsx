
/** @jsxImportSource react */
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Truck,
  ArrowLeftRight,
  ShoppingCart,
  Package,
  Receipt,
  ChartNoAxesCombined,
  Settings,
  Plus,
  Search,
  Bell,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Trash2,
  UserRound,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  Calculator,
  HelpCircle,
  Pin,
  PinOff,
  History,
  Delete,
  Percent,
  Divide,
  Equal,
  Minus,
} from 'lucide-react'

type Page =
  | 'Dashboard'
  | 'খাতা'
  | 'কাস্টমার'
  | 'সাপ্লায়ার'
  | 'লেনদেন'
  | 'বিক্রয়'
  | 'পণ্য ও স্টক'
  | 'খরচ'
  | 'ক্যালকুলেটর'
  | 'রিপোর্ট'
  | 'সেটিংস'

type TransactionType = 'income' | 'expense'
type ModalType = 'income' | 'expense' | 'customer' | 'supplier'

interface Transaction {
  id: string
  type: TransactionType
  name: string
  description: string
  amount: number
  date: string
}

interface Contact {
  id: string
  name: string
  phone: string
  createdAt: string
}

interface CalculatorHistory {
  id: string
  expression: string
  result: number
  createdAt: string
}

const STORAGE_KEY = 'hisab-khata-data-v1'
const CALCULATOR_HISTORY_KEY = 'hisab-khata-calculator-history-v1'

const navigation = [
  { name: 'Dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
  { name: 'খাতা', label: 'হিসাব খাতা', icon: BookOpen },
  { name: 'কাস্টমার', label: 'কাস্টমার', icon: Users },
  { name: 'সাপ্লায়ার', label: 'সাপ্লায়ার', icon: Truck },
  { name: 'লেনদেন', label: 'লেনদেন', icon: ArrowLeftRight },
  { name: 'বিক্রয়', label: 'বিক্রয়', icon: ShoppingCart },
  { name: 'পণ্য ও স্টক', label: 'পণ্য ও স্টক', icon: Package },
  { name: 'খরচ', label: 'খরচ', icon: Receipt },
  { name: 'ক্যালকুলেটর', label: 'ক্যালকুলেটর', icon: Calculator },
  { name: 'রিপোর্ট', label: 'রিপোর্ট', icon: ChartNoAxesCombined },
  { name: 'সেটিংস', label: 'সেটিংস', icon: Settings },
] as const


function calculateExpression(expression: string): number {
  const cleanExpression = expression.replace(/\s/g, '')

  const matchedTokens = cleanExpression.match(
    /(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/%]/g,
  )

  if (!matchedTokens || matchedTokens.join('') !== cleanExpression) {
    throw new Error('Invalid expression')
  }

  // Null check-এর পরে নিরাপদ Array
  const tokens: string[] = matchedTokens

  let position = 0

  function parsePrimary(): number {
    const token = tokens[position]

    if (token === '+') {
      position++
      return parsePrimary()
    }

    if (token === '-') {
      position++
      return -parsePrimary()
    }

    if (token === '(') {
      position++
      const value = parseAddition()

      if (tokens[position] !== ')') {
        throw new Error('Missing closing bracket')
      }

      position++
      return value
    }

    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
      throw new Error('Invalid number')
    }

    position++
    let value = Number(token)

    // Postfix percentage: 10% = 0.10
    while (tokens[position] === '%') {
      value /= 100
      position++
    }

    return value
  }

  function parseMultiplication(): number {
    let value = parsePrimary()

    while (
      tokens[position] === '*' ||
      tokens[position] === '/'
    ) {
      const operator = tokens[position++]
      const right = parsePrimary()

      if (operator === '*') {
        value *= right
      }

      if (operator === '/') {
        if (right === 0) {
          throw new Error('Division by zero')
        }

        value /= right
      }
    }

    return value
  }

  function parseAddition(): number {
    let value = parseMultiplication()

    while (
      tokens[position] === '+' ||
      tokens[position] === '-'
    ) {
      const operator = tokens[position++]
      const right = parseMultiplication()

      value = operator === '+'
        ? value + right
        : value - right
    }

    return value
  }

  const result = parseAddition()

  if (position !== tokens.length || !Number.isFinite(result)) {
    throw new Error('Invalid calculation')
  }

  return Number(result.toFixed(8))
}

function getToday() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function money(amount: number) {
  return new Intl.NumberFormat('bn-BD', {
    maximumFractionDigits: 2,
  }).format(amount) + ' ৳'
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Date(`${value}T00:00:00`).toLocaleDateString('bn-BD')
}

function readStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null

    const parsed = JSON.parse(saved)

    return {
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions as Transaction[]
        : [],
      customers: Array.isArray(parsed.customers)
        ? parsed.customers as Contact[]
        : [],
      suppliers: Array.isArray(parsed.suppliers)
        ? parsed.suppliers as Contact[]
        : [],
    }
  } catch {
    return null
  }
}

function App() {
  const [activePage, setActivePage] = useState<Page>('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<ModalType>('income')
  const [search, setSearch] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)

  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [calculatorPinned, setCalculatorPinned] = useState(false)
  const [calculatorResult, setCalculatorResult] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return readStorage()?.transactions ?? []
  })

  const [customers, setCustomers] = useState<Contact[]>(() => {
    return readStorage()?.customers ?? []
  })

  const [suppliers, setSuppliers] = useState<Contact[]>(() => {
    return readStorage()?.suppliers ?? []
  })

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ transactions, customers, suppliers }),
      )
    } catch (error) {
      console.error('ডেটা সংরক্ষণ করা যায়নি:', error)
    }
  }, [transactions, customers, suppliers])

  const totals = useMemo(() => {
    const income = transactions
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0)

    const expense = transactions
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0)

    return {
      income,
      expense,
      balance: income - expense,
    }
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return transactions

    return transactions.filter(item =>
      `${item.name} ${item.description} ${item.amount} ${item.date}`
        .toLowerCase()
        .includes(query),
    )
  }, [transactions, search])

  function openModal(type: ModalType) {
    setModalType(type)
    setCalculatorResult('')
    setModalOpen(true)
  }

  function handleTransactionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('amount'))

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('সঠিক টাকার পরিমাণ লিখুন।')
      return
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type: modalType as TransactionType,
      name: String(form.get('name') || '').trim() || 'নাম উল্লেখ নেই',
      description: String(form.get('description') || '').trim(),
      amount,
      date: String(form.get('date') || getToday()),
    }

    setTransactions(previous => [transaction, ...previous])
    setModalOpen(false)
  }

  function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const phone = String(form.get('phone') || '').trim()

    if (!name) {
      alert('নাম লিখুন।')
      return
    }

    const contact: Contact = {
      id: crypto.randomUUID(),
      name,
      phone,
      createdAt: getToday(),
    }

    if (modalType === 'customer') {
      setCustomers(previous => [contact, ...previous])
    } else {
      setSuppliers(previous => [contact, ...previous])
    }

    setModalOpen(false)
  }

  function deleteTransaction(id: string) {
    if (!confirm('এই লেনদেনটি মুছে ফেলতে চান?')) return
    setTransactions(previous => previous.filter(item => item.id !== id))
  }

  function deleteContact(id: string, type: 'customer' | 'supplier') {
    if (!confirm('এই তথ্যটি মুছে ফেলতে চান?')) return

    if (type === 'customer') {
      setCustomers(previous => previous.filter(item => item.id !== id))
    } else {
      setSuppliers(previous => previous.filter(item => item.id !== id))
    }
  }

  function navigate(page: Page) {
    setActivePage(page)
    setSidebarOpen(false)
    setHelpOpen(false)
    if (page === 'ক্যালকুলেটর') setCalculatorOpen(true)
    setSearch('')
  }

  const pageTitle = navigation.find(
    item => item.name === activePage,
  )?.label ?? 'ড্যাশবোর্ড'

  const helpText: Record<Page, string> = {
    Dashboard: 'এখানে মোট আয়, মোট ব্যয়, ব্যালেন্স, কাস্টমার ও সাপ্লায়ারের সারাংশ দেখতে পারবেন। আয় যোগ বা খরচ যোগ বাটন ব্যবহার করুন।',
    খাতা: 'এখানে সব আয় ও ব্যয়ের হিসাব দেখা যাবে। নতুন হিসাব যোগ করুন এবং সার্চ দিয়ে পুরোনো হিসাব খুঁজুন।',
    কাস্টমার: 'নতুন কাস্টমার যোগ করুন। নাম ও মোবাইল নম্বর সংরক্ষণ করে কাস্টমারের তালিকা তৈরি করুন।',
    সাপ্লায়ার: 'যাদের কাছ থেকে পণ্য বা সেবা নেন, তাদের নাম ও মোবাইল নম্বর এখানে সংরক্ষণ করুন।',
    লেনদেন: 'সকল আয় ও ব্যয়ের তালিকা এখানে পাবেন। প্রয়োজন অনুযায়ী নতুন লেনদেন যোগ করতে পারবেন।',
    বিক্রয়: 'বিক্রয় ব্যবস্থাপনা এখনো নির্মাণাধীন। আপাতত বিক্রয়ের টাকা আয় হিসেবে যোগ করতে পারবেন।',
    'পণ্য ও স্টক': 'পণ্য ও স্টক ব্যবস্থাপনা পরবর্তী ধাপে যুক্ত হবে।',
    খরচ: 'এখানে আপনার সব খরচের হিসাব দেখুন এবং নতুন খরচ যোগ করুন।',
    ক্যালকুলেটর: 'যোগ, বিয়োগ, গুণ, ভাগ এবং শতাংশের হিসাব করুন। ফলাফল Amount ঘরে বসাতে পারবেন।',
    রিপোর্ট: 'এখানে মোট আয়, ব্যয়, ব্যালেন্স এবং লেনদেনের সংখ্যা দেখতে পারবেন।',
    সেটিংস: 'এখানে সংরক্ষিত তথ্যের সংখ্যা এবং ডেটা কোথায় সংরক্ষিত হচ্ছে তা দেখতে পারবেন।',
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
            <BookOpen size={23} />
          </div>
          <div>
            <h2>হিসাব খাতা</h2>
            <span>স্মার্ট বিজনেস ম্যানেজমেন্ট</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="business-selector">
          <div className="business-avatar">হি</div>
          <div className="business-info">
            <strong>আমার ব্যবসা</strong>
            <span>ব্যবসার হিসাব</span>
          </div>
        </div>

        <nav className="navigation">
          <span className="nav-heading">মূল মেনু</span>

          {navigation.map(item => {
            const Icon = item.icon
            const active = activePage === item.name

            return (
              <button
                key={item.name}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => navigate(item.name)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {active && <span className="active-indicator" />}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <BookOpen size={20} />
            <strong>সহজ হিসাব, সুন্দর ব্যবসা</strong>
            <p>প্রতিদিনের আয়-ব্যয় রাখুন এক জায়গায়।</p>
          </div>
          <span className="sidebar-version">হিসাব খাতা · সংস্করণ ১.০</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <span className="breadcrumb">হিসাব খাতা /</span>
              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="global-search-wrap">
            <div className="global-search-box">
              <Search size={19} />
              <input
                type="search"
                value={globalSearch}
                onChange={event => {
                  setGlobalSearch(event.target.value)
                  setGlobalSearchOpen(true)
                }}
                onFocus={() => setGlobalSearchOpen(true)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    setGlobalSearchOpen(false)
                    setGlobalSearch('')
                  }
                  if (event.key === 'Enter') {
                    const query = globalSearch.trim()
                    if (query) {
                      setSearch(query)
                      setActivePage('লেনদেন')
                      setSidebarOpen(false)
                      setGlobalSearchOpen(false)
                    }
                  }
                }}
                placeholder="কাস্টমার, সাপ্লায়ার বা লেনদেন খুঁজুন..."
                aria-label="সারা অ্যাপে খুঁজুন"
              />
              {globalSearch && (
                <button
                  type="button"
                  className="global-search-clear"
                  onClick={() => setGlobalSearch('')}
                  aria-label="সার্চ মুছুন"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {globalSearchOpen && globalSearch.trim() && (
              <div className="global-search-results">
                <div className="global-search-section-title">লেনদেন</div>
                {transactions
                  .filter(item =>
                    `${item.name} ${item.description} ${item.amount} ${item.date}`
                      .toLowerCase()
                      .includes(globalSearch.trim().toLowerCase()),
                  )
                  .slice(0, 5)
                  .map(item => (
                    <button
                      type="button"
                      className="global-search-result"
                      key={`transaction-${item.id}`}
                      onClick={() => {
                        setSearch(globalSearch.trim())
                        setActivePage('লেনদেন')
                        setGlobalSearchOpen(false)
                        setSidebarOpen(false)
                      }}
                    >
                      <span className={`global-search-result-icon ${item.type}`}>
                        {item.type === 'income'
                          ? <TrendingUp size={16} />
                          : <TrendingDown size={16} />}
                      </span>
                      <span className="global-search-result-info">
                        <strong>{item.name}</strong>
                        <small>{item.description || 'লেনদেন'}</small>
                      </span>
                      <strong className="global-search-result-amount">
                        {money(item.amount)}
                      </strong>
                    </button>
                  ))}

                <div className="global-search-section-title">কাস্টমার</div>
                {customers
                  .filter(item =>
                    `${item.name} ${item.phone}`
                      .toLowerCase()
                      .includes(globalSearch.trim().toLowerCase()),
                  )
                  .slice(0, 4)
                  .map(item => (
                    <button
                      type="button"
                      className="global-search-result"
                      key={`customer-${item.id}`}
                      onClick={() => {
                        navigate('কাস্টমার')
                        setGlobalSearchOpen(false)
                      }}
                    >
                      <span className="global-search-result-icon contact">
                        <Users size={16} />
                      </span>
                      <span className="global-search-result-info">
                        <strong>{item.name}</strong>
                        <small>{item.phone || 'কাস্টমার'}</small>
                      </span>
                    </button>
                  ))}

                <div className="global-search-section-title">সাপ্লায়ার</div>
                {suppliers
                  .filter(item =>
                    `${item.name} ${item.phone}`
                      .toLowerCase()
                      .includes(globalSearch.trim().toLowerCase()),
                  )
                  .slice(0, 4)
                  .map(item => (
                    <button
                      type="button"
                      className="global-search-result"
                      key={`supplier-${item.id}`}
                      onClick={() => {
                        navigate('সাপ্লায়ার')
                        setGlobalSearchOpen(false)
                      }}
                    >
                      <span className="global-search-result-icon supplier">
                        <Truck size={16} />
                      </span>
                      <span className="global-search-result-info">
                        <strong>{item.name}</strong>
                        <small>{item.phone || 'সাপ্লায়ার'}</small>
                      </span>
                    </button>
                  ))}

                {transactions.every(item =>
                  !`${item.name} ${item.description} ${item.amount} ${item.date}`
                    .toLowerCase()
                    .includes(globalSearch.trim().toLowerCase()),
                ) &&
                  customers.every(item =>
                    !`${item.name} ${item.phone}`
                      .toLowerCase()
                      .includes(globalSearch.trim().toLowerCase()),
                  ) &&
                  suppliers.every(item =>
                    !`${item.name} ${item.phone}`
                      .toLowerCase()
                      .includes(globalSearch.trim().toLowerCase()),
                  ) && (
                    <div className="global-search-empty">
                      <Search size={20} />
                      <span>কোনো তথ্য পাওয়া যায়নি</span>
                    </div>
                  )}

                <button
                  type="button"
                  className="global-search-all"
                  onClick={() => {
                    setSearch(globalSearch.trim())
                    setActivePage('লেনদেন')
                    setSidebarOpen(false)
                    setGlobalSearchOpen(false)
                  }}
                >
                  সব লেনদেনে খুঁজুন <ArrowUpRight size={15} />
                </button>
              </div>
            )}
          </div>

          <div className="topbar-right">
            <span className="today-date">
              <CalendarDays size={16} />
              {new Date().toLocaleDateString('bn-BD')}
            </span>
            <button className="notification-button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <div className="profile-avatar">অ</div>
          </div>
        </header>

        <div className="page-content">
          {activePage === 'Dashboard' && (
            <Dashboard
              totals={totals}
              transactions={transactions}
              customers={customers}
              suppliers={suppliers}
              onAddIncome={() => openModal('income')}
              onAddExpense={() => openModal('expense')}
              onNavigate={navigate}
              onDelete={deleteTransaction}
            />
          )}

          {(activePage === 'খাতা' || activePage === 'লেনদেন') && (
            <TransactionPage
              transactions={filteredTransactions}
              search={search}
              setSearch={setSearch}
              onAddIncome={() => openModal('income')}
              onAddExpense={() => openModal('expense')}
              onDelete={deleteTransaction}
            />
          )}

          {activePage === 'খরচ' && (
            <TransactionPage
              transactions={filteredTransactions.filter(
                item => item.type === 'expense',
              )}
              search={search}
              setSearch={setSearch}
              onAddIncome={() => openModal('income')}
              onAddExpense={() => openModal('expense')}
              onDelete={deleteTransaction}
              expensesOnly
            />
          )}

          {activePage === 'কাস্টমার' && (
            <ContactPage
              title="কাস্টমার তালিকা"
              contacts={customers}
              onAdd={() => openModal('customer')}
              onDelete={id => deleteContact(id, 'customer')}
            />
          )}

          {activePage === 'সাপ্লায়ার' && (
            <ContactPage
              title="সাপ্লায়ার তালিকা"
              contacts={suppliers}
              onAdd={() => openModal('supplier')}
              onDelete={id => deleteContact(id, 'supplier')}
            />
          )}

          {activePage === 'রিপোর্ট' && (
            <ReportPage totals={totals} transactions={transactions} />
          )}

          {activePage === 'বিক্রয়' && (
            <ComingSoon
              icon={<ShoppingCart size={28} />}
              title="বিক্রয় ব্যবস্থাপনা"
              description="বিক্রয় ও বিক্রয় রসিদ ব্যবস্থাপনা পরবর্তী ধাপে যুক্ত হবে। আপাতত আয় হিসেবে বিক্রয়ের টাকা যোগ করতে পারবেন।"
              action={() => openModal('income')}
              actionLabel="বিক্রয়ের টাকা যোগ করুন"
            />
          )}

          {activePage === 'পণ্য ও স্টক' && (
            <ComingSoon
              icon={<Package size={28} />}
              title="পণ্য ও স্টক"
              description="পণ্য যোগ করা, স্টক হিসাব এবং মজুত ব্যবস্থাপনা পরবর্তী ধাপে যুক্ত হবে।"
            />
          )}

          {activePage === 'সেটিংস' && (
            <SettingsPage
              transactionCount={transactions.length}
              customerCount={customers.length}
              supplierCount={suppliers.length}
            />
          )}

          {activePage === 'ক্যালকুলেটর' && (
            <div className="calculator-page-intro">
              <h2>ব্যবসার হিসাব করুন</h2>
              <p>ক্যালকুলেটর ব্যবহার করে হিসাব করুন এবং ফলাফল Amount ঘরে বসান।</p>
              <button
                className="primary-action"
                onClick={() => setCalculatorOpen(true)}
              >
                <Calculator size={18} /> ক্যালকুলেটর খুলুন
              </button>
            </div>
          )}
        </div>

               <footer className="site-footer">
  <div className="site-footer-inner">

    <div className="site-footer-main">

      <div className="footer-brand-column">
        <div className="footer-brand">
          <span className="footer-brand-icon">
            <BookOpen size={27} />
          </span>
          <div>
            <strong>হিসাব খাতা</strong>
            <small>ব্যবসার বিশ্বস্ত হিসাব সহকারী</small>
          </div>
        </div>

        <h3 className="footer-brand-heading">
          আপনার ব্যবসার হিসাব, এখন আরও সহজ।
        </h3>

        <p className="footer-description">
          লেনদেন, আয়-ব্যয়, কাস্টমার, সাপ্লায়ার এবং পণ্যের হিসাব
          রাখুন একটি সহজ ও গোছানো ডিজিটাল ব্যবস্থাপনায়।
        </p>

        <div className="footer-trust-note">
          <span className="footer-trust-dot"></span>
          সহজ হিসাব, সুন্দর ব্যবসা।
        </div>
      </div>

      <div className="footer-link-column">
        <h4>হিসাব ব্যবস্থাপনা</h4>
        <button onClick={() => navigate('Dashboard')}>ড্যাশবোর্ড</button>
        <button onClick={() => navigate('খাতা')}>হিসাব খাতা</button>
        <button onClick={() => navigate('লেনদেন')}>সকল লেনদেন</button>
        <button onClick={() => navigate('রিপোর্ট')}>আর্থিক রিপোর্ট</button>
      </div>

      <div className="footer-link-column">
        <h4>ব্যবসার সরঞ্জাম</h4>
        <button onClick={() => navigate('ক্যালকুলেটর')}>ক্যালকুলেটর</button>
        <button onClick={() => navigate('পণ্য ও স্টক')}>পণ্য সংরক্ষণ</button>
        <button onClick={() => navigate('পণ্য ও স্টক')}>স্টক ব্যবস্থাপনা</button>
        <button onClick={() => navigate('বিক্রয়')}>বিক্রয় ব্যবস্থাপনা</button>
        <span className="footer-coming-soon">পণ্য ক্রয় · শিগগিরই</span>
      </div>

      <div className="footer-link-column">
        <h4>কোম্পানি ও পরিচালনা</h4>
        <button onClick={() => navigate('কাস্টমার')}>কাস্টমার</button>
        <button onClick={() => navigate('সাপ্লায়ার')}>সাপ্লায়ার</button>
        <button onClick={() => navigate('খরচ')}>ব্যবসার খরচ</button>
        <button onClick={() => navigate('সেটিংস')}>সেটিংস</button>
        <span className="footer-coming-soon">আমাদের সম্পর্কে · শিগগিরই</span>
      </div>

      <div className="footer-link-column footer-contact-column">
        <h4>যোগাযোগ ও সহায়তা</h4>
        <div className="footer-contact-item">
          <span className="footer-contact-icon">☎</span>
          <span>ফোন নম্বর যোগ করা হবে</span>
        </div>
        <div className="footer-contact-item">
          <span className="footer-contact-icon">✉</span>
          <span>ইমেইল যোগ করা হবে</span>
        </div>
        <div className="footer-contact-item">
          <span className="footer-contact-icon">⌖</span>
          <span>ঠিকানা যোগ করা হবে</span>
        </div>
        <button
          className="footer-help-link"
          onClick={() => setHelpOpen(true)}
        >
          সাহায্য কেন্দ্র
        </button>
      </div>

    </div>

    <div className="footer-security-strip">
      <span>✓ তথ্যের গোপনীয়তাকে গুরুত্ব দেওয়া হয়</span>
      <span>✓ গোছানো ডিজিটাল হিসাব ব্যবস্থাপনা</span>
      <span>✓ সহজ ও ব্যবহারবান্ধব অভিজ্ঞতা</span>
    </div>

    <div className="footer-social-section">
      <div>
        <h4>আমাদের সঙ্গে যুক্ত থাকুন</h4>
        <p>সামাজিক যোগাযোগমাধ্যমে আমাদের অনুসরণ করুন</p>
      </div>

      <div className="footer-social-links">
        <span className="footer-social-item">
          <b>f</b> Facebook
        </span>
        <span className="footer-social-item">
          <b>◎</b> Instagram
        </span>
        <span className="footer-social-item">
          <b>♪</b> TikTok
        </span>
        <span className="footer-social-item">
          <b>◉</b> WhatsApp
        </span>
      </div>
      <small className="footer-social-note">
        সামাজিক যোগাযোগমাধ্যমের লিংক শিগগিরই যুক্ত হবে।
      </small>
    </div>

    <div className="site-footer-bottom">
      <span>
        © {new Date().getFullYear()} হিসাব খাতা · সর্বস্বত্ব সংরক্ষিত।
      </span>
      <span>সংস্করণ ১.০</span>
      <span>আপনার ব্যবসার হিসাব, এখন আরও সহজ।</span>
      <button
        type="button"
        className="footer-back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="উপরে ফিরে যান"
        title="উপরে ফিরে যান"
      >
        ↑ উপরে যান
      </button>
    </div>

  </div>
</footer>

        <button
          type="button"
          className="help-floating-button"
          onClick={() => setHelpOpen(value => !value)}
          title="সাহায্য"
        >
          <HelpCircle size={19} />
          সাহায্য
        </button>
        {helpOpen && (
          <div className="context-help-panel">
            <div className="context-help-header">
              <strong>
                <HelpCircle size={18} /> এই পেজের সাহায্য
              </strong>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="সাহায্য বন্ধ করুন"
              >
                <X size={18} />
              </button>
            </div>
            <p>{helpText[activePage]}</p>
          </div>
        )}

        {activePage !== 'ক্যালকুলেটর' && (
          <button
            type="button"
            className="calculator-floating-button"
            onClick={() => setCalculatorOpen(value => !value)}
          >
            <Calculator size={19} />
            ক্যালকুলেটর
          </button>
        )}
      </main>

      {calculatorOpen && (
        <CalculatorPanel
          pinned={calculatorPinned}
          onPin={() => setCalculatorPinned(value => !value)}
          onClose={() => setCalculatorOpen(false)}
          onUseResult={value => {
            setCalculatorResult(value)
            setCalculatorOpen(false)
          }}
        />
      )}

      {modalOpen && (
        <Modal
          type={modalType}
          onClose={() => setModalOpen(false)}
          onTransactionSubmit={handleTransactionSubmit}
          onContactSubmit={handleContactSubmit}
          calculatorResult={calculatorResult}
          onOpenCalculator={() => {
            setCalculatorResult('')
            setCalculatorOpen(true)
          }}
        />
      )}
    </div>
  )
}
function CashFlowChart({ transactions }: { transactions: Transaction[] }) {
  const [selectedMonth, setSelectedMonth] = useState(getToday().slice(0, 7))

  const monthTransactions = transactions.filter(item =>
    item.date.startsWith(selectedMonth),
  )

  const weeks = [
    { label: '১–৭', start: 1, end: 7 },
    { label: '৮–১৪', start: 8, end: 14 },
    { label: '১৫–২১', start: 15, end: 21 },
    { label: '২২–২৮', start: 22, end: 28 },
    { label: '২৯–শেষ', start: 29, end: 31 },
  ]

  const chartData = weeks.map(week => {
    const items = monthTransactions.filter(item => {
      const day = Number(item.date.slice(8, 10))
      return day >= week.start && day <= week.end
    })

    return {
      ...week,
      income: items
        .filter(item => item.type === 'income')
        .reduce((sum, item) => sum + item.amount, 0),
      expense: items
        .filter(item => item.type === 'expense')
        .reduce((sum, item) => sum + item.amount, 0),
    }
  })

  const maxValue = Math.max(
    ...chartData.flatMap(item => [item.income, item.expense]),
    1,
  )

  const monthName = selectedMonth
    ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('bn-BD', {
        month: 'long',
        year: 'numeric',
      })
    : ''

  return (
    <section className="panel cash-flow-panel">
      <div className="panel-header cash-flow-header">
        <div>
          <h3><ChartNoAxesCombined size={19} /> ক্যাশ ফ্লো চার্ট</h3>
          <p>{monthName} মাসের আয় ও ব্যয়ের তুলনা</p>
        </div>

        <label className="chart-month-picker">
          <CalendarDays size={17} />
          <input
            type="month"
            value={selectedMonth}
            onChange={event => setSelectedMonth(event.target.value)}
            aria-label="চার্টের মাস নির্বাচন"
          />
        </label>
      </div>

      <div className="chart-legend">
        <span><i className="income-legend" /> আয়</span>
        <span><i className="expense-legend" /> ব্যয়</span>
      </div>

      <div className="cash-flow-chart">
        {chartData.map(item => (
          <div className="cash-flow-column" key={item.label}>
            <div className="cash-flow-bars">
              <div
                className="cash-flow-bar income-bar"
                style={{
                  height: `${item.income > 0 ? Math.max(4, item.income / maxValue * 100) : 0}%`,
                }}
                title={`আয়: ${money(item.income)}`}
              />
              <div
                className="cash-flow-bar expense-bar"
                style={{
                  height: `${item.expense > 0 ? Math.max(4, item.expense / maxValue * 100) : 0}%`,
                }}
                title={`ব্যয়: ${money(item.expense)}`}
              />
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="chart-summary">
        <div>
          <span>এই মাসের মোট আয়</span>
          <strong className="income-text">
            {money(monthTransactions
              .filter(item => item.type === 'income')
              .reduce((sum, item) => sum + item.amount, 0))}
          </strong>
        </div>
        <div>
          <span>এই মাসের মোট ব্যয়</span>
          <strong className="expense-text">
            {money(monthTransactions
              .filter(item => item.type === 'expense')
              .reduce((sum, item) => sum + item.amount, 0))}
          </strong>
        </div>
      </div>

      {monthTransactions.length === 0 && (
        <p className="chart-empty">এই মাসে এখনো কোনো লেনদেন নেই।</p>
      )}
    </section>
  )
}

interface DashboardProps {
  totals: { income: number; expense: number; balance: number }
  transactions: Transaction[]
  customers: Contact[]
  suppliers: Contact[]
  onAddIncome: () => void
  onAddExpense: () => void
  onNavigate: (page: Page) => void
  onDelete: (id: string) => void
}
function Dashboard({
  totals,
  transactions,
  customers,
  suppliers,
  onAddIncome,
  onAddExpense,
  onNavigate,
  onDelete,
}: DashboardProps) {
    const [showChart, setShowChart] = useState(true)

  const stats = [
    {
      title: 'মোট ব্যালেন্স',
      amount: totals.balance,
      icon: Wallet,
      color: 'green',
      note: 'মোট আয় - মোট ব্যয়',
    },
    {
      title: 'মোট আয়',
      amount: totals.income,
      icon: TrendingUp,
      color: 'blue',
      note: 'সকল জমা হিসাব',
    },
    {
      title: 'মোট ব্যয়',
      amount: totals.expense,
      icon: TrendingDown,
      color: 'orange',
      note: 'সকল খরচ হিসাব',
    },
  ]

  return (
    <>
      <section className="welcome-section">
        <div>
          <span className="welcome-date">
            <CalendarDays size={15} /> আজকের হিসাব
          </span>
          <h2>স্বাগতম! আপনার ব্যবসার হিসাব এক নজরে দেখুন।</h2>
          <p>আপনার প্রতিদিনের আয়, ব্যয় ও লেনদেন সহজেই পরিচালনা করুন।</p>
        </div>
        <div className="welcome-actions">
          <button className="secondary-action" onClick={onAddExpense}>
            <Plus size={17} /> খরচ যোগ
          </button>
          <button className="primary-action" onClick={onAddIncome}>
            <Plus size={17} /> আয় যোগ
          </button>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map(item => {
          const Icon = item.icon
          return (
            <div className="stat-card" key={item.title}>
              <div className="stat-top">
                <span>{item.title}</span>
                <div className={`stat-icon ${item.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <h3>{money(item.amount)}</h3>
              <div className="stat-footer">
                <span>{item.note}</span>
              </div>
            </div>
          )
        })}
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span>মোট কাস্টমার</span>
            <div className="stat-icon blue"><Users size={20} /></div>
          </div>
          <h3>{customers.length.toLocaleString('bn-BD')} জন</h3>
          <div className="stat-footer"><span>সংরক্ষিত কাস্টমার</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>মোট সাপ্লায়ার</span>
            <div className="stat-icon orange"><Truck size={20} /></div>
          </div>
          <h3>{suppliers.length.toLocaleString('bn-BD')} জন</h3>
          <div className="stat-footer"><span>সংরক্ষিত সাপ্লায়ার</span></div>
        </div>
      </section>
            <section className="chart-toggle-section">
        <div>
          <h3>ব্যবসার আর্থিক বিশ্লেষণ</h3>
          <p>মাসভিত্তিক আয় ও ব্যয়ের চিত্র দেখুন।</p>
        </div>

        <button
          type="button"
          className="chart-toggle-button"
          onClick={() => setShowChart(value => !value)}
        >
          <ChartNoAxesCombined size={18} />
          {showChart ? 'চার্ট লুকান' : 'চার্ট দেখুন'}
        </button>
      </section>

      {showChart && <CashFlowChart transactions={transactions} />}

      <section className="transactions-panel panel">
        <div className="panel-header">
          <div>
            <h3>সাম্প্রতিক লেনদেন</h3>
            <p>আপনার সর্বশেষ আয় ও ব্যয়ের তালিকা</p>
          </div>
          <button className="view-all" onClick={() => onNavigate('লেনদেন')}>
            সব দেখুন <ArrowUpRight size={15} />
          </button>
        </div>
        <TransactionTable
          transactions={transactions.slice(0, 6)}
          onDelete={onDelete}
        />
      </section>
    </>
  )
}

interface TransactionPageProps {
  transactions: Transaction[]
  search: string
  setSearch: (value: string) => void
  onAddIncome: () => void
  onAddExpense: () => void
  onDelete: (id: string) => void
  expensesOnly?: boolean
}

function TransactionPage({
  transactions,
  search,
  setSearch,
  onAddIncome,
  onAddExpense,
  onDelete,
  expensesOnly = false,
}: TransactionPageProps) {
  return (
    <section className="transactions-panel panel">
      <div className="panel-header">
        <div>
          <h3>{expensesOnly ? 'সকল খরচ' : 'সকল লেনদেন'}</h3>
          <p>আপনার হিসাবের বিস্তারিত তালিকা</p>
        </div>
        <div className="welcome-actions">
          {!expensesOnly && (
            <button className="secondary-action" onClick={onAddIncome}>
              <Plus size={16} /> আয়
            </button>
          )}
          <button className="primary-action" onClick={onAddExpense}>
            <Plus size={16} /> খরচ
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="নাম বা বিবরণ দিয়ে খুঁজুন..."
          />
        </div>
        <span className="result-count">
          {transactions.length.toLocaleString('bn-BD')} টি হিসাব
        </span>
      </div>

      <TransactionTable transactions={transactions} onDelete={onDelete} />
    </section>
  )
}

function TransactionTable({
  transactions,
  onDelete,
}: {
  transactions: Transaction[]
  onDelete: (id: string) => void
}) {
  if (transactions.length === 0) {
    return (
      <div className="empty-module">
        <div className="empty-icon"><BookOpen size={28} /></div>
        <h3>এখনো কোনো লেনদেন নেই</h3>
        <p>আয় অথবা খরচ যোগ করলে এখানে দেখা যাবে।</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>নাম ও বিবরণ</th>
            <th>তারিখ</th>
            <th>ধরন</th>
            <th>টাকার পরিমাণ</th>
            <th>অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(item => (
            <tr key={item.id}>
              <td>
                <div className="transaction-person">
                  <div className={`transaction-icon ${item.type}`}>
                    {item.type === 'income'
                      ? <ArrowDownRight size={17} />
                      : <ArrowUpRight size={17} />}
                  </div>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.description || 'কোনো বিবরণ নেই'}</span>
                  </div>
                </div>
              </td>
              <td>{formatDate(item.date)}</td>
              <td>
                <span className={`status ${item.type}`}>
                  {item.type === 'income' ? 'আয়' : 'ব্যয়'}
                </span>
              </td>
              <td className={item.type === 'income' ? 'income-text' : 'expense-text'}>
                {item.type === 'income' ? '+' : '-'}{money(item.amount)}
              </td>
              <td>
                <button
                  className="delete-button"
                  onClick={() => onDelete(item.id)}
                  title="মুছে ফেলুন"
                  aria-label="মুছে ফেলুন"
                >
                  <Trash2 size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ContactPage({
  title,
  contacts,
  onAdd,
  onDelete,
}: {
  title: string
  contacts: Contact[]
  onAdd: () => void
  onDelete: (id: string) => void
}) {
  return (
    <section className="transactions-panel panel">
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          <p>আপনার পরিচিতির তথ্য সংরক্ষণ করুন</p>
        </div>
        <button className="primary-action" onClick={onAdd}>
          <Plus size={17} /> নতুন যোগ করুন
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="empty-module">
          <div className="empty-icon"><UserRound size={28} /></div>
          <h3>এখনো কোনো তথ্য যোগ করা হয়নি</h3>
          <p>নতুন যোগ করুন বাটনে ক্লিক করে তথ্য সংরক্ষণ করুন।</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>নাম</th>
                <th>মোবাইল</th>
                <th>যোগ করার তারিখ</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(contact => (
                <tr key={contact.id}>
                  <td>
                    <div className="transaction-person">
                      <div className="transaction-icon income">
                        <UserRound size={17} />
                      </div>
                      <strong>{contact.name}</strong>
                    </div>
                  </td>
                  <td>{contact.phone || '—'}</td>
                  <td>{formatDate(contact.createdAt)}</td>
                  <td>
                    <button
                      className="delete-button"
                      onClick={() => onDelete(contact.id)}
                      aria-label="মুছে ফেলুন"
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ReportPage({
  totals,
  transactions,
}: {
  totals: { income: number; expense: number; balance: number }
  transactions: Transaction[]
}) {
  const incomeCount = transactions.filter(item => item.type === 'income').length
  const expenseCount = transactions.filter(item => item.type === 'expense').length

  return (
    <section className="panel report-panel">
      <div className="panel-header">
        <div>
          <h3>হিসাবের রিপোর্ট</h3>
          <p>এ পর্যন্ত সংরক্ষিত সব লেনদেনের সারাংশ</p>
        </div>
      </div>
      <div className="stats-grid">
        <ReportStat title="মোট আয়" amount={totals.income} icon={<TrendingUp size={20} />} />
        <ReportStat title="মোট ব্যয়" amount={totals.expense} icon={<TrendingDown size={20} />} />
        <ReportStat title="বর্তমান ব্যালেন্স" amount={totals.balance} icon={<Wallet size={20} />} />
      </div>
      <div className="report-counts">
        <div><span>আয়ের এন্ট্রি</span><strong>{incomeCount.toLocaleString('bn-BD')} টি</strong></div>
        <div><span>ব্যয়ের এন্ট্রি</span><strong>{expenseCount.toLocaleString('bn-BD')} টি</strong></div>
        <div><span>মোট লেনদেন</span><strong>{transactions.length.toLocaleString('bn-BD')} টি</strong></div>
      </div>
            
      <CashFlowChart transactions={transactions} />
    </section>
  )
}

function ReportStat({
  title,
  amount,
  icon,
}: {
  title: string
  amount: number
  icon: ReactNode
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <div className="stat-icon green">{icon}</div>
      </div>
      <h3>{money(amount)}</h3>
    </div>
  )
}

function ComingSoon({
  icon,
  title,
  description,
  action,
  actionLabel,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: () => void
  actionLabel?: string
}) {
  return (
    <section className="empty-module module-coming-soon">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="primary-action" onClick={action}>
          <Plus size={17} /> {actionLabel}
        </button>
      )}
    </section>
  )
}

function SettingsPage({
  transactionCount,
  customerCount,
  supplierCount,
}: {
  transactionCount: number
  customerCount: number
  supplierCount: number
}) {
  return (
    <section className="panel settings-panel">
      <div className="panel-header">
        <div>
          <h3>অ্যাপের সেটিংস</h3>
          <p>আপনার হিসাবখাতার সংরক্ষিত তথ্য</p>
        </div>
      </div>
      <div className="report-counts">
        <div><span>লেনদেন</span><strong>{transactionCount.toLocaleString('bn-BD')} টি</strong></div>
        <div><span>কাস্টমার</span><strong>{customerCount.toLocaleString('bn-BD')} জন</strong></div>
        <div><span>সাপ্লায়ার</span><strong>{supplierCount.toLocaleString('bn-BD')} জন</strong></div>
      </div>
      <div className="storage-notice">
        <Save size={19} />
        <div>
          <strong>লোকাল ডেটা সংরক্ষণ চালু আছে</strong>
          <p>আপনার তথ্য এই ব্রাউজারের Local Storage-এ সংরক্ষিত হচ্ছে। অন্য ডিভাইসে স্বয়ংক্রিয়ভাবে যাবে না।</p>
        </div>
      </div>
    </section>
  )
}

function Modal({
  type,
  onClose,
  onTransactionSubmit,
  onContactSubmit,
  calculatorResult,
  onOpenCalculator,
}: {
  type: ModalType
  onClose: () => void
  onTransactionSubmit: (event: FormEvent<HTMLFormElement>) => void
  onContactSubmit: (event: FormEvent<HTMLFormElement>) => void
  calculatorResult: string
  onOpenCalculator: () => void
}) {
  const [amountValue, setAmountValue] = useState('')

  useEffect(() => {
    if (calculatorResult !== '') {
      setAmountValue(calculatorResult)
    }
  }, [calculatorResult])

  const isContact = type === 'customer' || type === 'supplier'

  const title = type === 'income'
    ? 'নতুন আয় যোগ করুন'
    : type === 'expense'
      ? 'নতুন খরচ যোগ করুন'
      : type === 'customer'
        ? 'নতুন কাস্টমার যোগ করুন'
        : 'নতুন সাপ্লায়ার যোগ করুন'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isContact) {
      onContactSubmit(event)
    } else {
      onTransactionSubmit(event)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="transaction-modal"
        onClick={event => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3>{title}</h3>
            <p>প্রয়োজনীয় তথ্য পূরণ করুন</p>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="বন্ধ করুন"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isContact ? (
            <>
              <label className="form-label">
                নাম *
                <input
                  className="form-input"
                  name="name"
                  placeholder="নাম লিখুন"
                  required
                  autoFocus
                />
              </label>
              <label className="form-label">
                মোবাইল নম্বর
                <input
                  className="form-input"
                  name="phone"
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                />
              </label>
            </>
          ) : (
            <>
              <label className="form-label">
                নাম / প্রতিষ্ঠানের নাম
                <input
                  className="form-input"
                  name="name"
                  placeholder="যেমন: রহিম স্টোর"
                />
              </label>

              <label className="form-label">
                টাকার পরিমাণ *
                <div className="amount-field-row">
                  <input
                    className="form-input amount-input"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="০.০০"
                    value={amountValue}
                    onChange={event => setAmountValue(event.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="amount-calculator-button"
                    onClick={onOpenCalculator}
                    title="ক্যালকুলেটর খুলুন"
                  >
                    <Calculator size={19} />
                  </button>
                </div>
              </label>

              <label className="form-label">
                বিবরণ
                <input
                  className="form-input"
                  name="description"
                  placeholder="লেনদেনের কারণ লিখুন"
                />
              </label>

              <label className="form-label">
                তারিখ *
                <input
                  className="form-input"
                  name="date"
                  type="date"
                  defaultValue={getToday()}
                  required
                />
              </label>
            </>
          )}

          <button type="submit" className="modal-submit">
            <Save size={17} />
            সংরক্ষণ করুন
          </button>
        </form>
      </div>
    </div>
  )
}

function CalculatorPanel({
  pinned,
  onPin,
  onClose,
  onUseResult,
}: {
  pinned: boolean
  onPin: () => void
  onClose: () => void
  onUseResult: (value: string) => void
}) {
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState('')

  const [history, setHistory] = useState<CalculatorHistory[]>(() => {
    try {
      const saved = localStorage.getItem(CALCULATOR_HISTORY_KEY)
      return saved ? JSON.parse(saved) as CalculatorHistory[] : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(
        CALCULATOR_HISTORY_KEY,
        JSON.stringify(history),
      )
    } catch (storageError) {
      console.error('ক্যালকুলেটর হিস্টোরি সংরক্ষণ করা যায়নি:', storageError)
    }
  }, [history])

  function press(value: string) {
    setError('')
    setExpression(previous => previous + value)
  }

  function clear() {
    setExpression('')
    setResult(null)
    setError('')
  }

  function backspace() {
    setExpression(previous => previous.slice(0, -1))
    setResult(null)
    setError('')
  }

  function calculate() {
    try {
      if (!expression.trim()) return

      const answer = calculateExpression(expression)

      setResult(answer)
      setHistory(previous => [
        {
          id: crypto.randomUUID(),
          expression,
          result: answer,
          createdAt: new Date().toLocaleTimeString('bn-BD'),
        },
        ...previous,
      ].slice(0, 20))

      setError('')
    } catch {
      setResult(null)
      setError('হিসাবটি সঠিক নয়। আবার চেষ্টা করুন।')
    }
  }

  const buttons = [
    { label: 'AC', action: clear, style: 'calc-clear' },
    { label: '(', action: () => press('(') },
    { label: ')', action: () => press(')') },
    { label: '÷', action: () => press('/'), style: 'calc-operator', icon: <Divide size={19} /> },
    { label: '7', action: () => press('7') },
    { label: '8', action: () => press('8') },
    { label: '9', action: () => press('9') },
    { label: '×', action: () => press('*'), style: 'calc-operator' },
    { label: '4', action: () => press('4') },
    { label: '5', action: () => press('5') },
    { label: '6', action: () => press('6') },
    { label: '−', action: () => press('-'), style: 'calc-operator', icon: <Minus size={19} /> },
    { label: '1', action: () => press('1') },
    { label: '2', action: () => press('2') },
    { label: '3', action: () => press('3') },
    { label: '+', action: () => press('+'), style: 'calc-operator' },
    { label: '%', action: () => press('%'), style: 'calc-operator', icon: <Percent size={18} /> },
    { label: '0', action: () => press('0') },
    { label: '.', action: () => press('.') },
    { label: '=', action: calculate, style: 'calc-equal', icon: <Equal size={20} /> },
  ]

  return (
    <section className={`calculator-panel ${pinned ? 'calculator-pinned' : ''}`}>
      <div className="calculator-header">
        <div className="calculator-heading">
          <div className="calculator-heading-icon">
            <Calculator size={20} />
          </div>
          <div>
            <strong>স্মার্ট ক্যালকুলেটর</strong>
            <span>{pinned ? 'পিন করা আছে' : 'দ্রুত হিসাব করুন'}</span>
          </div>
        </div>

        <div className="calculator-header-actions">
          <button
            type="button"
            onClick={onPin}
            title={pinned ? 'আনপিন করুন' : 'পিন করুন'}
          >
            {pinned ? <PinOff size={18} /> : <Pin size={18} />}
          </button>
          <button type="button" onClick={onClose} title="লুকান">
            <X size={19} />
          </button>
        </div>
      </div>

      <div className="calculator-display">
        <input
          value={expression}
          onChange={event => {
            setExpression(event.target.value)
            setResult(null)
            setError('')
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') calculate()
            if (event.key === 'Escape') clear()
          }}
          placeholder="হিসাব লিখুন..."
          aria-label="ক্যালকুলেটর হিসাব"
        />

        <div className="calculator-result">
          {error || (
            result !== null
              ? result.toLocaleString('en-US', { maximumFractionDigits: 8 })
              : 'ফলাফল এখানে দেখাবে'
          )}
        </div>
      </div>

      <div className="calculator-keys">
        {buttons.map((button, index) => (
          <button
            key={`${button.label}-${index}`}
            type="button"
            className={button.style || ''}
            onClick={button.action}
          >
            {button.icon || button.label}
          </button>
        ))}
      </div>

      <div className="calculator-bottom-actions">
        <button type="button" onClick={backspace}>
          <Delete size={17} /> মুছুন
        </button>
        <button
          type="button"
          disabled={result === null}
          onClick={() => {
            if (result !== null) onUseResult(String(result))
          }}
        >
          <Wallet size={17} /> Amount-এ বসান
        </button>
      </div>

      <div className="calculator-history">
        <div className="calculator-history-title">
          <strong><History size={16} /> সাম্প্রতিক হিসাব</strong>
          <button
            type="button"
            onClick={() => {
              if (confirm('সব হিসাবের History মুছে ফেলতে চান?')) {
                setHistory([])
              }
            }}
          >
            মুছুন
          </button>
        </div>

        {history.length === 0 ? (
          <p>এখনো কোনো হিসাব করা হয়নি।</p>
        ) : (
          history.slice(0, 5).map(item => (
            <button
              type="button"
              className="calculator-history-item"
              key={item.id}
              onClick={() => {
                setExpression(item.expression)
                setResult(item.result)
                setError('')
              }}
            >
              <span>{item.expression}</span>
              <strong>{item.result.toLocaleString('en-US')}</strong>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

export default App




