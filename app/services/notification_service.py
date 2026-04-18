"""Notification Delivery Service

Handles delivery of alerts via:
1. In-app notifications (always, stored in DB)
2. Email (via SMTP when configured)
3. Slack (via webhook URL when configured)
"""

import smtplib
import json
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional

import httpx
from sqlmodel import Session, select

from app.database import engine
from app.models import CrisisAlert, Notification, UserPreferences
from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================
# IN-APP NOTIFICATIONS
# ============================================

def create_in_app_notification(
    db: Session,
    user_id: int,
    profile_id: Optional[int],
    notification_type: str,
    title: str,
    message: str,
    severity: str = "warning",
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[int] = None,
    data: Optional[dict] = None,
) -> Notification:
    """Create an in-app notification record in the database."""
    notification = Notification(
        user_id=user_id,
        profile_id=profile_id,
        type=notification_type,
        title=title,
        message=message,
        severity=severity,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        data=data,
        channels=["in_app"],
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    logger.info(f"In-app notification {notification.id} created for user {user_id}")
    return notification


# ============================================
# EMAIL NOTIFICATIONS
# ============================================

def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send an email via SMTP. Returns True on success.
    Requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in settings.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.debug("SMTP not configured, skipping email notification")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        msg["To"] = to_email

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def _build_crisis_email_html(alert: CrisisAlert, profile_name: str) -> str:
    """Build HTML body for crisis alert email."""
    severity_colors = {
        "critical": "#dc2626",
        "high": "#ea580c",
        "medium": "#d97706",
        "low": "#2563eb",
    }
    color = severity_colors.get(alert.severity, "#6b7280")

    pain_points_html = ""
    if alert.top_pain_points:
        items = "".join(f"<li>{p}</li>" for p in alert.top_pain_points)
        pain_points_html = f"<p><strong>Top Pain Points:</strong><ul>{items}</ul></p>"

    keywords_html = ""
    if alert.top_keywords:
        keywords_html = (
            f"<p><strong>Top Keywords:</strong> "
            f"{', '.join(alert.top_keywords[:5])}</p>"
        )

    return f"""
    <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: {color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">🚨 Crisis Alert: {alert.severity.upper()}</h2>
        <p style="margin: 5px 0 0 0;">Profile: {profile_name}</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <h3>{alert.title}</h3>
        <p>{alert.description}</p>
        <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid {color};">
          <p><strong>Negative Posts (24h):</strong> {alert.negative_count_current}</p>
          <p><strong>Baseline Negatives (7 days):</strong> {alert.negative_count_baseline}</p>
          <p><strong>Spike Multiplier:</strong> {alert.spike_multiplier}x</p>
          <p><strong>Detected:</strong> {alert.created_at.strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>
        {pain_points_html}
        {keywords_html}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Log in to your Reddit AI Platform dashboard to view full details and acknowledge this alert.
        </p>
      </div>
    </body></html>
    """


# ============================================
# SLACK NOTIFICATIONS
# ============================================

def _send_slack_notification(webhook_url: str, message: dict) -> bool:
    """Send a message to a Slack webhook URL."""
    try:
        response = httpx.post(webhook_url, json=message, timeout=10)
        if response.status_code == 200:
            logger.info("Slack notification sent successfully")
            return True
        else:
            logger.error(f"Slack webhook returned {response.status_code}: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Failed to send Slack notification: {e}")
        return False


def _build_slack_crisis_message(alert: CrisisAlert, profile_name: str) -> dict:
    """Build Slack Block Kit message for crisis alert."""
    severity_emojis = {
        "critical": ":rotating_light:",
        "high": ":red_circle:",
        "medium": ":large_yellow_circle:",
        "low": ":large_blue_circle:",
    }
    emoji = severity_emojis.get(alert.severity, ":warning:")

    fields = [
        {"type": "mrkdwn", "text": f"*Profile:*\n{profile_name}"},
        {"type": "mrkdwn", "text": f"*Severity:*\n{alert.severity.capitalize()}"},
        {"type": "mrkdwn", "text": f"*Negative Posts (24h):*\n{alert.negative_count_current}"},
        {"type": "mrkdwn", "text": f"*Spike:*\n{alert.spike_multiplier}x above baseline"},
    ]

    if alert.top_pain_points:
        fields.append({
            "type": "mrkdwn",
            "text": f"*Top Pain Points:*\n{', '.join(alert.top_pain_points[:3])}"
        })

    return {
        "text": f"{emoji} Crisis Alert: {alert.title}",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} Crisis Alert Detected"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{alert.title}*\n{alert.description}"
                }
            },
            {
                "type": "section",
                "fields": fields
            },
            {"type": "divider"}
        ]
    }


