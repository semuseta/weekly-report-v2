import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// This endpoint is no longer used - HTML report generation happens client-side
// Keeping for backwards compatibility
export async function POST(req: Request) {
  return NextResponse.json({ error: 'PDF generation has moved to client-side' }, { status: 410 })
}
