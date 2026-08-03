from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "apps" / "web" / "public" / "one-honest-barter-circle-test.pdf"
ORGANIZER_URL = "https://unscrewed.lol/go/organizer-sheet"

WIDTH, HEIGHT = letter
INK = HexColor("#171717")
SUB = HexColor("#62666d")
BRAND = HexColor("#3f8cff")
PALE_BLUE = HexColor("#edf5ff")
PANEL = HexColor("#f3f3f3")
LINE = HexColor("#c7cbd1")
WHITE = HexColor("#ffffff")


def paragraph(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    *,
    size: float = 9.5,
    leading: float = 12.5,
    color=INK,
    bold: bool = False,
) -> float:
    block = Paragraph(
        text,
        ParagraphStyle(
            "body",
            fontName="Helvetica-Bold" if bold else "Helvetica",
            fontSize=size,
            leading=leading,
            textColor=color,
        ),
    )
    _, height = block.wrap(width, 100)
    block.drawOn(pdf, x, y - height)
    return height


def section_title(
    pdf: canvas.Canvas, number: str, title: str, x: float, y: float
) -> None:
    pdf.setFillColor(BRAND)
    pdf.circle(x + 8, y + 2, 8, fill=1, stroke=0)
    pdf.setFillColor(WHITE)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawCentredString(x + 8, y - 1, number)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica", 11.5)
    pdf.drawString(x + 24, y - 2, title)


def bullet(
    pdf: canvas.Canvas, text: str, x: float, y: float, width: float
) -> float:
    pdf.setFillColor(BRAND)
    pdf.circle(x + 3, y - 5, 2.2, fill=1, stroke=0)
    height = paragraph(pdf, text, x + 12, y, width - 12)
    return y - height - 6


def labeled_line(
    pdf: canvas.Canvas,
    label: str,
    x: float,
    y: float,
    width: float,
) -> None:
    pdf.setFillColor(SUB)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(x, y, label)
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(0.7)
    pdf.line(x, y - 9, x + width, y - 9)


def checkbox(pdf: canvas.Canvas, x: float, y: float, label: str) -> None:
    pdf.setStrokeColor(INK)
    pdf.setLineWidth(0.8)
    pdf.rect(x, y, 9, 9, fill=0, stroke=1)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica", 8.5)
    pdf.drawString(x + 14, y + 1, label)


