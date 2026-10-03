from decimal import Decimal
from unittest import TestCase
from backend.data.dat_ngoai_nhan_hang import kiem_tra_du


class TestReceiptReconciliation(TestCase):
    def test_every_line_must_be_received_exactly(self):
        full = {'so_luong': Decimal('10.5'), 'da_len_lich': Decimal('10.5'), 'da_nhan': Decimal('10.5')}
        kiem_tra_du([full])
        for rows in ([], [full, {**full, 'da_nhan': Decimal('10')}],
                     [{**full, 'da_len_lich': Decimal('11')}],
                     [{**full, 'da_nhan': Decimal('11')}],
                     [{'so_luong': 0, 'da_len_lich': 0, 'da_nhan': 0}]):
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                kiem_tra_du(rows)
