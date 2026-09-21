"""Sinh PDF BM01/BM02 cho F01."""

from io import BytesIO
from pathlib import Path


def tao_pdf(data: dict) -> bytes:
    import qrcode
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    font = "Helvetica"
    bold = "Helvetica-Bold"
    dejavu = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    dejavu_bold = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    if dejavu.exists() and dejavu_bold.exists():
        pdfmetrics.registerFont(TTFont("DejaVu", str(dejavu)))
        pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(dejavu_bold)))
        font, bold = "DejaVu", "DejaVu-Bold"

    dn = data["de_nghi"]
    bieu_mau = "QT-MH-01-BM01" if dn["loai"] == "MUA_HANG" else "QT-MH-01-BM02"
    tieu_de = "PHIẾU ĐỀ NGHỊ MUA VẬT TƯ" if dn["loai"] == "MUA_HANG" else "PHIẾU ĐỀ NGHỊ GIA CÔNG NGOÀI"
    out = BytesIO()
    doc = SimpleDocTemplate(out, pagesize=A4, rightMargin=14 * mm, leftMargin=14 * mm,
                            topMargin=12 * mm, bottomMargin=14 * mm,
                            title=f"{bieu_mau} - {dn['id']}")
    styles = getSampleStyleSheet()
    for style in styles.byName.values():
        style.fontName = font
    styles["Title"].fontName = bold
    qr_buf = BytesIO()
    qrcode.make(dn["id"]).save(qr_buf, format="PNG")
    qr_buf.seek(0)
    dau = Table([
        [Paragraph("<b>HD</b>", styles["Title"]), Paragraph(
            f"<b>CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI &amp; DỊCH VỤ HUỲNH ĐỨC</b><br/>"
            f"<b>{tieu_de}</b><br/>{bieu_mau} · Phiên bản 01", styles["Normal"]),
         Image(qr_buf, 25 * mm, 25 * mm)]
    ], colWidths=[18 * mm, 128 * mm, 25 * mm])
    dau.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (0, 0), "CENTER"),
        ("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#283A97")),
        ("INNERGRID", (0, 0), (-1, -1), .3, colors.HexColor("#B8C0D7")),
        ("FONTNAME", (0, 0), (-1, -1), font),
    ]))
    story = [dau, Spacer(1, 5 * mm)]
    chung = [
        ["Mã đề nghị", dn["id"], "Ngày hiệu lực", str(dn.get("ngay_hieu_luc") or "")],
        ["Bộ phận", dn.get("ten_bo_phan") or dn["ma_bo_phan"], "Người yêu cầu", dn.get("ten_nguoi_yeu_cau") or dn["nguoi_yeu_cau"]],
        ["Tình trạng", dn["trang_thai"], "Mức ưu tiên", str(dn.get("muc_do_uu_tien") or "—")],
    ]
    bang_chung = Table(chung, colWidths=[28 * mm, 60 * mm, 28 * mm, 55 * mm])
    bang_chung.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), .35, colors.grey), ("FONTNAME", (0, 0), (-1, -1), font),
        ("FONTNAME", (0, 0), (0, -1), bold), ("FONTNAME", (2, 0), (2, -1), bold),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF1FA")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#EEF1FA")),
        ("FONTSIZE", (0, 0), (-1, -1), 8), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.extend([bang_chung, Spacer(1, 5 * mm)])
    rows = [["#", "Mã VT", "Tên hàng / Nội dung", "ĐVT", "SL", "Kỳ hạn", "LSX"]]
    for d in data["dong"]:
        ten = d.get("ten_hang_chup") or ""
        if d.get("noi_dung_gia_cong"):
            ten += "\n" + d["noi_dung_gia_cong"]
        rows.append([d["stt_dong"], d.get("ma_vat_tu") or "", ten, d.get("dvt_chup") or "",
                     str(d.get("so_luong") or ""), str(d.get("ky_han_yc") or ""), d.get("lenh_san_xuat") or ""])
    bang = Table(rows, repeatRows=1, colWidths=[8 * mm, 25 * mm, 65 * mm, 14 * mm, 14 * mm, 23 * mm, 28 * mm])
    bang.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), .35, colors.grey), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#283A97")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("FONTNAME", (0, 0), (-1, 0), bold),
        ("FONTNAME", (0, 1), (-1, -1), font), ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ALIGN", (0, 0), (0, -1), "CENTER"),
    ]))
    story.extend([bang, Spacer(1, 10 * mm)])
    ky = Table([["NGƯỜI ĐỀ NGHỊ", "TRƯỞNG BỘ PHẬN", "BAN LÃNH ĐẠO", "BỘ PHẬN MUA HÀNG"],
                ["\n\n\n", "", "", ""]], colWidths=[44 * mm] * 4)
    ky.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .35, colors.grey),
                            ("FONTNAME", (0, 0), (-1, -1), font), ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                            ("FONTNAME", (0, 0), (-1, 0), bold), ("FONTSIZE", (0, 0), (-1, -1), 8)]))
    story.append(ky)
    doc.build(story)
    return out.getvalue()
