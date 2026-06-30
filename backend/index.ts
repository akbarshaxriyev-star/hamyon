import { PrismaClient } from '@prisma/client'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import https from 'https'

dotenv.config()
const prisma = new PrismaClient()
const token = process.env.TELEGRAM_BOT_TOKEN
const port = process.env.PORT || 5000

// Express setup
const app = express()
app.use(cors())
app.use(express.json())

// Auth: OTP tasdiqlash va saytga kirish
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, code } = req.body
  if (!phone || !code) {
    return res.status(400).json({ error: "Raqam va kodni kiritishingiz shart" })
  }
  
  // Raqamni probellardan tozalash
  const cleanPhone = phone.replace(/\s+/g, '')

  try {
    // Bazadan OTP kodini qidirish
    const otp = await prisma.otp.findUnique({
      where: { phone: cleanPhone }
    })

    if (!otp || otp.code !== code.trim()) {
      return res.status(400).json({ error: "Tasdiqlash kodi noto'g'ri!" })
    }

    // Foydalanuvchini bazadan qidirish yoki yangi yaratish
    let user = await prisma.user.findUnique({
      where: { phone: cleanPhone }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: cleanPhone,
          firstName: otp.firstName || "Foydalanuvchi",
          lastName: otp.lastName || ""
        }
      })
    }

    // Kod muvaffaqiyatli ishlatilgandan so'ng uni bazadan o'chirish
    await prisma.otp.delete({ where: { phone: cleanPhone } })

    return res.json({
      success: true,
      user: {
        phone: user.phone,
        name: `${user.firstName} ${user.lastName}`.trim()
      }
    })
  } catch (error) {
    console.error("Xatolik verify-otp:", error)
    return res.status(500).json({ error: "Ichki server xatoligi yuz berdi" })
  }
})

// Express Serverni ishga tushirish
app.listen(port, () => {
  console.log(`Backend server http://localhost:${port} da ishga tushdi`)
})

// Telegram Bot Polling (Long Polling Loop) - Tashqi kutubxonalarsiz ishlaydi
let lastUpdateId = 0

function botRequest(method: string, data: object = {}) {
  return new Promise<any>((resolve, reject) => {
    const postData = JSON.stringify(data)
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', (e) => reject(e))
    req.write(postData)
    req.end()
  })
}

async function pollTelegramUpdates() {
  try {
    const response = await botRequest('getUpdates', {
      offset: lastUpdateId + 1,
      timeout: 10
    })

    if (response.ok && response.result.length > 0) {
      for (const update of response.result) {
        lastUpdateId = update.update_id
        await handleBotUpdate(update)
      }
    }
  } catch (err) {
    console.error("Telegram bot ulanish xatosi:", err)
  }
  
  // Har 1.5 soniyada yangi xabarlarni tekshirish
  setTimeout(pollTelegramUpdates, 1500)
}

async function handleBotUpdate(update: any) {
  const message = update.message
  if (!message) return

  const chatId = message.chat.id
  
  // /start bosilganda telefon yuborish klaviaturasini chiqarish
  if (message.text === '/start') {
    await botRequest('sendMessage', {
      chat_id: chatId,
      text: "Assalomu alaykum! Hamyon ilovasiga kirish uchun pastdagi '📱 Telefon raqamni yuborish' tugmasini bosing:",
      reply_markup: {
        keyboard: [
          [
            {
              text: "📱 Telefon raqamni yuborish",
              request_contact: true
            }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    })
    return
  }

  // Telegramdan telefon raqami yuborilganda OTP kod generatsiya qilish
  if (message.contact) {
    const contact = message.contact
    let phone = contact.phone_number
    
    if (!phone.startsWith('+')) {
      phone = '+' + phone
    }

    const cleanPhone = phone.replace(/\s+/g, '')

    // 6 xonali tasodifiy kod
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Kodni bazaga yozish/yangilash
    await prisma.otp.upsert({
      where: { phone: cleanPhone },
      update: {
        code,
        firstName: contact.first_name,
        lastName: contact.last_name || ""
      },
      create: {
        phone: cleanPhone,
        code,
        firstName: contact.first_name,
        lastName: contact.last_name || ""
      }
    })

    // Foydalanuvchiga Telegramda kodni yuborish
    await botRequest('sendMessage', {
      chat_id: chatId,
      text: `🔐 Sizning tasdiqlash kodingiz: \n\n${code}\n\nUshbu kodni Hamyon ilovasiga kiriting.`,
      reply_markup: {
        remove_keyboard: true
      }
    })
  }
}

// Telegram Botni ishga tushirish
if (token) {
  console.log("Telegram bot polling ishga tushdi...")
  pollTelegramUpdates()
} else {
  console.warn("TELEGRAM_BOT_TOKEN topilmadi. Bot ishlamadi.")
}