# ============================================
# MAIN: NOTIFY CRISIS ALERT
# ============================================

def notify_crisis_alert(alert_id: int) -> dict:
    """
    Deliver notifications for a CrisisAlert across all configured channels.

    Channels:
    - in_app: Always delivered (stored in DB)
    - email: If SMTP configured AND user has email notifications enabled
    - slack: If SLACK_WEBHOOK_URL configured

    Returns dict with delivery results.
    """
    results = {"in_app": False, "email": False, "slack": False}
    channels_used = []

    with Session(engine) as db:
        alert = db.exec(
            select(CrisisAlert).where(CrisisAlert.id == alert_id)
        ).first()

        if not alert:
            logger.error(f"CrisisAlert {alert_id} not found")
            return results

        if alert.is_notified:
            logger.info(f"CrisisAlert {alert_id} already notified, skipping")
            return results

        # Load user preferences
        prefs = db.exec(
            select(UserPreferences).where(UserPreferences.user_id == alert.user_id)
        ).first()

        # Only notify if user wants crisis alerts
        if prefs and not prefs.notification_crisis_alerts:
            logger.info(
                f"User {alert.user_id} has crisis alerts disabled, skipping notification"
            )
            # Still mark as notified so we don't retry
            alert.is_notified = True
            alert.notified_at = datetime.utcnow()
            alert.notification_channels = []
            db.add(alert)
            db.commit()
            return results

        # Load profile name for messages
        from app.models import Profile
        profile = db.exec(
            select(Profile).where(Profile.id == alert.profile_id)
        ).first()
        profile_name = profile.name if profile else f"Profile #{alert.profile_id}"

        # --- 1. In-app notification (always) ---
        try:
            create_in_app_notification(
                db=db,
                user_id=alert.user_id,
                profile_id=alert.profile_id,
                notification_type="crisis_alert",
                title=alert.title,
                message=alert.description or "",
                severity=alert.severity,
                related_entity_type="crisis_alert",
                related_entity_id=alert.id,
                data={
                    "spike_multiplier": str(alert.spike_multiplier),
                    "negative_count": alert.negative_count_current,
                    "affected_posts": alert.affected_posts_count,
                }
            )
            results["in_app"] = True
            channels_used.append("in_app")
        except Exception as e:
            logger.error(f"Failed to create in-app notification for alert {alert_id}: {e}")

        # --- 2. Email notification ---
        if (
            prefs and prefs.notification_email
            and settings.SMTP_HOST
            and settings.SMTP_USER
        ):
            from app.models import User
            user = db.exec(select(User).where(User.id == alert.user_id)).first()
            if user and user.email:
                html = _build_crisis_email_html(alert, profile_name)
                subject = f"[{alert.severity.upper()}] Crisis Alert: {profile_name}"
                email_sent = _send_email(user.email, subject, html)
                results["email"] = email_sent
                if email_sent:
                    channels_used.append("email")

        # --- 3. Slack notification ---
        if settings.SLACK_WEBHOOK_URL:
            slack_msg = _build_slack_crisis_message(alert, profile_name)
            slack_sent = _send_slack_notification(settings.SLACK_WEBHOOK_URL, slack_msg)
            results["slack"] = slack_sent
            if slack_sent:
                channels_used.append("slack")

        # --- Mark alert as notified ---
        alert.is_notified = True
        alert.notified_at = datetime.utcnow()
        alert.notification_channels = channels_used
        db.add(alert)
        db.commit()

        logger.info(
            f"CrisisAlert {alert_id} notifications sent via: {channels_used}"
        )

    return results
