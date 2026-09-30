"""Xuat mot ban lich su Dieu xe cho Kho van theo F4-07."""

from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from backend.data.dieu_xe_archive_repo import lay_lich_su


def _xml(value: object) -> str:
    return escape(str(value if value is not None else ""))


def _sheet(rows: list[dict]) -> bytes:
    columns = list(rows[0]) if rows else []
    all_rows = [columns, *([list(row.get(col) for col in columns) for row in rows])]
    body = []
    for number, row in enumerate(all_rows, 1):
        cells = "".join(
            f'<c r="{_column(index)}{number}" t="inlineStr"><is><t>{_xml(value)}</t></is></c>'
            for index, value in enumerate(row, 1)
        )
        body.append(f'<row r="{number}">{cells}</row>')
    return ('<?xml version="1.0" encoding="UTF-8"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData>' + ''.join(body) + '</sheetData></worksheet>').encode('utf-8')


def _column(number: int) -> str:
    result = ''
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def xuat_lich_su(path: Path) -> dict[str, int]:
    data = lay_lich_su()
    path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(path, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            + ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1, len(data) + 1))
            + '</Types>')
        archive.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>')
        archive.writestr('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
            + ''.join(f'<sheet name="{name}" sheetId="{i}" r:id="rId{i}"/>' for i, name in enumerate(data, 1))
            + '</sheets></workbook>')
        archive.writestr('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + ''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1, len(data) + 1))
            + '</Relationships>')
        for i, rows in enumerate(data.values(), 1):
            archive.writestr(f'xl/worksheets/sheet{i}.xml', _sheet(rows))
    return {name: len(rows) for name, rows in data.items()}
