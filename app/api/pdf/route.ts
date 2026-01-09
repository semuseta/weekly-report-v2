import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type PdfRequest = {
  rowsCount: number
  sumHours: number
  averageHours: number
  invalidValues: number
  preview?: any[]
}

function formatNumberDe(value: number, decimals = 2) {
  const opts: Intl.NumberFormatOptions = { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
  return new Intl.NumberFormat('de-DE', opts).format(value)
}

// Simple PDF generation without PDFKit
function generateSimplePDF(content: string): Buffer {
  // PDF Header
  let pdf = '%PDF-1.4\n'
  let objectCount = 1
  const objects: string[] = []

  // Object 1: Catalog
  objects.push('<<\n/Type /Catalog\n/Pages 2 0 R\n>>')

  // Object 2: Pages
  objects.push('<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>')

  // Object 3: Page
  objects.push(
    '<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 5 0 R\n>>\n>>\n>>'
  )

  // Object 4: Stream (content)
  const contentStream = `BT
/F1 12 Tf
50 750 Td
${content}
ET`
  objects.push(`<<\n/Length ${contentStream.length}\n>>\nstream\n${contentStream}\nendstream`)

  // Object 5: Font
  objects.push('<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>')

  // Build PDF
  const offsets: number[] = []
  let currentPos = pdf.length

  for (let i = 0; i < objects.length; i++) {
    offsets.push(currentPos)
    const obj = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
    pdf += obj
    currentPos += obj.length
  }

  // xref table
  const xrefPos = currentPos
  pdf += 'xref\n'
  pdf += `0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`
  }

  // Trailer
  pdf += 'trailer\n'
  pdf += `<<\n/Size ${objects.length + 1}\n/Root 1 0 R\n>>\n`
  pdf += 'startxref\n'
  pdf += `${xrefPos}\n`
  pdf += '%%EOF'

  return Buffer.from(pdf)
}

export async function POST(req: Request) {
  try {
    const body: PdfRequest = await req.json()
    const { rowsCount, sumHours, averageHours, invalidValues, preview } = body

    if (!rowsCount || sumHours === undefined) {
      return NextResponse.json({ error: 'Fehlende KPI-Daten' }, { status: 400 })
    }

    // Generate text content
    let content = '(WEEKLY CONSULTING REPORT) Tj\n'
    content += '0 -30 Td\n'
    content += `(Report erstellt: ${new Date().toLocaleDateString('de-DE')}) Tj\n`
    content += '0 -40 Td\n'
    content += '(EXECUTIVE SUMMARY) Tj\n'
    content += '0 -20 Td\n'
    content += `(Total Hours: ${formatNumberDe(sumHours, 1)}h) Tj\n`
    content += '0 -15 Td\n'
    content += `(Entries: ${rowsCount}) Tj\n`
    content += '0 -15 Td\n'
    content += `(Average: ${formatNumberDe(averageHours, 1)}h per entry) Tj\n`

    const pdfBuffer = generateSimplePDF(content)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="weekly-report.pdf"',
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
