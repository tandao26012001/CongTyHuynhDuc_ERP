"""Integration checks with synthetic fixtures on configured DB; always rollback."""
import sys
from pathlib import Path
from contextlib import ExitStack, contextmanager
from unittest.mock import patch
from uuid import uuid4
from datetime import date
from decimal import Decimal
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.data import db, dat_ngoai_repo as repo, dat_ngoai_chi_tiet_repo as detail


def main():
    tag = 'UAT' + uuid4().hex[:10]
    try:
        with db.get_conn() as conn:
            @contextmanager
            def shared():
                with conn.transaction():
                    yield conn
            with conn.transaction(force_rollback=True), ExitStack() as stack:
                stack.enter_context(patch.object(repo, 'get_conn', shared))
                stack.enter_context(patch.object(detail, 'get_conn', shared))
                actor = conn.execute('SELECT ma_nhan_vien FROM tai_khoan LIMIT 1').fetchone()['ma_nhan_vien']
                conn.execute('INSERT INTO lenh_san_xuat(lenh_san_xuat) VALUES(%s)', (tag,))
                conn.execute("INSERT INTO dat_ngoai(id,lenh_san_xuat,nguoi_lap,nguoi_tao,trang_thai) VALUES(%s,%s,%s,%s,'DANG_LAM')", (tag,tag,actor,actor))
                for i in (1,2):
                    conn.execute("INSERT INTO dat_ngoai_dong(id,id_dat_ngoai,stt_dong,ten_hang_chup,dvt_chup,so_luong,nguoi_tao,trang_thai_dong) VALUES(%s,%s,%s,'Synthetic','PCS',10,%s,'DANG_LAM')", (tag+str(i),tag,i,actor))
                    for j,qty in ((1,4),(2,6)):
                        conn.execute('INSERT INTO dat_ngoai_dot_giao(id,id_dat_ngoai_dong,dot_so,so_luong,ngay_du_kien,nguoi_tao) VALUES(%s,%s,%s,%s,current_date,%s)',(tag+str(i)+str(j),tag+str(i),j,qty,actor))
                assert any(r['id']==tag for r in repo.danh_sach_dat_ngoai(conn,'ca_nhan',{'ma_nhan_vien':actor}))
                assert not repo.danh_sach_dat_ngoai(conn,'ca_nhan',{'ma_nhan_vien':tag})
                assert not repo.danh_sach_dat_ngoai(conn,'bo_phan',{})
                from backend.services.dat_ngoai_scope import kiem_phieu
                from backend.services.errors import KhongCoQuyen
                kiem_phieu(tag,'ca_nhan',{'ma_nhan_vien':actor},conn)
                try:
                    kiem_phieu(tag,'ca_nhan',{'ma_nhan_vien':tag},conn)
                except KhongCoQuyen:
                    pass
                else:
                    raise AssertionError('Foreign owner accepted')
                print('PASS scoped SQL listing and record access')
                def state():
                    return conn.execute('SELECT * FROM dat_ngoai WHERE id=%s',(tag,)).fetchone()
                def blocked(target):
                    try:
                        repo.chuyen_trang_thai(tag,state()['phien_ban'],target,None,actor)
                    except ValueError:
                        return
                    raise AssertionError('Premature transition accepted: '+target)
                blocked('DA_NHAN'); blocked('HOAN_THANH')
                detail.nhan_dot_giao(tag+'1',tag+'11',1,date.today(),actor)
                assert state()['trang_thai']=='DANG_LAM'
                assert detail.nhan_dot_giao(tag+'1',tag+'11',1,date.today(),actor) is None
                assert detail.nhan_dot_giao(tag+'1',tag+'11',2,date.today(),actor) is None
                detail.nhan_dot_giao(tag+'1',tag+'12',1,date.today(),actor)
                assert state()['trang_thai']=='DANG_LAM'
                assert conn.execute('SELECT trang_thai_dong FROM dat_ngoai_dong WHERE id=%s',(tag+'1',)).fetchone()['trang_thai_dong']=='DA_NHAN'
                blocked('HOAN_THANH')
                detail.nhan_dot_giao(tag+'2',tag+'21',1,date.today(),actor)
                detail.nhan_dot_giao(tag+'2',tag+'22',1,date.today(),actor)
                assert state()['trang_thai']=='DA_NHAN'
                conn.execute('INSERT INTO dat_ngoai_yeu_cau_kt(id,id_dat_ngoai_dong,noi_dung,nguoi_yeu_cau) VALUES(%s,%s,%s,%s)',(tag,tag+'1','Synthetic request',actor))
                blocked('HOAN_THANH')
                conn.execute('DELETE FROM dat_ngoai_yeu_cau_kt WHERE id=%s',(tag,))
                assert repo.chuyen_trang_thai(tag,state()['phien_ban'],'HOAN_THANH',None,actor)['trang_thai']=='HOAN_THANH'
                try:
                    detail.nhan_dot_giao(tag+'2',tag+'22',2,date.today(),actor)
                except ValueError:
                    pass
                else:
                    raise AssertionError('Closed request accepted receipt')
                print('PASS partial/full receipt, line/document status, replay, premature completion, pending technical request, closed request')
            assert conn.execute('SELECT id FROM dat_ngoai WHERE id=%s',(tag,)).fetchone() is None
            print('PASS rollback')
    finally:
        db.close_pool()


if __name__ == '__main__':
    main()
