"""Small helper layer over python-hwpx for worksheet building."""
import warnings
warnings.filterwarnings("ignore")
from hwpx import HwpxDocument

FONT = "맑은 고딕"
BODY = 12
BLUE = "#1F4E79"
SOFT = "#DEEAF6"
YELLOW = "#FFF2CC"
GRAY = "#F2F2F2"


class Sheet:
    def __init__(self):
        self.d = HwpxDocument.new()
        self.d.set_page_margins(left=5670, right=5670, top=4252, bottom=4252)  # 20mm / 15mm
        self.first = True

    def _para(self):
        if self.first:
            self.first = False
            p = self.d.paragraphs[0]
            return p
        return self.d.add_paragraph("", include_run=False, inherit_style=False)

    def _fmt_last(self, **kw):
        idx = len(self.d.paragraphs) - 1
        self.d.set_paragraph_format(paragraph_index=idx, **kw)

    def text(self, parts, size=BODY, align=None, after=4, before=0, line=160, indent=None, page_break=False):
        """parts: str or list of (text, dict(bold=, color=, size=, underline=))"""
        p = self._para()
        if isinstance(parts, str):
            parts = [(parts, {})]
        for t, o in parts:
            o = dict(o)
            p.add_run(t, font=FONT, size=o.pop("size", size), **o)
        kw = dict(spacing_after_pt=after, spacing_before_pt=before, line_spacing_percent=line)
        if align:
            kw["alignment"] = align
        if indent is not None:
            kw["indent_left_mm"] = indent
        if page_break:
            kw["page_break_before"] = True
        self._fmt_last(**kw)
        return p

    def blank(self, n=1):
        for _ in range(n):
            self.text(" ", size=6, after=0)

    def title(self, main, sub=None, page_break=False):
        t = self.d.add_table(1, 1) if not self.first else None
        if self.first:
            self.first = False
            t = self.d.add_table(1, 1)
        t.set_cell_shading(0, 0, BLUE)
        c = t.cell(0, 0)
        c.set_margins(left=850, right=850, top=567, bottom=567)
        p = c.paragraphs[0]
        p.add_run(main, font=FONT, size=20, bold=True, color="#FFFFFF")
        if sub:
            p2 = c.add_paragraph("")
            p2.add_run(sub, font=FONT, size=11, color="#FFFFFF")
        if page_break:
            # table anchor paragraph is the last paragraph
            self._fmt_last(page_break_before=True)
        return t

    def section(self, label, minutes=None):
        self.blank()
        t = self.d.add_table(1, 1)
        t.set_cell_shading(0, 0, SOFT)
        c = t.cell(0, 0)
        c.set_margins(left=567, right=567, top=280, bottom=280)
        p = c.paragraphs[0]
        p.add_run(label, font=FONT, size=14, bold=True, color=BLUE)
        if minutes:
            p.add_run(f"   (시간: {minutes})", font=FONT, size=11, color="#595959")
        self.blank()

    def box(self, lines, fill=YELLOW, size=BODY):
        """Boxed paragraphs; lines: list of str or parts-lists."""
        t = self.d.add_table(1, 1)
        t.set_cell_shading(0, 0, fill)
        c = t.cell(0, 0)
        c.set_margins(left=850, right=850, top=425, bottom=425)
        first = True
        for ln in lines:
            p = c.paragraphs[0] if first else c.add_paragraph("")
            first = False
            parts = [(ln, {})] if isinstance(ln, str) else ln
            for tx, o in parts:
                o = dict(o)
                p.add_run(tx, font=FONT, size=o.pop("size", size), **o)
        return t

    def table(self, rows, widths=None, header=True, size=11, fills=None, height=None):
        t = self.d.add_table(len(rows), len(rows[0]))
        if widths:
            t.set_column_widths(widths)
        for r, row in enumerate(rows):
            for ci, val in enumerate(row):
                c = t.cell(r, ci)
                c.set_margins(left=425, right=425, top=200, bottom=200)
                chunks = val.split("\n") if isinstance(val, str) else [val]
                for k, chunk in enumerate(chunks):
                    p = c.paragraphs[0] if k == 0 else c.add_paragraph("")
                    parts = [(chunk, {})] if isinstance(chunk, str) else chunk
                    for tx, o in parts:
                        o = dict(o)
                        bold = o.pop("bold", header and r == 0)
                        p.add_run(tx, font=FONT, size=o.pop("size", size), bold=bold, **o)
                if header and r == 0:
                    t.set_cell_shading(r, ci, GRAY)
                if fills and (r, ci) in fills:
                    t.set_cell_shading(r, ci, fills[(r, ci)])
                if height and not (header and r == 0):
                    try:
                        c.set_size(height=height)
                    except Exception:
                        pass
        return t

    def q(self, num, text, size=BODY):
        return self.text([(f"{num} ", {"bold": True, "color": BLUE}), (text, {})], size=size, after=3, before=4)

    def choices(self, items, size=BODY):
        marks = "①②③④⑤"
        s = "     ".join(f"{marks[i]} {x}" for i, x in enumerate(items))
        return self.text(s, size=size, indent=6, after=4)

    def answer_line(self, label="답:", n=1, size=BODY):
        for _ in range(n):
            self.text(f"{label} ________________________________________________", size=size, indent=6, after=6)
            label = "    "

    def footer(self, text):
        self.d.set_footer_text(text)

    def save(self, path):
        self.d.save_to_path(path)
        rep = self.d.validate()
        return rep
