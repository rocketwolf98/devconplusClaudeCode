// Shared email HTML templates for DEVCON+ transactional emails.
// All templates are mobile-first, 390px max-width, on-brand (navy + blue).

export interface RegistrationEmailParams {
  memberName: string
  eventTitle: string
  eventDate: string      // pre-formatted date string
  eventLocation?: string
  pointsValue: number
  ticketUrl: string
}

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DEVCON+</title>
  <style>
    body { margin: 0; padding: 0; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 390px; margin: 0 auto; }
    .header { background: #1E2A56; padding: 28px 24px 24px; text-align: center; }
    .header-wordmark { color: #FFFFFF; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .header-plus { color: #EA641D; }
    .body { background: #FFFFFF; padding: 28px 24px; }
    .footer { background: #1E2A56; padding: 20px 24px; text-align: center; }
    .footer p { color: rgba(255,255,255,0.45); font-size: 11px; margin: 0; line-height: 1.6; }
    h2 { color: #0F172A; font-size: 20px; font-weight: 800; margin: 0 0 8px; }
    p { color: #334155; font-size: 14px; line-height: 1.65; margin: 0 0 16px; }
    .detail-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 10px; font-size: 13px; color: #64748B; }
    .detail-label { color: #94A3B8; min-width: 72px; font-size: 12px; }
    .detail-value { color: #0F172A; font-weight: 600; }
    .points-badge { display: inline-block; background: #DCFCE7; color: #16A34A; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 99px; border: 1px solid #BBF7D0; }
    .cta { display: block; background: #367BDD; color: #FFFFFF; font-weight: 700; font-size: 15px; text-align: center; text-decoration: none; padding: 14px 24px; border-radius: 14px; margin-top: 24px; }
    .divider { border: none; border-top: 1px solid #E2E8F0; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-wordmark">DEVCON<span class="header-plus">+</span></div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>DEVCON Philippines — Sync. Support. Succeed.<br/>You're receiving this because you registered for an event.</p>
    </div>
  </div>
</body>
</html>`
}

export function registrationConfirmationEmail(params: RegistrationEmailParams): string {
  const { memberName, eventTitle, eventDate, eventLocation, pointsValue, ticketUrl } = params

  const content = `
    <h2>You're registered! 🎉</h2>
    <p>Hi ${memberName},</p>
    <p>Your spot has been confirmed for <strong>${eventTitle}</strong>. See you there!</p>
    <hr class="divider" />
    <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${eventDate}</span></div>
    ${eventLocation ? `<div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${eventLocation}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">Points</span><span class="points-badge">+${pointsValue} XP on attendance</span></div>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748B;">Show your QR ticket at the venue entrance to check in and earn your points.</p>
    <a href="${ticketUrl}" class="cta">View My Ticket</a>
  `
  return baseLayout(content)
}

export function registrationApprovedEmail(params: RegistrationEmailParams): string {
  const { memberName, eventTitle, eventDate, eventLocation, pointsValue, ticketUrl } = params

  const content = `
    <h2>You're approved!</h2>
    <p>Hi ${memberName},</p>
    <p>Great news — your registration for <strong>${eventTitle}</strong> has been approved by the organizer.</p>
    <hr class="divider" />
    <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${eventDate}</span></div>
    ${eventLocation ? `<div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${eventLocation}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">Points</span><span class="points-badge">+${pointsValue} XP on attendance</span></div>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748B;">Your QR ticket is ready. Show it at the venue entrance to check in.</p>
    <a href="${ticketUrl}" class="cta">View My Ticket</a>
  `
  return baseLayout(content)
}