def draw_qr(pdf: canvas.Canvas, x: float, y: float, size: float) -> None:
    widget = qr.QrCodeWidget(ORGANIZER_URL)
    x0, y0, x1, y1 = widget.getBounds()
    width = x1 - x0
    height = y1 - y0
    drawing = Drawing(
        size,
        size,
        transform=[size / width, 0, 0, size / height, 0, 0],
    )
    drawing.add(widget)
    renderPDF.draw(drawing, pdf, x, y)


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(
        str(OUTPUT),
        pagesize=letter,
        pageCompression=1,
        invariant=1,
    )
    pdf.setTitle("Run One Honest Barter-Circle Test")
    pdf.setAuthor("unscrewed.lol")
    pdf.setSubject(
        "A one-page organizer field sheet for a measurable barter-circle pilot"
    )

    pdf.setFillColor(WHITE)
    pdf.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica", 25)
    pdf.drawString(42, 744, "Run one honest barter-circle test")
    pdf.setFillColor(SUB)
    pdf.setFont("Helvetica", 11.5)
    pdf.drawString(
        42,
        721,
        "The goal is one useful two-person exchange - or clear evidence of why it failed.",
    )
    pdf.setFillColor(BRAND)
    pdf.rect(42, 703, WIDTH - 84, 4, fill=1, stroke=0)

    left_x = 42
    right_x = 316
    column_width = 254

    section_title(pdf, "1", "SET A REAL BOUNDARY", left_x, 677)
    y = 658
    y = bullet(
        pdf,
        "Choose one ZIP, building, workplace, campus, or trusted group.",
        left_x,
        y,
        column_width,
    )
    y = bullet(
        pdf,
        "Recruit only 2 to 5 people. Each person posts one offer they can fulfill now.",
        left_x,
        y,
        column_width,
    )
    bullet(
        pdf,
        "Every offer states scope, timing, local or remote mode, and 2 or 3 realistic returns.",
        left_x,
        y,
        column_width,
    )

    section_title(pdf, "2", "MAKE ONE PLAUSIBLE MATCH", left_x, 552)
    y = 533
    y = bullet(
        pdf,
        "Choose one offer and invite one person who could genuinely want it.",
        left_x,
        y,
        column_width,
    )
    y = bullet(
        pdf,
        "Write the exact goods, services, quantities, timing, location, materials, and rescheduling terms.",
        left_x,
        y,
        column_width,
    )
    bullet(
        pdf,
        "Either person may decline without pressure. The organizer observes but does not negotiate for them.",
        left_x,
        y,
        column_width,
    )

    section_title(pdf, "3", "BUILD SAFETY INTO THE TEST", right_x, 677)
    y = 658
    y = bullet(
        pdf,
        "For local exchanges: prefer daylight and a public place, tell someone, and inspect goods first.",
        right_x,
        y,
        column_width,
    )
    y = bullet(
        pdf,
        "For remote services: define the session and never share passwords, codes, financial data, or device access.",
        right_x,
        y,
        column_width,
    )
    bullet(
        pdf,
        "Use only lawful goods and services. Stop if the person, place, or terms change unexpectedly.",
        right_x,
        y,
        column_width,
    )

    section_title(pdf, "4", "COUNT ONLY WHAT HAPPENED", right_x, 552)
    steps = [
        "Genuine offer posted",
        "Plausible invitation opened",
        "Proposal made",
        "Both people joined the conversation",
        "Clear terms agreed",
        "Real exchange happened",
        "Both people separately confirmed completion",
    ]
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica", 9.5)
    for index, step in enumerate(steps, start=1):
        pdf.drawString(right_x, 531 - (index - 1) * 15, f"{index}  {step}")

    pdf.setFillColor(PALE_BLUE)
    pdf.roundRect(42, 345, WIDTH - 84, 70, 9, fill=1, stroke=0)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(56, 390, "Can you organize a 2-5 person test?")
    pdf.setFillColor(SUB)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(
        56,
        372,
        "Scan to share a real place, plausible participants, and one starting offer.",
    )
    pdf.setFillColor(BRAND)
    pdf.setFont("Helvetica-Bold", 8.5)
    pdf.drawString(56, 356, "unscrewed.lol/go/organizer-sheet")
    pdf.setFillColor(WHITE)
    pdf.roundRect(508, 350, 60, 60, 5, fill=1, stroke=0)
    draw_qr(pdf, 513, 355, 50)

    pdf.setFillColor(PANEL)
    pdf.roundRect(42, 50, WIDTH - 84, 280, 8, fill=1, stroke=0)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica", 14)
    pdf.drawString(58, 311, "Record the result")
    pdf.setFillColor(SUB)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(
        58,
        295,
        "A failed match is useful evidence when the reason is written down.",
    )

    labeled_line(pdf, "ORGANIZER / PLACE", 58, 270, 230)
    labeled_line(pdf, "DATE", 326, 270, 96)
    labeled_line(pdf, "PARTICIPANTS", 442, 270, 112)
    labeled_line(pdf, "OFFER MATCHED", 58, 236, 230)
    labeled_line(pdf, "REQUESTED RETURN", 326, 236, 228)

    pdf.setFillColor(SUB)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(58, 202, "FURTHEST VERIFIED STEP")
    checkbox(pdf, 58, 182, "No match")
    checkbox(pdf, 136, 182, "Proposal")
    checkbox(pdf, 209, 182, "Two-sided talk")
    checkbox(pdf, 321, 182, "Terms")
    checkbox(pdf, 382, 182, "Trade happened")
    checkbox(pdf, 484, 182, "Both confirmed")

    labeled_line(pdf, "BIGGEST FRICTION OR SAFETY CONCERN", 58, 151, 496)
    labeled_line(pdf, "NEXT CHANGE OR FOLLOW-UP PERMISSION", 58, 113, 496)

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica", 8.5)
    pdf.drawString(42, 28, "unscrewed.lol")
    pdf.setFillColor(SUB)
    pdf.setFont("Helvetica", 7.5)
    pdf.drawRightString(
        WIDTH - 42,
        28,
        "Guide: unscrewed.lol/blog/how-to-start-a-neighborhood-barter-circle",
    )
    pdf.drawRightString(
        WIDTH - 42,
        16,
        "Safety: unscrewed.lol/safety  |  Public benefit: unscrewed.lol/public-benefit",
    )

    pdf.showPage()
    pdf.save()


if __name__ == "__main__":
    build()
