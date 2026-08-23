/**
 * WhatsApp messaging library — provider abstraction for the Meta Cloud API.
 *
 * Supports two modes via the WHATSAPP_PROVIDER env var:
 *   - "mock" (default): logs to console + DB, no real messages sent. Zero setup.
 *   - "meta": calls the Meta Cloud API (POST graph.facebook.com/v18.0/{phone_id}/messages)
 *
 * To go live:
 *   1. Set WHATSAPP_PROVIDER=meta
 *   2. Set WHATSAPP_PHONE_NUMBER_ID (from Meta Business Manager)
 *   3. Set WHATSAPP_ACCESS_TOKEN (from Meta Business Manager)
 *   4. Set WHATSAPP_BUSINESS_ID (from Meta Business Manager)
 *
 * The first 1,000 service conversations per month are free. A salon doing
 * 100 bookings/month pays $0.
 */

import { db } from './db'

type TxClient = any  // Prisma transaction client

export interface WhatsAppMessage {
  templateName: string        // pre-approved Meta template name
  templateParams: string[]    // {{1}}, {{2}}, etc.
  language?: string            // "ar" or "en" (default: "en")
}

export interface WhatsAppSendResult {
  success: boolean
  messageId?: string          // Meta's message ID (for delivery tracking)
  error?: string
}

const PROVIDER = process.env.WHATSAPP_PROVIDER || 'mock'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || ''
const BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID || ''

/**
 * Check if WhatsApp is configured and ready.
 * In mock mode, always returns true.
 * In meta mode, requires PHONE_NUMBER_ID + ACCESS_TOKEN.
 */
export function isWhatsAppConfigured(): boolean {
  if (PROVIDER === 'mock') return true
  return !!(PHONE_NUMBER_ID && ACCESS_TOKEN)
}

/**
 * Send a WhatsApp template message to a customer.
 * Logs the message to WhatsAppMessageLog regardless of provider.
 *
 * In mock mode: logs to console, returns a fake message ID.
 * In meta mode: calls the Cloud API, returns the real message ID.
 */
export async function sendWhatsAppMessage(
  tx: TxClient,
  tenantId: string,
  appointmentId: string | null,
  customerId: string | null,
  phoneNumber: string,
  message: WhatsAppMessage,
  messageContent: string,  // the full text (for the log)
): Promise<WhatsAppSendResult> {
  // Normalize phone to E.164 (remove spaces, ensure + prefix)
  const normalizedPhone = phoneNumber.replace(/\s/g, '').replace(/^\+?/, '+')

  // Create a log entry (status: queued)
  const log = await tx.whatsAppMessageLog.create({
    data: {
      tenantId,
      appointmentId,
      customerId,
      phoneNumber: normalizedPhone,
      direction: 'outbound',
      templateName: message.templateName,
      status: 'queued',
      content: messageContent,
    },
  })

  try {
    let result: WhatsAppSendResult

    if (PROVIDER === 'mock') {
      // Mock mode — log to console, return a fake message ID
      console.log('\n=========================================')
      console.log('📱 WHATSAPP (mock mode — no real message sent)')
      console.log('=========================================')
      console.log(`  To:      ${normalizedPhone}`)
      console.log(`  Template: ${message.templateName}`)
      console.log(`  Language: ${message.language || 'en'}`)
      console.log(`  Content:`)
      console.log(messageContent.split('\n').map((l: string) => `    ${l}`).join('\n'))
      console.log('=========================================\n')

      result = {
        success: true,
        messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      }
    } else if (PROVIDER === 'meta') {
      // Meta Cloud API — call the Graph API
      if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
        throw new Error('WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set')
      }

      const res = await fetch(
        `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: normalizedPhone.replace('+', ''),
            type: 'template',
            template: {
              name: message.templateName,
              language: { code: message.language || 'en' },
              components: message.templateParams.length > 0
                ? [{
                    type: 'body',
                    parameters: message.templateParams.map(p => ({ type: 'text', text: p })),
                  }]
                : undefined,
            },
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        const errMsg = data?.error?.message || `WhatsApp API error (HTTP ${res.status})`
        console.error('[WhatsApp] API error:', errMsg)

        // Update log to failed
        await tx.whatsAppMessageLog.update({
          where: { id: log.id },
          data: { status: 'failed', error: errMsg },
        })

        return { success: false, error: errMsg }
      }

      result = {
        success: true,
        messageId: data?.messages?.[0]?.id,
      }
    } else {
      throw new Error(`Unknown WHATSAPP_PROVIDER: ${PROVIDER}`)
    }

    // Update log to "sent" with the message ID
    if (result.success && result.messageId) {
      await tx.whatsAppMessageLog.update({
        where: { id: log.id },
        data: {
          status: 'sent',
          messageId: result.messageId,
          sentAt: new Date(),
        },
      })
    }

    return result
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[WhatsApp] send error:', errMsg)

    // Update log to failed
    await tx.whatsAppMessageLog.update({
      where: { id: log.id },
      data: { status: 'failed', error: errMsg },
    })

    return { success: false, error: errMsg }
  }
}

/**
 * Build the confirmation message content (for the log + mock display).
 * Returns both the formatted text and the template params.
 */
export function buildConfirmationMessage(params: {
  customerName: string
  serviceName: string
  dateStr: string
  timeStr: string
  salonName: string
  language: 'en' | 'ar'
}): { content: string; templateName: string; templateParams: string[]; language: string } {
  if (params.language === 'ar') {
    return {
      content: `مرحباً ${params.customerName}! تم تأكيد حجزك في ${params.salonName}:\n\n• ${params.serviceName}\n• ${params.dateStr} الساعة ${params.timeStr}\n\nردّ بحرف C للتأكيد أو R لإعادة الجدولة. نراك قريبًا!`,
      templateName: 'appointment_confirmation_ar',
      templateParams: [params.customerName, params.salonName, params.serviceName, params.dateStr, params.timeStr],
      language: 'ar',
    }
  }
  return {
    content: `Hi ${params.customerName}! Your booking at ${params.salonName} is confirmed:\n\n• ${params.serviceName}\n• ${params.dateStr} at ${params.timeStr}\n\nReply C to confirm or R to reschedule. See you soon!`,
    templateName: 'appointment_confirmation_en',
    templateParams: [params.customerName, params.salonName, params.serviceName, params.dateStr, params.timeStr],
    language: 'en',
  }
}

/**
 * Get the WhatsApp configuration status for the dashboard.
 * Returns whether WhatsApp is ready + which provider is active.
 */
export function getWhatsAppStatus() {
  return {
    provider: PROVIDER,
    configured: isWhatsAppConfigured(),
    phoneNumberId: PROVIDER === 'meta' ? PHONE_NUMBER_ID.slice(0, 8) + '...' : '(mock)',
    businessId: PROVIDER === 'meta' ? BUSINESS_ID.slice(0, 8) + '...' : '(mock)',
  }
}
