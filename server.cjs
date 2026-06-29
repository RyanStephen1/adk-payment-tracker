const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.post('/api/export-pdf', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { html, css, landscape, format } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'Missing html in request body' });
    }

    const fullHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>*{box-sizing:border-box}body{margin:0;padding:20px;font-family:Inter,system-ui,sans-serif;color:#0f172a;background:#fff}${css || ''}</style></head><body>${html}</body></html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});

    const pdf = await page.pdf({
      format: format || 'A4',
      landscape: landscape !== false,
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
    });

    await browser.close();

    const pdfBuffer = Buffer.from(pdf);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="export-${Date.now()}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

const PORT = process.env.PDF_SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`PDF export server running on http://localhost:${PORT}`);
  console.log(`POST /api/export-pdf - paste HTML to generate PDF`);
});
