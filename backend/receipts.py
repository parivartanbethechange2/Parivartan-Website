"""80G tax receipt PDF generation."""
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

FOREST = colors.HexColor("#2C5234")
CLAY = colors.HexColor("#C87941")
INK = colors.HexColor("#1A2F23")
LINE = colors.HexColor("#D9D2C5")

ORG_NAME = "Parivartan 'Be The Change' Social Welfare Society"
ORG_ADDRESS = "Vill. Missarwala, P.O. Kunda, Kashipur, Udham Singh Nagar, Uttarakhand - 244713"
REG_NO = "UK0670872022009004"
PAN = "AAFTP3547E"
REG_80G = "AAFTP3547EE20231"
DARPAN = "UA/2023/0342800"
CSR1 = "CSR00056512"


def _inr(paise: int) -> str:
    rupees = paise / 100
    s = f"{rupees:,.2f}"
    return f"Rs. {s}"


def _words(n: int) -> str:
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
            "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def under_hundred(x):
        if x < 20:
            return ones[x]
        return (tens[x // 10] + (" " + ones[x % 10] if x % 10 else "")).strip()

    def under_thousand(x):
        if x < 100:
            return under_hundred(x)
        return (ones[x // 100] + " Hundred" + (" " + under_hundred(x % 100) if x % 100 else "")).strip()

    if n == 0:
        return "Zero"
    parts = []
    for divisor, label in ((10000000, "Crore"), (100000, "Lakh"), (1000, "Thousand")):
        if n >= divisor:
            parts.append(f"{under_thousand(n // divisor)} {label}")
            n %= divisor
    if n:
        parts.append(under_thousand(n))
    return " ".join(parts)


def build_receipt_pdf(receipt: dict, logo_path: str | None = None) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4
    m = 18 * mm

    c.setFillColor(FOREST)
    c.rect(0, H - 42 * mm, W, 42 * mm, fill=1, stroke=0)

    if logo_path:
        try:
            c.drawImage(logo_path, m, H - 36 * mm, width=26 * mm, height=26 * mm,
                        preserveAspectRatio=True, mask="auto")
        except Exception:
            pass

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(m + 32 * mm, H - 17 * mm, ORG_NAME)
    c.setFont("Helvetica", 8)
    c.drawString(m + 32 * mm, H - 23 * mm, ORG_ADDRESS)
    c.drawString(m + 32 * mm, H - 28 * mm, f"Society Reg. No. {REG_NO}  |  PAN {PAN}  |  NGO Darpan {DARPAN}  |  CSR-1 {CSR1}")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#E9EDC9"))
    c.drawString(m + 32 * mm, H - 35 * mm, "RECEIPT FOR DONATION - ELIGIBLE FOR DEDUCTION UNDER SECTION 80G")

    y = H - 56 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(m, y, "80G TAX EXEMPTION RECEIPT")
    c.setFont("Helvetica", 9)
    c.setFillColor(CLAY)
    c.drawRightString(W - m, y, f"Receipt No. {receipt['receipt_no']}")
    c.setFillColor(colors.HexColor("#6B7C70"))
    dt = receipt.get("issued_at") or ""
    try:
        dt = datetime.fromisoformat(dt).strftime("%d %B %Y")
    except Exception:
        pass
    c.drawRightString(W - m, y - 5 * mm, f"Date: {dt}")

    y -= 14 * mm
    c.setStrokeColor(LINE)
    c.line(m, y, W - m, y)

    rows = [
        ("Received with thanks from", receipt.get("donor_name", "-")),
        ("Email", receipt.get("donor_email", "-")),
        ("Phone", receipt.get("donor_phone") or "-"),
        ("Donor PAN", receipt.get("donor_pan") or "Not provided"),
        ("Purpose", receipt.get("purpose_label", "General Donation")),
        ("Payment reference", receipt.get("payment_ref", "-")),
        ("Mode of payment", receipt.get("payment_mode", "Online")),
    ]

    y -= 10 * mm
    c.setFont("Helvetica", 9)
    for label, value in rows:
        c.setFillColor(colors.HexColor("#6B7C70"))
        c.drawString(m, y, label)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(m + 55 * mm, y, str(value)[:80])
        c.setFont("Helvetica", 9)
        y -= 8 * mm

    y -= 4 * mm
    c.setFillColor(colors.HexColor("#F4F6E8"))
    c.rect(m, y - 20 * mm, W - 2 * m, 20 * mm, fill=1, stroke=0)
    c.setFillColor(FOREST)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(m + 6 * mm, y - 10 * mm, _inr(receipt["amount"]))
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#4A5A4E"))
    c.drawString(m + 6 * mm, y - 16 * mm, f"Rupees {_words(int(receipt['amount'] / 100))} only")

    y -= 32 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(m, y, "Tax exemption details")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(colors.HexColor("#4A5A4E"))
    for line in [
        f"Registration under Section 12A & 80G of the Income Tax Act, 1961: {REG_80G}",
        f"PAN of the Society: {PAN}",
        "This donation is eligible for deduction under Section 80G. Please retain this receipt for your records.",
        "Donations are voluntary and non-refundable.",
    ]:
        y -= 6 * mm
        c.drawString(m, y, line)

    y -= 24 * mm
    c.setStrokeColor(LINE)
    c.line(W - m - 55 * mm, y, W - m, y)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(W - m, y - 6 * mm, "For " + ORG_NAME)
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#6B7C70"))
    c.drawRightString(W - m, y - 11 * mm, "Authorised Signatory")

    c.setFillColor(colors.HexColor("#9AA79C"))
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(W / 2, 14 * mm, "This is a computer-generated receipt issued on payment confirmation.")
    if receipt.get("simulated"):
        c.setFillColor(CLAY)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(W / 2, 9 * mm, "SIMULATED PAYMENT - PAYMENT GATEWAY NOT YET CONNECTED - NOT A VALID TAX DOCUMENT")

    c.showPage()
    c.save()
    return buf.getvalue()
