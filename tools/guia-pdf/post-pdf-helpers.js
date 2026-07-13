const PDFDocument = require('pdfkit');
const fs = require('fs');

const DARK = '#1B4D3E';
const DARK2 = '#173F33';
const MED = '#4C9A72';
const LIGHT_MINT = '#9FDDBB';
const PALE_MINT = '#DCEFE3';
const TEXT = '#1C1917';
const TEXT2 = '#44403C';
const TEXT3 = '#78716C';
const BORDER = '#E7E5E4';
const ROW_ALT = '#FAFAF9';
const WHITE = '#FFFFFF';

const PAGE_W = 612, PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

function makeDoc(outPath, title) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: { Title: title, Author: 'Lumen Labs' },
    bufferPages: true,
  });
  doc.pipe(fs.createWriteStream(outPath));
  return doc;
}

function ensureSpace(doc, h) {
  if (doc.y + h > PAGE_H - MARGIN) doc.addPage();
}

function cover(doc, appName, versao, descLines) {
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(DARK);
  // decorative circles top-right
  doc.save();
  doc.circle(PAGE_W + 40, 130, 220).fill(MED);
  doc.circle(PAGE_W + 40, 130, 150).fill(LIGHT_MINT);
  doc.circle(PAGE_W + 40, 130, 80).fill(PALE_MINT);
  doc.restore();
  // decorative circles bottom-left
  doc.save();
  doc.circle(-40, PAGE_H - 60, 160).fill(MED);
  doc.circle(-40, PAGE_H - 60, 90).fill(LIGHT_MINT);
  doc.restore();

  // pill "LUMEN LABS"
  const pillW = 100, pillH = 22;
  doc.roundedRect(MARGIN, 60, pillW, pillH, 5).fill(MED);
  doc.fillColor(DARK2).font('Helvetica-Bold').fontSize(8.5)
    .text('LUMEN LABS', MARGIN, 60 + 7, { width: pillW, align: 'center' });

  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(38)
    .text(appName, MARGIN, 330, { width: CONTENT_W - 80 });
  doc.fillColor(LIGHT_MINT).font('Helvetica').fontSize(17)
    .text('Guia do Usuário', MARGIN, 400, { width: CONTENT_W - 80 });
  doc.moveTo(MARGIN, 440).lineTo(MARGIN + 260, 440).strokeColor(MED).lineWidth(0.75).stroke();
  doc.fillColor('#CDEBDC').font('Helvetica').fontSize(9.5)
    .text(versao, MARGIN, 452, { width: 260, align: 'center' });
  doc.moveTo(MARGIN, 478).lineTo(PAGE_W - MARGIN, 478).strokeColor(MED).lineWidth(0.75).stroke();

  let dy = 560;
  doc.fillColor('#CDEBDC').font('Helvetica').fontSize(10.5);
  descLines.forEach((line) => {
    doc.text(line, MARGIN, dy, { width: CONTENT_W - 60, align: 'left' });
    dy += 28;
  });

  doc.addPage();
  doc.fillColor(TEXT);
}

function tocHeader(doc, text) {
  doc.font('Helvetica-Bold').fontSize(15).fillColor(TEXT).text(text, MARGIN, doc.y);
  doc.moveDown(0.3);
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).strokeColor(BORDER).lineWidth(1).stroke();
  doc.moveDown(0.6);
}

function tocRows(doc, items) {
  doc.font('Helvetica').fontSize(10.5);
  items.forEach((item, i) => {
    const rh = 22;
    ensureSpace(doc, rh);
    const y = doc.y;
    if (i % 2 === 0) doc.rect(MARGIN, y, CONTENT_W, rh).fill(ROW_ALT);
    doc.fillColor(MED).font('Helvetica-Bold').fontSize(10.5).text(String(i + 1), MARGIN + 10, y + 6, { width: 24 });
    doc.fillColor(TEXT).font('Helvetica').fontSize(10.5).text(item, MARGIN + 40, y + 6, { width: CONTENT_W - 60 });
    doc.y = y + rh;
  });
  doc.fillColor(TEXT);
}

let sectionCounter = 0;
function sectionHeader(doc, number, title) {
  const boxH = 34;
  ensureSpace(doc, boxH + 12);
  const y = doc.y;
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 8).fill(DARK);
  // number badge
  const badgeSize = 20;
  doc.roundedRect(MARGIN + 10, y + (boxH - badgeSize) / 2, badgeSize, badgeSize, 5).fill(MED);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9.5)
    .text(String(number), MARGIN + 10, y + (boxH - badgeSize) / 2 + 6, { width: badgeSize, align: 'center' });
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(12.5)
    .text(title, MARGIN + 42, y + 11, { width: CONTENT_W - 60 });
  doc.y = y + boxH + 12;
  doc.fillColor(TEXT);
}

