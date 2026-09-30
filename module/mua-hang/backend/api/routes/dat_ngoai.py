"""API luồng Kinh doanh Đặt ngoài."""

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, File, Header, Request, Response, UploadFile
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import dat_ngoai_service

router = APIRouter()


class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None


class DongLsxIn(BaseModel):
    lenh_san_xuat: str = Field(min_length=1, max_length=60)
    ma_vach: str = Field(min_length=1, max_length=40)
    ma_hang: str = Field(min_length=1, max_length=60)
    ten_hang: str = Field(min_length=1, max_length=300)
    so_luong: Decimal = Field(gt=0)
    dvt: str = Field(min_length=1, max_length=20)
    so_po: str | None = None
    ma_khach_hang: str | None = None
    ten_khach_hang_chup: str | None = Field(default=None, max_length=300)
    ma_bo_phan: str | None = Field(default=None, max_length=20)
    ten_bo_phan_chup: str | None = Field(default=None, max_length=300)
    ki_han_khach_hang: date | None = None
    ngay_nhan_lenh: date | None = None
    so_so: str | None = Field(default=None, max_length=60)
    ngay_so: date | None = None
    trang_thai_don: str | None = Field(default=None, max_length=30)
    muc_do_uu_tien: int | None = Field(default=None, ge=1, le=3)
    ma_cong_doan: str | None = Field(default=None, max_length=20)
    ma_ban_ve: str | None = Field(default=None, max_length=60)
    ghi_chu: str | None = None
    ghi_chu_dong: str | None = None


class NhapLsxIn(BaseModel):
    rows: list[dict[str, Any]] = Field(min_length=1, max_length=500)


class TaoBaoGiaIn(BaseModel):
    ma_vach: list[str] = Field(min_length=1)
    can_xac_nhan_ky_thuat: bool = False
    noi_dung_ky_thuat: str | None = None
    ghi_chu: str | None = None


class GuiDuyetIn(BaseModel):
    phien_ban: int = Field(ge=1)


class TaoXacNhanKyThuatIn(BaseModel):
    id_dat_ngoai_dong: str = Field(min_length=1, max_length=24)
    noi_dung: str = Field(min_length=1, max_length=4000)
    ket_qua: str = Field(default="DA_XAC_NHAN", pattern="^(CAN_LAM_RO|DA_XAC_NHAN|KHONG_DAT)$")
    ghi_chu: str | None = Field(default=None, max_length=4000)


class DotGiaoIn(BaseModel):
    id_dat_ngoai_dong: str = Field(min_length=1, max_length=24)
    lan_giao: int = Field(ge=1, le=100)
    ngay_du_kien: date
    so_luong_du_kien: Decimal | None = Field(default=None, gt=0)
    ngay_thuc_te: date | None = None
    so_luong_thuc_te: Decimal | None = Field(default=None, gt=0)
    ghi_chu: str | None = Field(default=None, max_length=2000)


class GanSuCoIn(BaseModel):
    id_dat_ngoai_dong: str = Field(min_length=1, max_length=24)
    id_su_co: str = Field(min_length=1, max_length=24)


class YeuCauDongIn(BaseModel):
    noi_dung_gia_cong: str = Field(min_length=1, max_length=2000)
    yeu_cau_ky_thuat: str = Field(min_length=1, max_length=4000)
    yeu_cau_chat_luong: str = Field(min_length=1, max_length=4000)


class DoiMaDongIn(BaseModel):
    ma_hang_thay_the: str = Field(min_length=1, max_length=60)
    ly_do: str = Field(min_length=1, max_length=1000)


class GiaDongIn(BaseModel):
    id: str
    don_gia: int = Field(ge=0)
    ghi_chu: str | None = None


class CapNhatBaoGiaIn(BaseModel):
    phien_ban: int = Field(ge=1)
    ten_ncc: str = Field(min_length=1, max_length=200)
    ky_han: date | None = None
    ghi_chu: str | None = None
    dong: list[GiaDongIn] = Field(min_length=1)


