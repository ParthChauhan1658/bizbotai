import { Resend } from 'resend'

const resend = new Resend(process.env['RESEND_API_KEY']!)

export async function sendEscalationAlert(opts: {
  toEmail: string
  businessName: string
  customerName: string
  customerPhone: string
  reason: string
  conversationId: string
}): Promise<void> {
  const { toEmail, businessName, customerName, customerPhone, reason, conversationId } = opts

  await resend.emails.send({
    from: 'BizBot AI <alerts@bizbot.ai>',
    to: toEmail,
    subject: `🚨 Customer needs your attention — ${businessName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Customer Needs Your Attention</h2>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p style="color: #374151;">The AI has escalated a conversation to you at <strong>${businessName}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; color: #6b7280; font-weight: 500;">Customer</td>
              <td style="padding: 8px; color: #111827;">${customerName}</td>
            </tr>
            <tr style="background: #f3f4f6;">
              <td style="padding: 8px; color: #6b7280; font-weight: 500;">Phone</td>
              <td style="padding: 8px; color: #111827;">${customerPhone}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #6b7280; font-weight: 500;">Reason</td>
              <td style="padding: 8px; color: #111827;">${reason}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 14px;">Conversation ID: ${conversationId}</p>
          <p style="color: #374151; margin-top: 16px;">Please respond to the customer on WhatsApp as soon as possible.</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
          Sent by BizBot AI — your WhatsApp AI assistant
        </p>
      </div>
    `,
  })
}

export async function sendOrderConfirmationEmail(opts: {
  toEmail: string
  customerName: string
  orderNumber: string
  items: Array<{ name: string; quantity: number; price: string }>
  total: string
  paymentLinkUrl?: string
}): Promise<void> {
  const { toEmail, customerName, orderNumber, items, total, paymentLinkUrl } = opts

  const itemsHtml = items.map(item =>
    `<tr>
      <td style="padding: 8px; color: #374151;">${item.name}</td>
      <td style="padding: 8px; text-align: center; color: #374151;">${item.quantity}</td>
      <td style="padding: 8px; text-align: right; color: #374151;">₹${item.price}</td>
    </tr>`
  ).join('')

  await resend.emails.send({
    from: 'BizBot AI <orders@bizbot.ai>',
    to: toEmail,
    subject: `Order Confirmed — #${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Order Confirmed ✓</h2>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>Hi ${customerName}, your order <strong>#${orderNumber}</strong> has been received!</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead>
              <tr style="background: #e5e7eb;">
                <th style="padding: 8px; text-align: left;">Item</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr style="border-top: 2px solid #e5e7eb;">
                <td colspan="2" style="padding: 8px; font-weight: 600;">Total</td>
                <td style="padding: 8px; text-align: right; font-weight: 600;">₹${total}</td>
              </tr>
            </tfoot>
          </table>
          ${paymentLinkUrl ? `<a href="${paymentLinkUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Pay Now</a>` : ''}
        </div>
      </div>
    `,
  })
}
