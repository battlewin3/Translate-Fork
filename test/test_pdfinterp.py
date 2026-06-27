"""Regression tests for PDFPageInterpreterEx ncs/scs handling.

Commit 876458a incorrectly moved ncs/scs from the interpreter instance (self)
to the graphics state (self.graphicstate), but PDFGraphicState only holds:
linewidth, linecap, linejoin, miterlimit, dash, intent, flatness, scolor, ncolor.

ncs (non-stroking color space) and scs (stroking color space) belong on the
interpreter, not the graphics state.  The fix restores self.ncs / self.scs
in do_SCN, do_scn, and do_Do.
"""

import unittest
from unittest import mock

from pdfminer.pdfinterp import (
    PDFResourceManager,
)
from pdfminer.pdfcolor import PDFColorSpace
from pdfminer.utils import MATRIX_IDENTITY

from pdf2zh.pdfinterp import PDFPageInterpreterEx


class TestNcsScsRegression(unittest.TestCase):
    """Verify do_SCN / do_scn / do_Do use the interpreter's ncs/scs,
    not the (non-existent) graphicstate.ncs / graphicstate.scs."""

    def setUp(self):
        self.rsrcmgr = PDFResourceManager()
        self.device = mock.Mock()
        self.obj_patch = {}
        self.interp = PDFPageInterpreterEx(
            self.rsrcmgr, self.device, self.obj_patch
        )
        # Reproduce what render_contents() does before execute():
        # init_resources + init_state
        self.interp.init_resources({})
        self.interp.init_state(MATRIX_IDENTITY)

    @staticmethod
    def _make_cs(name="DeviceGray", ncomponents=1):
        return PDFColorSpace(name, ncomponents)

    # ── do_SCN ──────────────────────────────────────────────────────────

    def test_do_SCN_uses_self_scs_not_graphicstate(self):
        """do_SCN reads self.scs — must not raise AttributeError."""
        self.interp.push(0.5)
        result = self.interp.do_SCN()
        self.assertEqual(result, [0.5])
        # do_SCN sets graphicstate.scolor = cast(Color, args); args is [0.5]
        self.assertEqual(self.interp.graphicstate.scolor, [0.5])

    def test_do_SCN_without_scs_uses_default_ncomponents(self):
        """When scs is None, fall back to n=1 (non-STRICT mode)."""
        self.interp.scs = None
        self.interp.push(0.8)
        result = self.interp.do_SCN()
        self.assertEqual(result, [0.8])

    # ── do_scn ──────────────────────────────────────────────────────────

    def test_do_scn_uses_self_ncs_not_graphicstate(self):
        """do_scn reads self.ncs — must not raise AttributeError."""
        self.interp.push(0.3)
        result = self.interp.do_scn()
        self.assertEqual(result, [0.3])
        # do_scn sets graphicstate.ncolor = cast(Color, args); args is [0.3]
        self.assertEqual(self.interp.graphicstate.ncolor, [0.3])

    def test_do_scn_without_ncs_uses_default_ncomponents(self):
        """When ncs is None, fall back to n=1 (non-STRICT mode)."""
        self.interp.ncs = None
        self.interp.push(0.9)
        result = self.interp.do_scn()
        self.assertEqual(result, [0.9])

    # ── do_SC / do_sc (aliases) ─────────────────────────────────────────

    def test_do_SC_delegates_to_do_SCN(self):
        """do_SC is an alias for do_SCN."""
        self.interp.push(0.2)
        result = self.interp.do_SC()
        self.assertEqual(result, [0.2])

    def test_do_sc_delegates_to_do_scn(self):
        """do_sc is an alias for do_scn."""
        self.interp.push(0.7)
        result = self.interp.do_sc()
        self.assertEqual(result, [0.7])

    # ── do_Do (ncs/scs propagation) ─────────────────────────────────────

    def test_do_Do_propagates_ncs_scs_from_child_interpreter(self):
        """do_Do copies ncs/scs FROM the child interpreter, not from
        the child's graphicstate.  This is the regression from commit 876458a."""
        child = self.interp.dup()
        child.ncs = self._make_cs("DeviceRGB", 3)
        child.scs = self._make_cs("DeviceRGB", 3)

        # Simulate what do_Do does after render_contents()
        self.interp.ncs = child.ncs
        self.interp.scs = child.scs

        self.assertEqual(self.interp.ncs.name, "DeviceRGB")
        self.assertEqual(self.interp.scs.name, "DeviceRGB")
        self.assertEqual(self.interp.ncs.ncomponents, 3)
        self.assertEqual(self.interp.scs.ncomponents, 3)

    def test_graphicstate_does_not_have_ncs_or_scs(self):
        """PDFGraphicState must NOT have ncs/scs — that was the regression."""
        self.assertFalse(hasattr(self.interp.graphicstate, "ncs"))
        self.assertFalse(hasattr(self.interp.graphicstate, "scs"))
        # But it should have the attributes that ARE part of its definition
        self.assertTrue(hasattr(self.interp.graphicstate, "scolor"))
        self.assertTrue(hasattr(self.interp.graphicstate, "ncolor"))

    # ── Full round-trip via render_contents ─────────────────────────────
    #
    # This guards against a future regression where someone might
    # accidentally re-add self.graphicstate.ncs/.scs.

    def test_render_empty_page_does_not_crash(self):
        """A page with no content should render without error."""
        from pdfminer.pdfpage import PDFPage
        page = mock.Mock(spec=PDFPage)
        page.cropbox = (0, 0, 612, 792)
        page.rotate = 0
        page.contents = []
        page.resources = {}
        # execute([]) catches PSEOF and returns None for empty streams
        self.interp.init_resources({})
        self.interp.init_state(MATRIX_IDENTITY)
        ops = self.interp.execute([])
        self.assertIsNone(ops)


if __name__ == "__main__":
    unittest.main()