function paragraph(doc, text, opts = {}) {
  doc.font(opts.bold ? 'Helvetica-Bold' : (opts.italic ? 'Helvetica-Oblique' : 'Helvetica'))
    .fontSize(opts.size || 10.5).fillColor(opts.color || TEXT);
  const h = doc.heightOfString(text, { width: CONTENT_W, align: opts.align || 'justify', lineGap: 2 });
  ensureSpace(doc, h);
  doc.text(text, MARGIN, doc.y, { width: CONTENT_W, align: opts.align || 'justify', lineGap: 2 });
  doc.moveDown(opts.spaceAfter != null ? opts.spaceAfter : 0.5);
}

function subHead(doc, text) {
  doc.moveDown(0.15);
  paragraph(doc, text, { bold: true, color: DARK, size: 11, spaceAfter: 0.25, align: 'left' });
}

function bulletList(doc, items) {
  doc.font('Helvetica').fontSize(10.5).fillColor(TEXT);
  items.forEach((item) => {
    const w = CONTENT_W - 16;
    const h = doc.heightOfString(item, { width: w, lineGap: 2 });
    ensureSpace(doc, h + 4);
    doc.text('•  ' + item, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
    doc.moveDown(0.2);
  });
  doc.moveDown(0.25);
}

function noteItalic(doc, text) {
  paragraph(doc, text, { italic: true, color: TEXT2, size: 9.5, spaceAfter: 0.4, align: 'left' });
}

function table(doc, headers, rows, colWidths, highlightRow) {
  const padX = 8, padY = 6;
  const rowHeight = (cells, font, size) => {
    doc.font(font).fontSize(size);
    return Math.max(...cells.map((c, i) => doc.heightOfString(c, { width: colWidths[i] - padX * 2, lineGap: 1 }))) + padY * 2;
  };

  const hH = rowHeight(headers, 'Helvetica-Bold', 9.5);
  ensureSpace(doc, hH);
  let y = doc.y;
  doc.rect(MARGIN, y, CONTENT_W, hH).fill(PALE_MINT);
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5);
  let x = MARGIN;
  headers.forEach((h, i) => {
    doc.text(h, x + padX, y + padY, { width: colWidths[i] - padX * 2, lineGap: 1 });
    x += colWidths[i];
  });
  doc.y = y + hH;

  rows.forEach((row, ri) => {
    const rH = rowHeight(row, 'Helvetica', 9.5);
    ensureSpace(doc, rH);
    let ry = doc.y, rx = MARGIN;
    if (highlightRow && ri === highlightRow - 1) doc.rect(MARGIN, ry, CONTENT_W, rH).fill('#FEF3C7');
    else if (ri % 2 === 1) doc.rect(MARGIN, ry, CONTENT_W, rH).fill(ROW_ALT);
    doc.rect(MARGIN, ry, CONTENT_W, rH).lineWidth(0.5).stroke(BORDER);
    doc.fillColor(TEXT).font('Helvetica').fontSize(9.5);
    row.forEach((c, i) => {
      doc.text(c, rx + padX, ry + padY, { width: colWidths[i] - padX * 2, lineGap: 1 });
      rx += colWidths[i];
    });
    doc.y = ry + rH;
  });
  doc.moveDown(0.6);
  doc.fillColor(TEXT);
}

function finalizeFooters(doc, footerLeft) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    if (i === 0) continue; // skip cover
    doc.switchToPage(i);
    const oldBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // allow drawing inside the bottom margin without auto page-break
    const y = PAGE_H - MARGIN + 14;
    doc.moveTo(MARGIN, y - 8).lineTo(PAGE_W - MARGIN, y - 8).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(TEXT3);
    doc.text(footerLeft, MARGIN, y, { width: CONTENT_W / 2, align: 'left', lineBreak: false });
    doc.text('Página ' + i, MARGIN, y, { width: CONTENT_W, align: 'right', lineBreak: false });
    doc.page.margins.bottom = oldBottom;
  }
}

module.exports = {
  DARK, DARK2, MED, LIGHT_MINT, PALE_MINT, TEXT, TEXT2, TEXT3, BORDER,
  PAGE_W, PAGE_H, MARGIN, CONTENT_W,
  makeDoc, ensureSpace, cover, tocHeader, tocRows, sectionHeader,
  subHead, paragraph, bulletList, noteItalic, table, finalizeFooters,
};
