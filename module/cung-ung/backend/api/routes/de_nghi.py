"""Router RESTful cho Đề nghị vật tư & Gia công ngoài (F01)."""

from datetime import date
from typing import Any
from uuid import UUID
from fastapi import APIRouter, File, Header, Query, Request, Response, UploadFile
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import de_nghi_service
from backend.services import de_nghi_export_service, de_nghi_quet_service, de_nghi_tep_service
from backend.services.de_nghi_pdf import tao_pdf
from backend.config.settings import PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX

router = APIRouter()


class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None


class DongDeNghiIn(BaseModel):
    id_vat_tu: str | None = None
    ten_hang: str | None = None
    dvt: str | None = None
    phan_loai: str | None = None
    quy_cach: str | None = None
    ma_chung_loai: str | None = None
    muc_dich_su_dung: str | None = None
    so_luong: float = Field(gt=0, description="Số lượng đề nghị lớn hơn 0")
    ky_han_yc: date = Field(description="Kỳ hạn yêu cầu cần hàng")
    tra_loi_ky_han: date | None = None
    lenh_san_xuat: str | None = None
    ma_vach: str | None = None
    ma_cong_doan: str | None = None
    ma_loai_gia_cong: str | None = None
    noi_dung_gia_cong: str | None = None
    yeu_cau_ky_thuat: str | None = None
    can_xac_nhan_kt: bool = False
    ghi_chu: str | None = None
    id_sp_cu: str | None = None


class TaoDeNghiIn(BaseModel):
    loai: str = Field(default="MUA_HANG", description="MUA_HANG hoặc GIA_CONG_NGOAI")
    so_phieu_cu: str | None = None
    tinh_trang_yc: str = Field(default="BINH_THUONG", description="BINH_THUONG, HANG_KHAN_CAP, KHAN_CAP_NG, HANG_NG")
    ghi_chu: str | None = None
    dong: list[DongDeNghiIn] = Field(default_factory=list)


class SuaDeNghiIn(BaseModel):
    phien_ban: int = Field(description="Phiên bản hiện tại để chống ghi đè")
    so_phieu_cu: str | None = None
    tinh_trang_yc: str | None = None
    ghi_chu: str | None = None
    dong: list[DongDeNghiIn] | None = None


class ThaoTacPhienBanIn(BaseModel):
    phien_ban: int = Field(description="Phiên bản hiện tại của phiếu")


class DuyetDeNghiIn(BaseModel):
    phien_ban: int = Field(description="Phiên bản hiện tại của phiếu")
    duyet_online: bool = Field(default=False, description="Bật nếu duyệt online vắng mặt")
    ghi_chu: str | None = None


class TraLaiDeNghiIn(BaseModel):
    phien_ban: int = Field(description="Phiên bản hiện tại của phiếu")
    ly_do: str = Field(min_length=1, description="Lý do trả lại bắt buộc")


class HuyDeNghiIn(BaseModel):
    phien_ban: int = Field(description="Phiên bản hiện tại của phiếu")
    ly_do: str = Field(min_length=1, description="Lý do hủy bắt buộc")


class PhanCongIn(BaseModel):
    phien_ban: int = Field(description="Phiên bản hiện tại của phiếu")
    nguoi_mua_hang: str = Field(min_length=1, description="Mã nhân viên người mua hàng được phân công")


class DuyetHangLoatIn(BaseModel):
    ids: list[str] = Field(min_length=1, description="Danh sách mã đề nghị cần duyệt")
    duyet_online: bool = False


class TraoDoiIn(BaseModel):
    noi_dung: str = Field(min_length=1, max_length=4000)


@router.get("/de-nghi", summary="Danh sách đề nghị có lọc và phân trang", response_model=PhanHoi)
def danh_sach_de_nghi(
    request: Request,
    trang: int = Query(default=1, ge=1),
    kich_thuoc: int = Query(default=PAGE_SIZE_DEFAULT, ge=1, le=PAGE_SIZE_MAX),
    tu_ngay: date | None = None,
    den_ngay: date | None = None,
    trang_thai: str | None = None,
    ma_bo_phan: str | None = None,
    loai: str | None = None,
    tu_khoa: str | None = None,
    chi_tre_han: bool = False,
    chi_bat_kha_thi: bool = False,
    nguoi_yeu_cau: str | None = None,
):
    ho_so = lay_ho_so(request)
    bo_loc = {
        "tu_ngay": tu_ngay,
        "den_ngay": den_ngay,
        "trang_thai": trang_thai,
        "ma_bo_phan": ma_bo_phan,
        "loai": loai,
        "tu_khoa": tu_khoa,
        "chi_tre_han": chi_tre_han,
        "chi_bat_kha_thi": chi_bat_kha_thi,
        "nguoi_yeu_cau": nguoi_yeu_cau,
    }
    data = de_nghi_service.danh_sach(bo_loc, ho_so, trang, kich_thuoc)
    return thanh_cong(data)


