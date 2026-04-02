// WhatsApp Cloud API sender
// Handles text messages, interactive messages with buttons, and template messages

export interface SendTextOptions {
  phoneNumberId: string
  accessToken: string
  to: string
  message: string
}

export interface SendInteractiveOptions {
  phoneNumberId: string
  accessToken: string
  to: string
  body: string
  buttons: Array<{ id: string; title: string }>
}

export interface SendTemplateOptions {
  phoneNumberId: string
  accessToken: string
  to: string
  templateName: string
  languageCode: string
  components?: unknown[]
}

const WA_API_VERSION = 'v21.0'

async function callWhatsAppAPI(
  phoneNumberId: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<{ messageId: string }> {
  const url = `https://graph.facebook.com/${WA_API_VERSION}/${phoneNumberId}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`WhatsApp API error ${res.status}: ${error}`)
  }

  const data = await res.json() as { messages: Array<{ id: string }> }
  return { messageId: data.messages?.[0]?.id ?? '' }
}

export async function sendTextMessage(opts: SendTextOptions): Promise<{ messageId: string }> {
  return callWhatsAppAPI(opts.phoneNumberId, opts.accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: opts.to,
    type: 'text',
    text: {
      preview_url: false,
      body: opts.message,
    },
  })
}

export async function sendInteractiveMessage(opts: SendInteractiveOptions): Promise<{ messageId: string }> {
  return callWhatsAppAPI(opts.phoneNumberId, opts.accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: opts.to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: opts.body },
      action: {
        buttons: opts.buttons.map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title.slice(0, 20) }, // WA limit: 20 chars
        })),
      },
    },
  })
}

export async function sendTemplateMessage(opts: SendTemplateOptions): Promise<{ messageId: string }> {
  return callWhatsAppAPI(opts.phoneNumberId, opts.accessToken, {
    messaging_product: 'whatsapp',
    to: opts.to,
    type: 'template',
    template: {
      name: opts.templateName,
      language: { code: opts.languageCode },
      components: opts.components ?? [],
    },
  })
}
