import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, businesses } from '@bizbot/database'

type VerifyRequest = {
  businessId: string
  phoneNumberId: string
  accessToken: string
}

type MetaPhoneNumberResponse = {
  id?: string
  display_phone_number?: string
  verified_name?: string
}

const WA_API_VERSION = 'v21.0'

export async function POST(req: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: VerifyRequest
  try {
    body = await req.json() as VerifyRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const businessId = body.businessId?.trim()
  const phoneNumberId = body.phoneNumberId?.trim()
  const accessToken = body.accessToken?.trim()

  if (!businessId || !phoneNumberId || !accessToken) {
    return NextResponse.json(
      { error: 'businessId, phoneNumberId, and accessToken are required' },
      { status: 400 }
    )
  }

  const [ownedBusiness] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(and(eq(businesses.id, businessId), eq(businesses.ownerEmail, session.user.email)))
    .limit(1)

  if (!ownedBusiness) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const metaUrl = `https://graph.facebook.com/${WA_API_VERSION}/${phoneNumberId}?fields=id,display_phone_number,verified_name`
  const metaRes = await fetch(metaUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!metaRes.ok) {
    const details = await metaRes.text()
    return NextResponse.json(
      { error: 'Meta verification failed', details },
      { status: 400 }
    )
  }

  const metaData = await metaRes.json() as MetaPhoneNumberResponse
  if (!metaData?.id || metaData.id !== phoneNumberId) {
    return NextResponse.json(
      { error: 'Phone Number ID mismatch from Meta response' },
      { status: 400 }
    )
  }

  await db
    .update(businesses)
    .set({
      waPhoneNumberId: phoneNumberId,
      waAccessToken: accessToken,
      waConnected: true,
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, businessId))

  return NextResponse.json({
    success: true,
    waPhoneNumberId: metaData.id,
    displayPhoneNumber: metaData.display_phone_number ?? null,
    verifiedName: metaData.verified_name ?? null,
  })
}