@router.get("/de-nghi/cho-duyet", summary="Hàng đợi đề nghị chờ tôi duyệt", response_model=PhanHoi)
def hang_doi_cho_duyet(
    request: Request,
    trang: int = Query(default=1, ge=1),
    kich_thuoc: int = Query(default=PAGE_SIZE_DEFAULT, ge=1, le=PAGE_SIZE_MAX),
):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.hang_doi_cho_duyet(ho_so, trang, kich_thuoc)
    return thanh_cong(data)


@router.get("/de-nghi/soi-ky-han", summary="Kiểm tra nhanh kỳ hạn bất khả thi", response_model=PhanHoi)
def soi_ky_han_nhanh(
    request: Request,
    loai: str = "MUA_HANG",
    ky_han_yc: date = Query(...),
    ngay_hieu_luc: date | None = None,
    muc_do_uu_tien: int | None = None,
    ma_loai_gia_cong: str | None = None,
):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.soi_ky_han_nhanh(
        {
            "loai": loai,
            "ky_han_yc": ky_han_yc,
            "ngay_hieu_luc": ngay_hieu_luc,
            "muc_do_uu_tien": muc_do_uu_tien,
            "ma_loai_gia_cong": ma_loai_gia_cong,
        },
        ho_so,
    )
    return thanh_cong(data)


@router.get("/de-nghi/quet-lsx", summary="Tra cứu LSX từ mã quét", response_model=PhanHoi)
def quet_lsx(request: Request, ma: str = Query(min_length=1, max_length=60)):
    return thanh_cong(de_nghi_quet_service.quet_lsx(ma, lay_ho_so(request)))


@router.get("/de-nghi/mac-dinh-tao", summary="Giá trị mặc định khi tạo đề nghị", response_model=PhanHoi)
def mac_dinh_tao(request: Request):
    return thanh_cong(de_nghi_quet_service.mac_dinh_tao(lay_ho_so(request)))


@router.get("/de-nghi/tai-xuong", summary="Tải xuống CSV danh sách đề nghị")
def tai_xuong_csv(
    request: Request,
    tu_ngay: date | None = None,
    den_ngay: date | None = None,
    trang_thai: str | None = None,
    ma_bo_phan: str | None = None,
    loai: str | None = None,
    tu_khoa: str | None = None,
    chi_tre_han: bool = False,
    chi_bat_kha_thi: bool = False,
):
    ho_so = lay_ho_so(request)
    bo_loc = {
        "tu_ngay": tu_ngay,
        "den_ngay": den_ngay,
        "trang_thai": trang_thai,
        "ma_bo_phan": ma_bo_phan,
        "loai": loai,
        "tu_khoa": tu_khoa,
        "chi_tre_han": chi_tre_han,
        "chi_bat_kha_thi": chi_bat_kha_thi,
    }
    csv_str = de_nghi_export_service.xuat_csv(bo_loc, ho_so)
    return Response(
        content=csv_str,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=de_nghi.csv"},
    )


@router.get("/de-nghi/{id}", summary="Chi tiết đề nghị, dòng, trao đổi và đính kèm", response_model=PhanHoi)
def lay_chi_tiet_de_nghi(id: str, request: Request):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.lay_chi_tiet(id, ho_so)
    return thanh_cong(data)


@router.get("/de-nghi/{id}/in", summary="Xuất PDF biểu mẫu BM01/BM02 kèm QR")
def lay_du_lieu_in(id: str, request: Request):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.lay_chi_tiet(id, ho_so)
    pdf = tao_pdf(data)
    return Response(pdf, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="{id}.pdf"'
    })


@router.post("/de-nghi", summary="Tạo mới đề nghị (nháp)", response_model=PhanHoi)
def tao_de_nghi(
    body: TaoDeNghiIn,
    request: Request,
    x_idempotency_key: UUID = Header(alias="X-Idempotency-Key"),
):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.tao_de_nghi(body.model_dump(), ho_so, str(x_idempotency_key))
    return thanh_cong(data)


