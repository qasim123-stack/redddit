"""Crisis Alert Management API endpoints"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from datetime import datetime
import logging

from app.database import get_db
from app.models import CrisisAlert, CrisisAlertRead, Profile, Notification, NotificationRead
from app.core.security import get_current_user_with_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crisis", tags=["Crisis Alerts"])


# ============================================
# CRISIS ALERT ENDPOINTS
# ============================================

@router.post("/profiles/{profile_id}/detect", status_code=status.HTTP_202_ACCEPTED)
def trigger_crisis_detection(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Manually trigger crisis detection for a profile.

    Queues a background task that analyzes the last 24h of sentiment
    data and creates a CrisisAlert if a negative spike is detected.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id
        )
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    from app.tasks.crisis_tasks import detect_crisis_for_profile_task
    task = detect_crisis_for_profile_task.delay(profile_id)

    return {
        "message": "Crisis detection queued",
        "profile_id": profile_id,
        "task_id": task.id,
    }


@router.get("/profiles/{profile_id}/alerts", response_model=List[CrisisAlertRead])
def list_crisis_alerts(
    profile_id: int,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    severity: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    List crisis alerts for a profile.

    Filter by:
    - **status**: active, acknowledged, resolved
    - **severity**: low, medium, high, critical
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id
        )
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    query = select(CrisisAlert).where(CrisisAlert.profile_id == profile_id)

    if status_filter:
        query = query.where(CrisisAlert.status == status_filter)
    if severity:
        query = query.where(CrisisAlert.severity == severity)

    query = query.order_by(CrisisAlert.created_at.desc()).offset(offset).limit(limit)
    alerts = db.exec(query).all()
    return alerts


@router.get("/alerts", response_model=List[CrisisAlertRead])
def list_all_crisis_alerts(
    status_filter: Optional[str] = Query(default="active", alias="status"),
    severity: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    List all crisis alerts for the current user across all profiles.

    Defaults to showing only **active** alerts.
    """
    query = select(CrisisAlert).where(CrisisAlert.user_id == current_user_id)

    if status_filter:
        query = query.where(CrisisAlert.status == status_filter)
    if severity:
        query = query.where(CrisisAlert.severity == severity)

    query = query.order_by(CrisisAlert.created_at.desc()).offset(offset).limit(limit)
    alerts = db.exec(query).all()
    return alerts


@router.get("/alerts/{alert_id}", response_model=CrisisAlertRead)
def get_crisis_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """Get a specific crisis alert by ID."""
    alert = db.exec(
        select(CrisisAlert).where(
            CrisisAlert.id == alert_id,
            CrisisAlert.user_id == current_user_id,
        )
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Crisis alert not found")

    return alert


@router.post("/alerts/{alert_id}/acknowledge", response_model=CrisisAlertRead)
def acknowledge_crisis_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Acknowledge a crisis alert.

    Marks the alert as acknowledged (status: acknowledged).
    Use this to signal you are aware of the issue and investigating.
    """
    alert = db.exec(
        select(CrisisAlert).where(
            CrisisAlert.id == alert_id,
            CrisisAlert.user_id == current_user_id,
        )
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Crisis alert not found")

    if alert.status == "resolved":
        raise HTTPException(status_code=400, detail="Cannot acknowledge a resolved alert")

    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()
    alert.updated_at = datetime.utcnow()
    db.add(alert)
    db.commit()
    db.refresh(alert)

    logger.info(f"CrisisAlert {alert_id} acknowledged by user {current_user_id}")
    return alert


@router.post("/alerts/{alert_id}/resolve", response_model=CrisisAlertRead)
def resolve_crisis_alert(
    alert_id: int,
    resolution_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Resolve a crisis alert.

    Marks the alert as resolved (status: resolved).
    Optionally include resolution notes explaining what was done.
    """
    alert = db.exec(
        select(CrisisAlert).where(
            CrisisAlert.id == alert_id,
            CrisisAlert.user_id == current_user_id,
        )
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Crisis alert not found")

    if alert.status == "resolved":
        raise HTTPException(status_code=400, detail="Alert is already resolved")

    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    alert.resolution_notes = resolution_notes
    alert.updated_at = datetime.utcnow()
    db.add(alert)
    db.commit()
    db.refresh(alert)

    logger.info(f"CrisisAlert {alert_id} resolved by user {current_user_id}")
    return alert


# ============================================
# NOTIFICATION ENDPOINTS
# ============================================

@router.get("/notifications", response_model=List[NotificationRead])
def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    List in-app notifications for the current user.

    Set **unread_only=true** to see only unread notifications.
    """
    query = select(Notification).where(
        Notification.user_id == current_user_id,
        Notification.is_archived == False,
    )

    if unread_only:
        query = query.where(Notification.is_read == False)

    query = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    notifications = db.exec(query).all()
    return notifications


@router.get("/notifications/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """Get the count of unread notifications for the current user."""
    from sqlmodel import func
    count = db.exec(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user_id,
            Notification.is_read == False,
            Notification.is_archived == False,
        )
    ).one()

    return {"unread_count": count}


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """Mark a single notification as read."""
    notification = db.exec(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user_id,
        )
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    notification.updated_at = datetime.utcnow()
    db.add(notification)
    db.commit()

    return {"message": "Notification marked as read"}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """Mark all unread notifications as read for the current user."""
    unread = db.exec(
        select(Notification).where(
            Notification.user_id == current_user_id,
            Notification.is_read == False,
        )
    ).all()

    now = datetime.utcnow()
    for notification in unread:
        notification.is_read = True
        notification.read_at = now
        notification.updated_at = now
        db.add(notification)

    db.commit()

    return {"message": f"Marked {len(unread)} notifications as read"}
