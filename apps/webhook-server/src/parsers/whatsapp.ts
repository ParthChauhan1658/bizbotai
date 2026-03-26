export interface ParsedMessage {
  waMessageId: string
  from: string // customer's WhatsApp phone number
  phoneNumberId: string // business's phone number ID
  businessAccountId: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'interactive' | 'button' | 'status'
  content?: string
  mediaId?: string
  mediaMimeType?: string
  mediaCaption?: string
  interactiveId?: string
  interactiveTitle?: string
  latitude?: number
  longitude?: number
  status?: string
  timestamp: number
  customerName?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseWhatsAppWebhook(body: any): ParsedMessage[] {
  const messages: ParsedMessage[] = []

  const entry = body?.entry?.[0]
  const change = entry?.changes?.[0]
  const value = change?.value

  if (!value) return messages

  const phoneNumberId = value.metadata?.phone_number_id as string
  const businessAccountId = entry?.id as string
  const contacts = value.contacts ?? []

  // Handle incoming messages
  for (const message of value.messages ?? []) {
    const customerName = contacts.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c.wa_id === message.from
    )?.profile?.name as string | undefined

    const base = {
      waMessageId: message.id as string,
      from: message.from as string,
      phoneNumberId,
      businessAccountId,
      timestamp: parseInt(message.timestamp as string) * 1000,
      customerName,
    }

    if (message.type === 'text') {
      messages.push({ ...base, type: 'text', content: message.text?.body as string })
    } else if (message.type === 'image') {
      messages.push({
        ...base, type: 'image',
        mediaId: message.image?.id as string,
        mediaMimeType: message.image?.mime_type as string,
        mediaCaption: message.image?.caption as string,
      })
    } else if (message.type === 'audio') {
      messages.push({ ...base, type: 'audio', mediaId: message.audio?.id as string })
    } else if (message.type === 'video') {
      messages.push({
        ...base, type: 'video',
        mediaId: message.video?.id as string,
        mediaCaption: message.video?.caption as string,
      })
    } else if (message.type === 'document') {
      messages.push({
        ...base, type: 'document',
        mediaId: message.document?.id as string,
        mediaMimeType: message.document?.mime_type as string,
      })
    } else if (message.type === 'location') {
      messages.push({
        ...base, type: 'location',
        latitude: message.location?.latitude as number,
        longitude: message.location?.longitude as number,
      })
    } else if (message.type === 'interactive') {
      const interactive = message.interactive
      messages.push({
        ...base, type: 'interactive',
        interactiveId: (interactive?.button_reply?.id ?? interactive?.list_reply?.id) as string,
        interactiveTitle: (interactive?.button_reply?.title ?? interactive?.list_reply?.title) as string,
        content: (interactive?.button_reply?.title ?? interactive?.list_reply?.title) as string,
      })
    } else if (message.type === 'button') {
      messages.push({
        ...base, type: 'button',
        interactiveId: message.button?.payload as string,
        content: message.button?.text as string,
      })
    }
  }

  // Handle status updates
  for (const status of value.statuses ?? []) {
    messages.push({
      waMessageId: status.id as string,
      from: status.recipient_id as string,
      phoneNumberId,
      businessAccountId,
      type: 'status',
      status: status.status as string,
      timestamp: parseInt(status.timestamp as string) * 1000,
    })
  }

  return messages
}
