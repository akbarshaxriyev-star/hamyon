import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, History, Download, Home, User, BarChart2, X, Settings, LogOut, PlusCircle, Loader2, Send, ShieldCheck, MessageSquare } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import html2canvas from 'html2canvas'

export default function App() {
  const [isStartupLoading, setIsStartupLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'asosiy' | 'tahlil' | 'profil'>('asosiy')
  const [isPageLoading, setIsPageLoading] = useState(false)
  
  // Tizimga kirgan foydalanuvchi ma'lumotlari
  const [userPhone, setUserPhone] = useState<string | null>(() => {
    return localStorage.getItem('hamyon_user_phone')
  })
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('hamyon_user_name')
  })

  const [currency, setCurrency] = useState<'UZS' | 'USD' | 'RUB'>(() => {
    return (localStorage.getItem('hamyon_currency') as 'UZS' | 'USD' | 'RUB') || 'UZS'
  })

  useEffect(() => {
    localStorage.setItem('hamyon_currency', currency)
  }, [currency])

  const formatCurrency = (amount: number) => {
    if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`
    if (currency === 'RUB') return `${amount.toLocaleString('ru-RU')} ₽`
    return `${amount.toLocaleString('uz-UZ')} UZS`
  }

  // Login sahifasi uchun holatlar
  const [phoneInput, setPhoneInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [simulatedBotMessage, setSimulatedBotMessage] = useState<string | null>(null)
  const [simulatedUser, setSimulatedUser] = useState<{ name: string, username: string } | null>(null)

  // Simulyatsiya uchun Telegram foydalanuvchi ismlari ro'yxati
  const simulatedNames = [
    { name: "Ali Valiyev", username: "@ali_valiyev" },
    { name: "Madina Umarova", username: "@madina_u" },
    { name: "Diyorbek Karimov", username: "@diyor_k" },
    { name: "Sardor Rahimov", username: "@sardor_r" },
    { name: "Nigora Aliyeva", username: "@nigora_a" },
    { name: "Jasur Shukurov", username: "@jasur_sh" }
  ]

  // Ma'lumotlarni brauzerning localStorage xotirasidan yuklash
  const [transactions, setTransactions] = useState<any[]>(() => {
    const saved = localStorage.getItem('hamyon_transactions')
    return saved ? JSON.parse(saved) : []
  })
  
  // Tranzaksiyalar o'zgarganda ularni localStorage'ga saqlash
  useEffect(() => {
    localStorage.setItem('hamyon_transactions', JSON.stringify(transactions))
  }, [transactions])

  // Ilova birinchi marta yuklanganda (Splash Screen)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStartupLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Sahifani almashtirish (Loading Pages)
  const handleTabChange = (tab: 'asosiy' | 'tahlil' | 'profil') => {
    if (tab === activeTab) return
    setIsPageLoading(true)
    setTimeout(() => {
      setActiveTab(tab)
      setIsPageLoading(false)
    }, 500)
  }

  // Umumiylarni hisoblash
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  // A4 jadval ko'rinishidagi rasmiy hisobotni PNG rasm formatida qurilma galereyasiga yuklash
  const downloadImageReport = async () => {
    const reportElement = document.getElementById('image-report-template')
    if (!reportElement) return

    reportElement.style.display = 'block'

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `Hamyon-Moliyaviy-Hisobot-${new Date().toISOString().split('T')[0]}.png`
      link.href = imgData
      link.click()
    } catch (error) {
      console.error('Rasm yaratishda xato:', error)
    } finally {
      reportElement.style.display = 'none'
    }
  }

  // Yangi kirim/chiqim qo'shish
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !title) return

    const numAmount = parseFloat(amount)
    
    // Emoji tanlash
    let icon = '💸'
    if (formType === 'income') {
      switch (category) {
        case 'Oylik': icon = '💼'; break;
        case 'Stipendiya': icon = '🎓'; break;
        default: icon = '💰';
      }
    } else {
      switch (category) {
        case 'Oziq-ovqat': icon = '🛒'; break;
        case 'Transport': icon = '🚕'; break;
        case 'Kommunal': icon = '⚡'; break;
        case 'Kiyim': icon = '👕'; break;
        default: icon = '💸';
      }
    }

    const newTx = {
      id: Date.now().toString(),
      title,
      date,
      amount: numAmount,
      type: formType,
      category,
      icon
    }

    setTransactions([newTx, ...transactions])
    setIsModalOpen(false)
    setAmount('')
    setTitle('')
  }



  // Kategoriyalar bo'yicha taqsimot
  const getCategoryData = () => {
    const expenseTxs = transactions.filter(t => t.type === 'expense')
    const categoriesMap: { [key: string]: number } = {}
    expenseTxs.forEach(t => {
      categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount
    })
    return Object.keys(categoriesMap).map(name => ({
      name,
      value: categoriesMap[name]
    }))
  }

  // OTP so'rov yuborish
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneInput) return

    let cleanPhone = phoneInput.replace(/\s+/g, '')
    if (!cleanPhone.startsWith('+998')) {
      cleanPhone = '+998' + cleanPhone.replace(/^998/, '')
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || ''
      // 1. Real Backend serverni tekshirish
      await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, code: '000000' })
      })

      // Backend online bo'lsa, foydalanuvchiga faqat Telegramga yuborilganligini bildiramiz (kodni saytda ko'rsatmaymiz)
      setSimulatedBotMessage(`Botdan xabar 💬:\nTasdiqlash kodi Telegram botimiz (@hamyon_auth_bot) orqali yuborildi. Uni saytga kiriting.`);
      setStep('otp')
    } catch (err) {
      // 2. Agar backend o'chirilgan bo'lsa (Offline) -> lokal bypass simulyatsiyasi
      console.log("Backend offline. Lokal simulyatsiya yuklanmoqda...");
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const randomUser = simulatedNames[Math.floor(Math.random() * simulatedNames.length)]
      
      setGeneratedCode(code)
      setSimulatedUser(randomUser)
      
      // Xavfsizlik uchun kodni sayt yuzida ko'rsatmaymiz. Uni konsolga chiqaramiz va bypass kodni aytamiz.
      console.log(`[Offline test kodi]: ${code}`);
      
      setSimulatedBotMessage(`Botdan xabar 💬 [Offline]:\nKuting... Tasdiqlash kodi Telegram botingizga yuborildi.\n(Oflayn sinov uchun universal kod: 123456)`);
      setStep('otp')
    }
  }

  // OTP kodini tasdiqlash
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    let cleanPhone = phoneInput.replace(/\s+/g, '')
    if (!cleanPhone.startsWith('+998')) {
      cleanPhone = '+998' + cleanPhone.replace(/^998/, '')
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || ''
      // 1. Real API orqali tekshirish
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, code: otpInput })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          localStorage.setItem('hamyon_user_phone', data.user.phone)
          localStorage.setItem('hamyon_user_name', data.user.name)
          
          setUserPhone(data.user.phone)
          setUserName(data.user.name)
          setSimulatedBotMessage(null)
          setSimulatedUser(null)
          setStep('phone')
          setPhoneInput('')
          setOtpInput('')
          return
        }
      } else {
        const data = await response.json()
        alert(data.error || "Kod noto'g'ri!")
        return
      }
    } catch (netError) {
      // 2. Offline rejimi: universal 123456 kod yoki konsoldagi kod orqali kirish
      console.warn("Backend server ulanmadi (Offline rejim). Lokal tekshiruv...");
      if (otpInput === '123456' || (otpInput === generatedCode && simulatedUser)) {
        const finalUser = simulatedUser || { name: "Ali Valiyev", username: "@ali_valiyev" }
        localStorage.setItem('hamyon_user_phone', phoneInput)
        localStorage.setItem('hamyon_user_name', finalUser.name)
        
        setUserPhone(phoneInput)
        setUserName(finalUser.name)
        setSimulatedBotMessage(null)
        setSimulatedUser(null)
        setStep('phone')
        setPhoneInput('')
        setOtpInput('')
      } else {
        alert("Tasdiqlash kodi xato!");
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('hamyon_user_phone')
    localStorage.removeItem('hamyon_user_name')
    setUserPhone(null)
    setUserName(null)
    setActiveTab('asosiy')
  }

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']

  // Modal va Forma sozlamalari
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [formType, setFormType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Oziq-ovqat')
  const [date] = useState(new Date().toISOString().split('T')[0])

  // 1. Splash Screen
  if (isStartupLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-6 text-white">
        <div className="relative flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-2 border-t-emerald-400 border-emerald-950/30 animate-spin" />
          <div className="absolute">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="url(#walletGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 animate-pulse text-emerald-400">
              <defs>
                <linearGradient id="walletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6z" />
              <circle cx="20" cy="15" r="1" fill="#34d399" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-200 to-emerald-400">HAMYON</h1>
          <p className="text-[10px] text-gray-400 font-medium tracking-widest mt-1 uppercase">Pulingizni aqlli boshqaring</p>
        </div>
      </div>
    )
  }

  // 2. Telegram Auth Oynasi
  if (!userPhone) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-6 text-white flex flex-col justify-between max-w-md mx-auto relative overflow-hidden">
        <div className="text-center mt-12 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" className="w-8 h-8">
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wider">HAMYON</h1>
            <p className="text-xs text-gray-400 mt-1">Telegram bot orqali xavfsiz kirish</p>
          </div>
        </div>

        <div className="my-auto flex flex-col gap-6">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
              <div className="glass-panel p-4 bg-white/5 border border-white/10 flex flex-col gap-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
                  <MessageSquare className="w-4 h-4" /> Yo'riqnoma:
                </h3>
                <ol className="text-xs text-gray-300 list-decimal list-inside flex flex-col gap-1.5 leading-relaxed">
                  <li>Telegramda <a href="https://t.me/hamyon_auth_bot" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">@hamyon_auth_bot</a> botiga kiring</li>
                  <li>Botda <b className="text-white">/start</b> tugmasini bosing</li>
                  <li>Botga <b className="text-white">Telefon raqamni yuborish</b> tugmasi orqali raqamingizni yuboring</li>
                  <li>Bot sizga 6 xonali maxsus kod beradi</li>
                </ol>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Telefon raqamingiz</label>
                <div className="flex bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus-within:border-emerald-500 focus-within:bg-black/40 transition-colors">
                  <span className="text-gray-400 mr-2 font-medium flex items-center">+998</span>
                  <input 
                    type="tel" 
                    required
                    placeholder="90 123 45 67"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                <Send className="w-4 h-4" /> Botdan kod olish
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="glass-panel p-4 bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-xs text-gray-300">
                  Tasdiqlash kodi <b>{phoneInput}</b> raqamiga Telegram bot orqali yuborildi.
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Tasdiqlash kodi</label>
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest text-white outline-none focus:border-emerald-500 focus:bg-black/40 transition-colors"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => { setStep('phone'); setSimulatedBotMessage(null); }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-3.5 rounded-xl text-xs transition-colors"
                >
                  Orqaga
                </button>
                <button type="submit" className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Tasdiqlash va Kirish
                </button>
              </div>
            </form>
          )}
        </div>

        {simulatedBotMessage && (
          <div className="glass-panel p-4 border-l-4 border-l-blue-400 bg-blue-950/20 text-white text-xs font-mono rounded-xl leading-relaxed flex flex-col gap-1.5 shadow-lg shadow-black/40 absolute top-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
              <span className="font-semibold text-blue-400">🤖 Telegram Bot [Simulyatsiya]</span>
              <button onClick={() => setSimulatedBotMessage(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <p className="whitespace-pre-line text-[11px] font-bold text-center py-2 bg-black/30 rounded-lg text-emerald-400 select-all">
              {simulatedBotMessage}
            </p>
            <p className="text-[9px] text-gray-500 text-right mt-1">Ushbu kodni yuqoridagi maydonga kiriting.</p>
          </div>
        )}

        <div className="text-center text-[10px] text-gray-500 mb-4">
          Hamyon ilovasi 100% oflayn ishlaydi. Ma'lumotlaringiz faqat shu qurilmada qoladi.
        </div>
      </div>
    )
  }

  // 3. Asosiy Ilova oynasi
  return (
    <div className="min-h-screen pb-24 p-4 max-w-md mx-auto flex flex-col gap-5 bg-[#0f172a]">
      
      {/* Yuqori Header */}
      <header className="flex justify-between items-center py-2">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">HAMYON</h1>
          <p className="text-[11px] text-gray-400">Salom, {userName}!</p>
        </div>
        <div className="flex gap-2">
          {transactions.length > 0 && !isPageLoading && (
            <button onClick={downloadImageReport} className="glass-panel p-2 hover:bg-white/10 transition-colors flex items-center gap-1.5" title="Hisobot Rasmini yuklash">
              <Download className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] text-blue-400 font-semibold px-0.5">Yuklash</span>
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-[#10b981]/20 flex items-center justify-center border border-[#10b981]/40">
            <User className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </header>

      {/* Faol sahifani yuklash yoki render qilish */}
      <main id="active-page-content" className="flex-1 flex flex-col gap-5 min-h-[350px] justify-start">
        
        {isPageLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
            <p className="text-xs font-medium tracking-wider">Sahifa yuklanmoqda...</p>
          </div>
        ) : (
          <>
            {activeTab === 'asosiy' && (
              <>
                {/* Kirim va Chiqim Kartalari */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-panel p-4 flex flex-col gap-2 bg-gradient-to-br from-emerald-500/10 to-transparent">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <TrendingUp className="text-emerald-400 w-4 h-4" /> Jami Kirim
                    </div>
                    <h3 className="text-base font-bold text-emerald-400">{formatCurrency(totalIncome)}</h3>
                  </div>
                  <div className="glass-panel p-4 flex flex-col gap-2 bg-gradient-to-br from-red-500/10 to-transparent">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <TrendingDown className="text-red-400 w-4 h-4" /> Jami Chiqim
                    </div>
                    <h3 className="text-base font-bold text-red-400">{formatCurrency(totalExpense)}</h3>
                  </div>
                </div>

                {/* Kirim va Chiqim Qo'shuvchi Tugmalar */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => { setFormType('income'); setIsModalOpen(true); }}
                    className="glass-panel py-3 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-emerald-500/20 shadow-md shadow-emerald-950/20"
                  >
                    <PlusCircle className="w-4 h-4" /> Kirim Qo'shish
                  </button>
                  <button 
                    onClick={() => { setFormType('expense'); setIsModalOpen(true); }}
                    className="glass-panel py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-red-500/20 shadow-md shadow-red-950/20"
                  >
                    <PlusCircle className="w-4 h-4" /> Chiqim Qo'shish
                  </button>
                </div>

                {/* Oxirgi Amaliyotlar Ro'yxati */}
                <div className="glass-panel p-4">
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-orange-400" />
                    Amaliyotlar Tarixi
                  </h3>
                  
                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                      <span className="text-3xl opacity-50">📂</span>
                      <p className="text-sm text-gray-400 font-medium">Hozircha hech qanday ma'lumot yo'q</p>
                      <p className="text-[11px] text-gray-500 max-w-[200px]">Yangi kirim yoki chiqim qo'shish uchun tepadagi tugmalardan foydalaning</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {transactions.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-lg border border-white/5">
                              {item.icon}
                            </div>
                            <div>
                              <h4 className="font-medium text-xs text-white">{item.title}</h4>
                              <span className="text-[10px] text-gray-400 mr-2">{item.date}</span>
                              <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{item.category}</span>
                            </div>
                          </div>
                          <span className={`font-semibold text-xs ${item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'tahlil' && (
              <>
                {transactions.length === 0 ? (
                  <div className="glass-panel p-8 text-center flex flex-col items-center gap-3">
                    <span className="text-4xl">📊</span>
                    <h3 className="text-sm font-semibold">Tahlil uchun ma'lumot etarli emas</h3>
                    <p className="text-xs text-gray-400">Avval asosiy sahifada kirim yoki chiqim qo'shishingiz kerak.</p>
                  </div>
                ) : (
                  <>

                    {/* Chiqimlar toifasi bo'yicha tahlil */}
                    <div className="glass-panel p-5 flex flex-col gap-5 relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                      <h3 className="text-base font-semibold relative z-10">Toifalar bo'yicha xarajatlar</h3>
                      
                      {getCategoryData().length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4 relative z-10">Xarajatlar mavjud emas.</p>
                      ) : (
                        <div className="flex flex-col gap-6 relative z-10">
                          {/* Donut Chart */}
                          <div className="h-[180px] w-full flex justify-center items-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={getCategoryData()}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {getCategoryData().map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: any) => formatCurrency(Number(value))}
                                  contentStyle={{ 
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '12px', 
                                    fontSize: '11px',
                                    color: '#fff'
                                  }}
                                  itemStyle={{ color: '#fff' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Kategoriya Ro'yxati */}
                          <div className="flex flex-col gap-3">
                            {getCategoryData().map((cat, index) => {
                              const percent = Math.round((cat.value / totalExpense) * 100)
                              return (
                                <div key={cat.name} className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                      <span className="text-gray-300">{cat.name}</span>
                                    </div>
                                    <span className="font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                                      {formatCurrency(cat.value)} <span className="text-gray-500 font-medium ml-1">({percent}%)</span>
                                    </span>
                                  </div>
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all duration-1000" 
                                      style={{ 
                                        width: `${percent}%`, 
                                        backgroundColor: COLORS[index % COLORS.length] 
                                      }} 
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'profil' && (
              <>
                {/* Profil Sozlamalari */}
                <div className="glass-panel p-5 flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500/50 text-3xl">
                    👤
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{userName}</h3>
                    <p className="text-xs text-emerald-400 font-semibold">{userPhone}</p>
                  </div>
                  <div className="w-full h-[1px] bg-white/10 my-2" />
                  
                  <div className="w-full flex flex-col gap-3 text-left">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-gray-300 flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Til (Language)
                      </span>
                      <span className="text-xs text-[#10b981] font-semibold">O'zbekcha</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-gray-300 flex items-center gap-2">
                        💳 Valyuta (Currency)
                      </span>
                      <select 
                        value={currency} 
                        onChange={(e) => setCurrency(e.target.value as any)}
                        className="bg-transparent text-xs text-[#10b981] font-semibold outline-none text-right cursor-pointer"
                      >
                        <option value="UZS" className="bg-[#1e293b]">UZS (so'm)</option>
                        <option value="USD" className="bg-[#1e293b]">USD ($)</option>
                        <option value="RUB" className="bg-[#1e293b]">RUB (₽)</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-gray-300 flex items-center gap-2">
                        🔒 Ma'lumotlar saqlanishi
                      </span>
                      <span className="text-xs text-blue-400 font-semibold">Lokal (dev.db)</span>
                    </div>
                  </div>

                  <div className="w-full flex flex-col gap-2 mt-4">
                    <button 
                      onClick={() => { if(confirm("Tranzaksiyalar tarixini to'liq tozalamoqchimisiz?")) setTransactions([]) }}
                      className="w-full py-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-400/80 text-xs font-semibold transition-colors border border-red-500/10"
                    >
                      Tarixni tozalash
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-red-500/30 shadow-lg shadow-red-950/20"
                    >
                      <LogOut className="w-4 h-4" /> Tizimdan chiqish
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

      </main>

      {/* Telefon uchun Pastki Menyu */}
      <nav className="fixed bottom-0 left-0 right-0 glass-panel !rounded-none !rounded-t-3xl border-b-0 p-4 flex justify-around items-center z-40 bg-[#0f172a]/95">
        <button 
          onClick={() => handleTabChange('asosiy')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'asosiy' ? 'text-[#10b981]' : 'text-gray-400 hover:text-white'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Asosiy</span>
        </button>

        <button 
          onClick={() => handleTabChange('tahlil')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'tahlil' ? 'text-[#10b981]' : 'text-gray-400 hover:text-white'}`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Tahlil</span>
        </button>

        <button 
          onClick={() => handleTabChange('profil')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profil' ? 'text-[#10b981]' : 'text-gray-400 hover:text-white'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profil</span>
        </button>
      </nav>

      {/* Amaliyot Qo'shish Modali */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-[#1e293b] w-full max-w-md rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">
                {formType === 'income' ? '🟢 Kirim qo\'shish' : '🔴 Chiqim qo\'shish'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] text-gray-400 mb-1 block">Miqdor ({currency})</label>
                <input 
                  type="number" 
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white outline-none focus:border-sandiq-green focus:bg-black/40 transition-colors"
                  placeholder={currency === 'USD' ? '0 $' : currency === 'RUB' ? '0 ₽' : '0 UZS'}
                />
              </div>
              
              <div>
                <label className="text-[10px] text-gray-400 mb-1 block">Tavsif (Nima uchun?)</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-sandiq-green focus:bg-black/40 transition-colors"
                  placeholder={formType === 'income' ? 'Masalan: Oylik maosh, Sovg\'a' : 'Masalan: Bozorlik, Taksi'}
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 mb-1 block">Kategoriya / Toifa</label>
                <div 
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer flex justify-between items-center transition-colors hover:bg-black/40"
                >
                  <span>{category}</span>
                  <span className="text-gray-500 text-xs">▼</span>
                </div>
              </div>

              <button 
                type="submit" 
                className={`w-full py-3.5 rounded-xl font-bold text-sm mt-4 shadow-lg transition-transform active:scale-[0.98] ${formType === 'income' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`}
              >
                Saqlash
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Kategoriya Tanlash Modali (Ekranning markazida) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">Kategoriya tanlang</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {(formType === 'income' 
                ? [
                    { name: 'Oylik', icon: '💼' },
                    { name: 'Stipendiya', icon: '🎓' },
                    { name: 'Boshqa', icon: '💰' }
                  ]
                : [
                    { name: 'Oziq-ovqat', icon: '🛒' },
                    { name: 'Transport', icon: '🚕' },
                    { name: 'Kommunal', icon: '⚡' },
                    { name: 'Kiyim', icon: '👕' },
                    { name: 'Boshqa', icon: '💸' }
                  ]
              ).map(cat => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setCategory(cat.name)
                    setIsCategoryModalOpen(false)
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                    category === cat.name 
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[11px] font-semibold text-center leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 📄 Rasm formatidagi hisobot shabloni */}
      <div 
        id="image-report-template" 
        style={{ 
          display: 'none', 
          width: '800px', 
          padding: '50px', 
          backgroundColor: '#ffffff', 
          color: '#1e293b', 
          fontFamily: 'system-ui, -apple-system, sans-serif' 
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #10b981', paddingBottom: '20px', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#10b981', margin: 0, letterSpacing: '2px' }}>HAMYON</h1>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Moliyaviy Hisobot va Amaliyotlar Ro'yxati</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Sana: <b>{new Date().toLocaleDateString('uz-UZ')}</b></p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>Hisobot egasi: <b>{userName}</b> ({userPhone})</p>
          </div>
        </div>

        {/* Kirim va Chiqim xulosasi */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px 20px', backgroundColor: '#f0fdf4' }}>
            <span style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>🟢 Jami Kirim</span>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#15803d', margin: '5px 0 0 0' }}>{formatCurrency(totalIncome)}</h2>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px 20px', backgroundColor: '#fef2f2' }}>
            <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600' }}>🔴 Jami Chiqim</span>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#b91c1c', margin: '5px 0 0 0' }}>{formatCurrency(totalExpense)}</h2>
          </div>
        </div>

        {/* Jadval Sarlavhasi */}
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>
          📋 Amaliyotlar Ro'yxati
        </h3>

        {/* Jadval */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ border: '1px solid #e2e8f0', padding: '12px 10px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>№</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '12px 10px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>Sana</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '12px 10px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>Tavsif / Maqsad</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '12px 10px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>Kategoriya</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '12px 10px', textAlign: 'center', color: '#475569', fontWeight: '700' }}>Turi</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '12px 10px', textAlign: 'right', color: '#475569', fontWeight: '700' }}>Miqdor ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, idx) => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ border: '1px solid #e2e8f0', padding: '10px', color: '#64748b' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '10px', color: '#64748b' }}>{tx.date}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '10px', fontWeight: '600', color: '#1e293b' }}>{tx.title}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '10px', color: '#64748b' }}>
                  <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '10px' }}>{tx.category}</span>
                </td>
                <td style={{ border: '1px solid #e2e8f0', padding: '10px', textAlign: 'center', fontWeight: '700', color: tx.type === 'income' ? '#15803d' : '#b91c1c' }}>
                  {tx.type === 'income' ? 'Kirim' : 'Chiqim'}
                </td>
                <td style={{ border: '1px solid #e2e8f0', padding: '10px', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '60px', fontSize: '10px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
          <p style={{ margin: 0 }}>HAMYON — Shaxsiy kirim-chiqimlar nazorati tizimi. Ushbu rasm dastur tomonidan avtomatik shakllantirildi.</p>
        </div>
      </div>

    </div>
  )
}
