"""Quyen, bo loc va dieu kien phat hanh bieu mau NCC."""
from datetime import date
from backend.data import ncc_bieu_mau_repo as repo
from backend.services import ncc_bieu_mau_export as export
from backend.services.errors import ThieuDuLieu
from backend.services.phan_quyen_service import kiem_quyen


def tai(form,format,year,start,end,id_ncc,id_danh_gia,ho_so):
    kiem_quyen(ho_so,'ncc','xem')
    if form not in ('BM03','BM06','BM07','BM08') or format not in ('xlsx','pdf'):
        raise ThieuDuLieu('Biểu mẫu hoặc định dạng không hợp lệ.')
    if start>end:raise ThieuDuLieu('Ngày bắt đầu phải trước ngày kết thúc.')
    if form=='BM06':
        if not id_danh_gia:raise ThieuDuLieu('Hãy chọn bảng điểm đã duyệt để in BM06.')
        data=repo.bang_diem(id_danh_gia)
        if data['trang_thai_duyet']!='DA_DUYET':
            raise ThieuDuLieu('Chỉ in BM06 sau khi bảng điểm đã được duyệt.')
        if id_ncc and data['id_ncc']!=id_ncc:raise ThieuDuLieu('Bảng điểm không thuộc NCC đã chọn.')
    elif form=='BM03':data=repo.danh_muc(id_ncc)
    elif form=='BM07':data=repo.tong_hop(year,id_ncc)
    else:data=repo.su_co(start,end,id_ncc)
    book=export.workbook(form,data,year)
    content=export.excel(book) if format=='xlsx' else export.pdf(book,form)
    repo.ghi_xuat(form,ho_so['ma_nhan_vien'],dict(dinh_dang=format,nam=year,
                    tu_ngay=start,den_ngay=end,id_ncc=id_ncc,id_danh_gia=id_danh_gia))
    name=f'{form}_{year}_{date.today():%Y%m%d}.{format}'
    return content,name
