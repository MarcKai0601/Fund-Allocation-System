from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_system_admin, UserSession
from app.models.fas_role import FasRole
from app.models.fas_user_role import FasUserRole
from app.services import rbac_service

router = APIRouter(prefix="/api/rbac", tags=["RBAC (角色管理)"])


class GrantRoleRequest(BaseModel):
    role_code: str
    portfolio_id: Optional[int] = None


def _fmt(ur: FasUserRole, role_code: str, role_name: str = "") -> dict:
    return {
        "id": ur.id,
        "user_id": ur.user_id,
        "role_code": role_code,
        "role_name": role_name,
        "portfolio_id": ur.portfolio_id,
        "granted_by": ur.granted_by,
        "created_at": ur.created_at.isoformat() if ur.created_at else None,
    }


@router.get("/roles", summary="列出所有 FAS 角色定義")
def list_roles(_: UserSession = Depends(require_system_admin), db: Session = Depends(get_db)):
    roles = db.query(FasRole).all()
    return [{"id": r.id, "code": r.code, "name": r.name} for r in roles]


@router.get("/assignments", summary="列出所有角色指派")
def list_assignments(_: UserSession = Depends(require_system_admin), db: Session = Depends(get_db)):
    results = rbac_service.get_all_role_assignments(db)
    return [_fmt(ur, code, name) for ur, code, name in results]


@router.get("/users/{user_id}/roles", summary="查詢指定使用者的角色")
def get_user_roles(
    user_id: str,
    _: UserSession = Depends(require_system_admin),
    db: Session = Depends(get_db),
):
    results = (
        db.query(FasUserRole, FasRole)
        .join(FasRole, FasRole.id == FasUserRole.role_id)
        .filter(FasUserRole.user_id == user_id)
        .all()
    )
    return [_fmt(ur, role.code, role.name) for ur, role in results]


@router.post("/users/{user_id}/roles", status_code=201, summary="指派角色給使用者")
def grant_role(
    user_id: str,
    req: GrantRoleRequest,
    admin: UserSession = Depends(require_system_admin),
    db: Session = Depends(get_db),
):
    try:
        result = rbac_service.grant_role(user_id, req.role_code, req.portfolio_id, admin.user_id, db)
        role = db.query(FasRole).filter(FasRole.id == result.role_id).first()
        return _fmt(result, role.code, role.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/users/{user_id}/roles/{assignment_id}", summary="撤銷角色指派")
def revoke_role(
    user_id: str,
    assignment_id: int,
    _: UserSession = Depends(require_system_admin),
    db: Session = Depends(get_db),
):
    rbac_service.revoke_role(assignment_id, db)
    return {"detail": "Role revoked"}


@router.get("/portfolios/{pid}/members", summary="查詢 Portfolio 的所有成員")
def get_portfolio_members(
    pid: int,
    _: UserSession = Depends(require_system_admin),
    db: Session = Depends(get_db),
):
    results = rbac_service.get_portfolio_members(pid, db)
    return [
        {
            "user_id": ur.user_id,
            "role_code": code,
            "portfolio_id": ur.portfolio_id,
            "granted_by": ur.granted_by,
            "created_at": ur.created_at.isoformat() if ur.created_at else None,
        }
        for ur, code in results
    ]
