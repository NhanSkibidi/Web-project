"""
Dịch vụ gửi Email qua SMTP (Gmail App Password) chạy nền bằng FastAPI BackgroundTasks.
Phục vụ Task Bonus T3D003D:
  1. Nhắc sách sắp đến hạn trả (trong 2 ngày).
  2. Cảnh báo sách quá hạn trả (kèm số ngày trễ & tiền phạt tạm tính 2.000đ/ngày).
  3. Thông báo sách đặt trước (Reservation) đã sẵn sàng để đến quầy nhận.

Nếu chưa điền SMTP_USER / SMTP_PASSWORD trong file .env, dịch vụ tự động chạy
ở chế độ DRY-RUN (ghi log nội dung email ra console) để không làm lỗi luồng chính.
"""
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
import html as html_lib
import logging
import smtplib

from app.core.config import settings

logger = logging.getLogger("unilib.email")


def _wrap_html_template(header_title: str, accent_hex: str, body_html: str) -> str:
    """Khung HTML email chuẩn nhận diện thương hiệu UniLib KS25."""
    return f"""<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:Arial,Helvetica,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
          <tr>
            <td style="background:{accent_hex};padding:20px 24px;color:#FFFFFF;">
              <div style="font-size:12px;letter-spacing:0.8px;opacity:0.9;text-transform:uppercase;">THƯ VIỆN SỐ UNILIB — KS25</div>
              <h2 style="margin:6px 0 0;font-size:20px;line-height:1.3;">{header_title}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-size:14px;line-height:1.65;color:#334155;">
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;padding:14px 24px;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;">
              Email tự động từ Hệ thống Quản lý Thư viện Số UniLib KS25. Vui lòng không trả lời trực tiếp email này.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_email_smtp(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> dict:
    """
    Gửi email qua SMTP (mặc định Gmail smtp.gmail.com:587 + STARTTLS + App Password).
    An toàn khi chạy trong FastAPI BackgroundTasks (không ném exception chưa bắt).
    """
    if not to_email or "@" not in to_email:
        logger.warning("[EMAIL] Địa chỉ email không hợp lệ: %s", to_email)
        return {"sent": False, "mode": "skipped", "reason": "invalid_email"}

    if not settings.smtp_configured:
        # Chế độ DRY-RUN khi chưa nhập Gmail App Password trong .env
        print(f"[EMAIL DRY-RUN] To: {to_email} | Subject: {subject}")
        logger.info("[EMAIL DRY-RUN] To=%s | Subject=%s", to_email, subject)
        return {"sent": True, "mode": "dry_run", "to": to_email, "subject": subject}

    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((str(Header(settings.SMTP_FROM_NAME, "utf-8")), settings.SMTP_USER))
    msg["To"] = to_email
    msg["Subject"] = Header(subject, "utf-8")

    plain = text_body or subject
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            if settings.SMTP_USE_TLS:
                server.starttls()
                server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())

        print(f"[EMAIL SMTP SENT] To: {to_email} | Subject: {subject}")
        logger.info("[EMAIL SMTP SENT] To=%s | Subject=%s", to_email, subject)
        return {"sent": True, "mode": "smtp", "to": to_email, "subject": subject}
    except Exception as exc:
        print(f"[EMAIL SMTP ERROR] To: {to_email} | Error: {exc}")
        logger.error("[EMAIL SMTP ERROR] To=%s | Error=%s", to_email, exc)
        return {"sent": False, "mode": "smtp_error", "to": to_email, "error": str(exc)}


def send_overdue_reminder_email(
    to_email: str,
    reader_name: str,
    loan_code: str,
    book_title: str,
    due_date: str,
    days_overdue: int,
    estimated_fine: float,
) -> dict:
    """Gửi email cảnh báo sách quá hạn trả (báo động đỏ)."""
    fine_str = f"{int(round(estimated_fine)):,} đ".replace(",", ".")
    r_name = html_lib.escape(str(reader_name or ""))
    b_title = html_lib.escape(str(book_title or ""))
    l_code = html_lib.escape(str(loan_code or ""))
    d_date = html_lib.escape(str(due_date or ""))
    subject = f"[UniLib KS25] Cảnh báo quá hạn trả sách ({days_overdue} ngày) — Phiếu #{loan_code}"
    body = f"""
      <p>Xin chào <strong>{r_name}</strong>,</p>
      <p>Hệ thống Thư viện Số UniLib KS25 ghi nhận ấn phẩm bạn đang mượn đã <strong>quá hạn trả</strong>:</p>
      <table width="100%" cellspacing="0" cellpadding="8" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;margin:14px 0;">
        <tr><td style="width:160px;color:#7F1D1D;"><strong>Mã phiếu mượn:</strong></td><td>#{l_code}</td></tr>
        <tr><td style="color:#7F1D1D;"><strong>Tựa sách:</strong></td><td><strong>{b_title}</strong></td></tr>
        <tr><td style="color:#7F1D1D;"><strong>Hạn trả quy định:</strong></td><td>{d_date}</td></tr>
        <tr><td style="color:#7F1D1D;"><strong>Số ngày quá hạn:</strong></td><td style="color:#DC2626;font-weight:bold;">{days_overdue} ngày</td></tr>
        <tr><td style="color:#7F1D1D;"><strong>Tiền phạt tạm tính:</strong></td><td style="color:#DC2626;font-weight:bold;">{fine_str} (2.000 đ/ngày)</td></tr>
      </table>
      <p>Vui lòng mang sách đến quầy Thư viện KS25 để hoàn trả sớm nhất nhằm tránh phát sinh thêm phí phạt và không bị khóa quyền mượn mới.</p>
    """
    html = _wrap_html_template("Cảnh báo Quá hạn Trả sách", "#DC2626", body)
    text = f"Chào {reader_name}, phiếu #{loan_code} ({book_title}) đã quá hạn {days_overdue} ngày. Phạt tạm tính: {fine_str}."
    return send_email_smtp(to_email, subject, html, text)


def send_due_soon_reminder_email(
    to_email: str,
    reader_name: str,
    loan_code: str,
    book_title: str,
    due_date: str,
    days_remaining: int,
) -> dict:
    """Gửi email nhắc sách sắp đến hạn trong 2 ngày (cảnh báo vàng)."""
    status_txt = "hết hạn hôm nay" if days_remaining <= 0 else f"còn {days_remaining} ngày"
    subject = f"[UniLib KS25] Nhắc hạn trả sách ({status_txt}) — Phiếu #{loan_code}"
    body = f"""
      <p>Xin chào <strong>{reader_name}</strong>,</p>
      <p>Ấn phẩm bạn đang mượn tại Thư viện KS25 sắp đến hạn hoàn trả:</p>
      <table width="100%" cellspacing="0" cellpadding="8" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;margin:14px 0;">
        <tr><td style="width:160px;color:#92400E;"><strong>Mã phiếu mượn:</strong></td><td>#{loan_code}</td></tr>
        <tr><td style="color:#92400E;"><strong>Tựa sách:</strong></td><td><strong>{book_title}</strong></td></tr>
        <tr><td style="color:#92400E;"><strong>Ngày đến hạn:</strong></td><td style="color:#B45309;font-weight:bold;">{due_date} ({status_txt})</td></tr>
      </table>
      <p>Bạn có thể truy cập cổng OPAC mục <strong>Phiếu mượn của tôi</strong> để gia hạn trực tuyến thêm <strong>7 ngày</strong> (nếu chưa từng gia hạn và không có người đặt trước), hoặc mang sách tới quầy trả đúng hạn.</p>
    """
    html = _wrap_html_template("Nhắc nhở Sắp đến Hạn trả sách", "#B45309", body)
    text = f"Chào {reader_name}, sách '{book_title}' (phiếu #{loan_code}) sẽ đến hạn vào {due_date} ({status_txt})."
    return send_email_smtp(to_email, subject, html, text)


def send_reservation_ready_email(
    to_email: str,
    reader_name: str,
    book_title: str,
    copy_code: str,
    pickup_deadline: str,
) -> dict:
    """Gửi email thông báo sách đặt trước đã sẵn sàng để đến nhận (xanh lá UniLib)."""
    subject = f"[UniLib KS25] Sách đặt trước đã sẵn sàng — {book_title}"
    body = f"""
      <p>Xin chào <strong>{reader_name}</strong>,</p>
      <p>Tin vui! Cuốn sách bạn đặt trước tại Thư viện Số UniLib KS25 hiện <strong>đã sẵn sàng</strong> và được giữ riêng cho bạn tại quầy:</p>
      <table width="100%" cellspacing="0" cellpadding="8" style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;margin:14px 0;">
        <tr><td style="width:160px;color:#065F46;"><strong>Tựa sách:</strong></td><td><strong>{book_title}</strong></td></tr>
        <tr><td style="color:#065F46;"><strong>Mã bản sao giữ riêng:</strong></td><td><code>{copy_code}</code></td></tr>
        <tr><td style="color:#065F46;"><strong>Hạn chót đến nhận:</strong></td><td style="color:#1B4332;font-weight:bold;">{pickup_deadline}</td></tr>
      </table>
      <p>Vui lòng mang theo Thẻ thư viện đến quầy thủ thư trước thời hạn trên để hoàn tất thủ tục nhận sách. Sau thời hạn này, hệ thống sẽ tự động chuyển suất giữ chỗ cho độc giả tiếp theo.</p>
    """
    html = _wrap_html_template("Sách Đặt trước đã Sẵn sàng!", "#1B4332", body)
    text = f"Chào {reader_name}, sách đặt trước '{book_title}' (mã {copy_code}) đã sẵn sàng. Hạn nhận: {pickup_deadline}."
    return send_email_smtp(to_email, subject, html, text)
