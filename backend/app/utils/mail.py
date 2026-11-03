"""Mail delivery to the local Mailpit inbox.

Mailpit listens on ``127.0.0.1:1025`` in development. Sending is best effort:
when the inbox is not running the API still answers, because the reset link is
also written to the application log.
"""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from flask import current_app


def send_mail(to: str, subject: str, body: str) -> bool:
    """Send a plain-text message; return whether it was delivered."""
    message = EmailMessage()
    message["From"] = current_app.config.get("MAIL_SENDER", "no-reply@example.com")
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    host = current_app.config.get("MAIL_HOST", "127.0.0.1")
    port = int(current_app.config.get("MAIL_PORT", 1025))
    try:
        with smtplib.SMTP(host, port, timeout=3) as smtp:
            smtp.send_message(message)
        return True
    except (OSError, smtplib.SMTPException) as error:
        current_app.logger.warning("Mail to %s could not be sent: %s", to, error)
        current_app.logger.info("Mail body for %s: %s", to, body)
        return False


def send_password_reset_mail(to: str, reset_url: str) -> bool:
    """Send the password reset link (requirement 1.8)."""
    body = (
        "We received a request to reset your password.\n\n"
        f"Open this link to choose a new password:\n{reset_url}\n\n"
        "The link expires in one hour. If you did not ask for it, ignore this email.\n"
    )
    return send_mail(to, "Reset your password", body)


__all__ = ["send_mail", "send_password_reset_mail"]
