"""Xuat Excel/PDF cho cung bo loc va cung cot da phan quyen cua F2."""

from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from backend.services.dieu_xe_archive_service import _sheet


def xuat_excel(report: dict) -> bytes:
    rows = [{column: row.get(column) for column in report['columns']}
            for row in report['rows']]
    if not rows:
        rows = [{column: '' for column in report['columns']}]
    out = BytesIO()
    with ZipFile(out, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '</Types>')
        archive.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>')
        archive.writestr('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
            '<sheet name="Bao cao" sheetId="1" r:id="rId1"/></sheets></workbook>')
        archive.writestr('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            '</Relationships>')
        archive.writestr('xl/worksheets/sheet1.xml', _sheet(rows))
    return out.getvalue()


def xuat_pdf(report: dict) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer

    font = 'Helvetica'
    for path in (Path('C:/Windows/Fonts/arial.ttf'),
                 Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')):
        if path.exists():
            pdfmetrics.registerFont(TTFont('BaoCaoUnicode', str(path)))
            font = 'BaoCaoUnicode'
            break
    styles = getSampleStyleSheet()
    styles['Normal'].fontName = font
    styles['Title'].fontName = font
    styles['Normal'].fontSize = 8
    styles['Normal'].leading = 11
    out = BytesIO()
    doc = SimpleDocTemplate(out, pagesize=A4, leftMargin=15*mm,
                            rightMargin=15*mm, topMargin=13*mm, bottomMargin=13*mm)
    from_date = report['filters']['from']
    to_date = report['filters']['to']
    story = [Paragraph(escape(report['title']).upper(), styles['Title']),
             Paragraph(f'Kỳ: {from_date} đến {to_date}', styles['Normal']), Spacer(1, 5*mm)]
    for metric in report['metrics']:
        value = metric['value'] if metric['value'] is not None else 'Chưa có dữ liệu'
        story.append(Paragraph(f"{escape(metric['label'])}: {escape(str(value))} {escape(metric['unit'])}", styles['Normal']))
    story.append(Spacer(1, 5*mm))
    if not report['rows']:
        story.append(Paragraph('Không có dữ liệu theo bộ lọc.', styles['Normal']))
    for index, row in enumerate(report['rows'], 1):
        parts = [Paragraph(f'<b>#{index}</b>', styles['Normal'])]
        for column in report['columns']:
            value = row.get(column)
            parts.append(Paragraph(f'{escape(column)}: {escape(str(value if value is not None else "—"))}',
                                   styles['Normal']))
        parts.append(Spacer(1, 3*mm))
        story.append(KeepTogether(parts))
    doc.build(story)
    return out.getvalue()