class ChonNhaCungCapIn(BaseModel):
    id_ncc: str = Field(min_length=1, max_length=20)
    phien_ban: int = Field(ge=1)


class ChuyenTrangThaiIn(BaseModel):
    phien_ban: int = Field(ge=1)
    trang_thai: str
    noi_dung: str | None = None


class TraoDoiIn(BaseModel):
    noi_dung: str = Field(min_length=1, max_length=10000)


@router.post('/dat-ngoai/nhap-lsx', summary='Kinh doanh nạp LSX và mã hàng từ Excel', response_model=PhanHoi)
def nhap_lsx(
    body: NhapLsxIn, request: Request,
    _: UUID = Header(alias="X-Idempotency-Key"),
):
    return thanh_cong(dat_ngoai_service.nhap_lsx(body.rows, lay_ho_so(request)))


@router.get('/dat-ngoai/lsx', summary='Danh sách LSX và mã hàng để lập báo giá', response_model=PhanHoi)
def danh_sach_lsx(request: Request, q: str = ''):
    return thanh_cong(dat_ngoai_service.danh_sach_lsx(q, lay_ho_so(request)))


@router.post('/dat-ngoai', summary='Lập phiếu báo giá từ các mã hàng đã chọn', response_model=PhanHoi)
def tao_bao_gia(body: TaoBaoGiaIn, request: Request):
    return thanh_cong(dat_ngoai_service.tao_bao_gia(
        body.ma_vach, body.can_xac_nhan_ky_thuat, body.noi_dung_ky_thuat,
        body.ghi_chu, lay_ho_so(request)
    ))


@router.post('/dat-ngoai/{id_phieu}/gui-duyet', summary='Gửi phiếu Đặt ngoài cho Trưởng bộ phận Kinh doanh duyệt', response_model=PhanHoi)
def gui_duyet(id_phieu: str, body: GuiDuyetIn, request: Request):
    return thanh_cong(dat_ngoai_service.gui_duyet(id_phieu, body.phien_ban, lay_ho_so(request)))


@router.post('/dat-ngoai/{id_phieu}/xac-nhan-ky-thuat', summary='Ghi thêm một lần xác nhận kỹ thuật theo mã hàng', response_model=PhanHoi)
def them_xac_nhan_ky_thuat(id_phieu: str, body: TaoXacNhanKyThuatIn, request: Request):
    return thanh_cong(dat_ngoai_service.them_xac_nhan_ky_thuat(id_phieu, body.model_dump(), lay_ho_so(request)))


@router.post('/dat-ngoai/{id_phieu}/dot-giao', summary='Ghi kế hoạch hoặc kết quả một đợt giao theo mã hàng', response_model=PhanHoi)
def ghi_dot_giao(id_phieu: str, body: DotGiaoIn, request: Request):
    return thanh_cong(dat_ngoai_service.ghi_dot_giao(id_phieu, body.model_dump(), lay_ho_so(request)))


@router.post('/dat-ngoai/{id_phieu}/gan-su-co', summary='Gắn phiếu sự cố vào mã hàng Đặt ngoài', response_model=PhanHoi)
def gan_su_co(id_phieu: str, body: GanSuCoIn, request: Request):
    return thanh_cong(dat_ngoai_service.gan_su_co(id_phieu, body.id_dat_ngoai_dong, body.id_su_co, lay_ho_so(request)))


@router.patch('/dat-ngoai/{id_phieu}/dong/{id_dong}/yeu-cau', summary='Cập nhật ba nội dung bắt buộc trên dòng Đặt ngoài', response_model=PhanHoi)
def cap_nhat_yeu_cau_dong(id_phieu: str, id_dong: str, body: YeuCauDongIn, request: Request):
    return thanh_cong(dat_ngoai_service.cap_nhat_yeu_cau_dong(id_phieu, id_dong, body.model_dump(), lay_ho_so(request)))