@router.put("/de-nghi/{id}", summary="Cập nhật đề nghị khi còn NHAP hoặc TRA_LAI", response_model=PhanHoi)
def sua_de_nghi(id: str, body: SuaDeNghiIn, request: Request):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.sua_de_nghi(id, body.model_dump(exclude_unset=True), ho_so, body.phien_ban)
    return thanh_cong(data)


@router.post("/de-nghi/{id}/gui", summary="Gửi duyệt đề nghị", response_model=PhanHoi)
def gui_duyet(id: str, body: ThaoTacPhienBanIn, request: Request):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.gui_duyet(id, ho_so, body.phien_ban)
    return thanh_cong(data)


@router.post("/de-nghi/{id}/duyet", summary="Phê duyệt đề nghị (hoặc duyệt online)", response_model=PhanHoi)
def duyet_de_nghi(id: str, body: DuyetDeNghiIn, request: Request):
    ho_so = lay_ho_so(request)
    meta = {
        "ip": request.client.host if request.client else None,
        "thiet_bi": request.headers.get("User-Agent"),
    }
    data = de_nghi_service.duyet_de_nghi(id, ho_so, body.duyet_online, body.ghi_chu, body.phien_ban, meta)
    return thanh_cong(data)


@router.post("/de-nghi/{id}/ky-bu", summary="Ký bù đề nghị đã duyệt online", response_model=PhanHoi)
def ky_bu_de_nghi(id: str, body: ThaoTacPhienBanIn, request: Request):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.ky_bu_de_nghi(id, ho_so, body.phien_ban)
    return thanh_cong(data)


@router.post("/de-nghi/{id}/tra-lai", summary="Trả lại đề nghị kèm lý do", response_model=PhanHoi)
def tra_lai_de_nghi(id: str, body: TraLaiDeNghiIn, request: Request):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.tra_lai_de_nghi(id, ho_so, body.ly_do, body.phien_ban)
    return thanh_cong(data)


@router.post("/de-nghi/{id}/huy", summary="Hủy đề nghị kèm lý do", response_model=PhanHoi)
def huy_de_nghi(id: str, body: HuyDeNghiIn, request: Request):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.huy_de_nghi(id, ho_so, body.ly_do, body.phien_ban)
    return thanh_cong(data)


@router.post("/de-nghi/{id}/phan-cong", summary="Phân công nhân viên mua hàng", response_model=PhanHoi)
def phan_cong_mua_hang(id: str, body: PhanCongIn, request: Request):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.phan_cong_mua_hang(id, ho_so, body.nguoi_mua_hang, body.phien_ban)
    return thanh_cong(data)


@router.post("/de-nghi/duyet-hang-loat", summary="Duyệt hàng loạt đề nghị", response_model=PhanHoi)
def duyet_hang_loat(body: DuyetHangLoatIn, request: Request):
    ho_so = lay_ho_so(request)
    data = de_nghi_service.duyet_hang_loat(body.ids, ho_so, body.duyet_online)
    return thanh_cong(data)


@router.post("/de-nghi/{id}/trao-doi", summary="Thêm trao đổi vào đề nghị", response_model=PhanHoi)
def them_trao_doi(id: str, body: TraoDoiIn, request: Request):
    return thanh_cong(de_nghi_service.them_trao_doi(id, body.noi_dung, lay_ho_so(request)))


@router.post("/de-nghi/{id}/dinh-kem", summary="Tải ảnh hoặc PDF đính kèm", response_model=PhanHoi)
async def them_dinh_kem(id: str, request: Request, tep: UploadFile = File(...)):
    noi_dung = await tep.read()
    data = de_nghi_service.luu_dinh_kem(
        id, tep.filename or "tep-dinh-kem", noi_dung, tep.content_type, lay_ho_so(request)
    )
    return thanh_cong(data)


@router.get("/de-nghi/{id}/dinh-kem/{id_tep}", summary="Tải tệp đính kèm đã kiểm quyền")
def tai_dinh_kem(id: str, id_tep: str, request: Request):
    noi_dung, ten_tep, loai_mime = de_nghi_tep_service.tai_tep(id, id_tep, lay_ho_so(request))
    ten_an_toan = ten_tep.replace('"', "")
    return Response(noi_dung, media_type=loai_mime, headers={
        "Content-Disposition": f'attachment; filename="{ten_an_toan}"'
    })
