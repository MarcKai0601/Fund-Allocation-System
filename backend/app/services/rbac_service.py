from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.fas_role import FasRole
from app.models.fas_user_role import FasUserRole


def get_user_system_roles(user_id: str, db: Session) -> list[str]:
    """取得某 user 的系統層級角色（portfolio_id IS NULL）。"""
    results = (
        db.query(FasRole.code)
        .join(FasUserRole, FasUserRole.role_id == FasRole.id)
        .filter(FasUserRole.user_id == str(user_id))
        .filter(FasUserRole.portfolio_id.is_(None))
        .all()
    )
    return [r.code for r in results]


def is_system_admin(user_id: str, db: Session) -> bool:
    return "SYSTEM_ADMIN" in get_user_system_roles(user_id, db)


def get_user_portfolio_role(user_id: str, pid: int, db: Session) -> str | None:
    """取得某 user 對特定 portfolio 的角色（最多一個）。"""
    result = (
        db.query(FasRole.code)
        .join(FasUserRole, FasUserRole.role_id == FasRole.id)
        .filter(FasUserRole.user_id == str(user_id))
        .filter(FasUserRole.portfolio_id == pid)
        .first()
    )
    return result.code if result else None


def get_accessible_portfolio_ids(user_id: str, db: Session) -> list[int]:
    """取得某 user 透過角色指派可存取的所有 portfolio id。"""
    results = (
        db.query(FasUserRole.portfolio_id)
        .filter(FasUserRole.user_id == str(user_id))
        .filter(FasUserRole.portfolio_id.isnot(None))
        .all()
    )
    return [r.portfolio_id for r in results]


def grant_role(
    user_id: str,
    role_code: str,
    portfolio_id: int | None,
    granted_by: str,
    db: Session,
) -> FasUserRole:
    role = db.query(FasRole).filter(FasRole.code == role_code).first()
    if not role:
        raise ValueError(f"Role '{role_code}' not found")

    existing = (
        db.query(FasUserRole)
        .filter(FasUserRole.user_id == str(user_id))
        .filter(FasUserRole.role_id == role.id)
        .filter(FasUserRole.portfolio_id == portfolio_id)
        .first()
    )
    if existing:
        return existing

    assignment = FasUserRole(
        user_id=str(user_id),
        role_id=role.id,
        portfolio_id=portfolio_id,
        granted_by=str(granted_by),
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def revoke_role(assignment_id: int, db: Session):
    assignment = db.query(FasUserRole).filter(FasUserRole.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Role assignment not found")
    db.delete(assignment)
    db.commit()


def get_all_role_assignments(db: Session):
    return (
        db.query(FasUserRole, FasRole.code, FasRole.name)
        .join(FasRole, FasRole.id == FasUserRole.role_id)
        .order_by(FasUserRole.user_id, FasUserRole.portfolio_id)
        .all()
    )


def get_portfolio_members(pid: int, db: Session):
    return (
        db.query(FasUserRole, FasRole.code)
        .join(FasRole, FasRole.id == FasUserRole.role_id)
        .filter(FasUserRole.portfolio_id == pid)
        .all()
    )


def seed_roles(db: Session):
    """確保預設角色存在（idempotent）。"""
    defaults = [
        ("SYSTEM_ADMIN", "系統管理員"),
        ("PORTFOLIO_MANAGER", "投資組合管理員"),
        ("TRADER", "交易員"),
        ("ANALYST", "分析師"),
    ]
    changed = False
    for code, name in defaults:
        if not db.query(FasRole).filter(FasRole.code == code).first():
            db.add(FasRole(code=code, name=name))
            changed = True
    if changed:
        db.commit()


def ensure_system_admin(user_id: str, db: Session):
    """Bootstrap：若尚未指派則授予 SYSTEM_ADMIN（idempotent）。"""
    grant_role(str(user_id), "SYSTEM_ADMIN", None, "system_init", db)