@router.patch('/dat-ngoai/{id_phieu}/dong/{id_dong}/doi-ma', summary='Ghi nhận mã hàng thay thế, giữ mã gốc', response_model=PhanHoi)
def doi_ma_dong(id_phieu: str, id_dong: str, body: DoiMaDongIn, request: Request):
    return thanh_cong(dat_ngoai_service.doi_ma_dong(id_phieu, id_dong, body.ma_hang_thay_the, body.ly_do, lay_ho_so(request)))


@router.post('/dat-ngoai/{id_phieu}/trao-doi', summary='Thêm trao đổi vào hồ sơ phiếu Đặt ngoài', response_model=PhanHoi)
def them_trao_doi(id_phieu: str, body: TraoDoiIn, request: Request):
    return thanh_cong(dat_ngoai_service.them_trao_doi(id_phieu, body.noi_dung, lay_ho_so(request)))


@router.post('/dat-ngoai/{id_phieu}/tep', summary='Tải tệp vào hồ sơ phiếu Đặt ngoài', response_model=PhanHoi)
async def tai_tep_len(id_phieu: str, request: Request, tep: UploadFile = File(...)):
    return thanh_cong(dat_ngoai_service.luu_tep(id_phieu, tep.filename or "tep-dinh-kem", await tep.read(), tep.content_type, lay_ho_so(request)))


@router.get('/dat-ngoai/{id_phieu}/tep/{id_tep}', summary='Tải tệp đã đính kèm phiếu Đặt ngoài')
def tai_tep(id_phieu: str, id_tep: str, request: Request):
    noi_dung, ten_tep, mime = dat_ngoai_service.tai_tep(id_phieu, id_tep, lay_ho_so(request))
    return Response(noi_dung, media_type=mime, headers={"Content-Disposition": f'attachment; filename="{ten_tep.replace(chr(34), "")}"'})


@router.get('/dat-ngoai', summary='Danh sách phiếu theo luồng đặt ngoài', response_model=PhanHoi)
def danh_sach(request: Request):
    return thanh_cong(dat_ngoai_service.danh_sach(lay_ho_so(request)))


@router.get('/dat-ngoai/nha-cung-cap', summary='Danh sách nhà cung cấp gia công cho phiếu đặt ngoài', response_model=PhanHoi)
def danh_sach_nha_cung_cap_dat_ngoai(request: Request):
    return thanh_cong(dat_ngoai_service.nha_cung_cap_co_the_chon(lay_ho_so(request)))


@router.patch('/dat-ngoai/{id_phieu}/nha-cung-cap', summary='Chọn nhà cung cấp cho phiếu đặt ngoài', response_model=PhanHoi)
def chon_nha_cung_cap_dat_ngoai(id_phieu: str, body: ChonNhaCungCapIn, request: Request):
    return thanh_cong(dat_ngoai_service.chon_nha_cung_cap(
        id_phieu, body.id_ncc, body.phien_ban, lay_ho_so(request)
    ))


@router.get('/dat-ngoai/hang-doi-ky-thuat', summary='Phiếu đặt ngoài chờ kỹ thuật xác nhận', response_model=PhanHoi)
def hang_doi_ky_thuat(request: Request):
    return thanh_cong(dat_ngoai_service.hang_doi_xac_nhan_ky_thuat(lay_ho_so(request)))


@router.patch('/dat-ngoai/{id_phieu}/bao-gia', summary='Điền báo giá và chuyển chờ duyệt', response_model=PhanHoi)
def cap_nhat_bao_gia(id_phieu: str, body: CapNhatBaoGiaIn, request: Request):
    return thanh_cong(dat_ngoai_service.cap_nhat_bao_gia(
        id_phieu, body.phien_ban, body.model_dump(exclude={'phien_ban'}), lay_ho_so(request)
    ))


@router.post('/dat-ngoai/{id_phieu}/chuyen-trang-thai', summary='Chuyển bước xử lý đặt ngoài', response_model=PhanHoi)
def chuyen_trang_thai(id_phieu: str, body: ChuyenTrangThaiIn, request: Request):
    return thanh_cong(dat_ngoai_service.chuyen_trang_thai(
        id_phieu, body.phien_ban, body.trang_thai, body.noi_dung, lay_ho_so(request)
    ))
