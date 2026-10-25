from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Role


class IsSuperAdmin(BasePermission):
    """User management is reserved for SUPERADMIN accounts."""

    message = "Only a Super Admin can manage users."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.SUPERADMIN)


class IsManagement(BasePermission):
    """Owner-level access (OWNER or SUPERADMIN)."""

    message = "Only an Owner or Super Admin can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in {Role.OWNER, Role.SUPERADMIN})


class ReadOnlyForApiRole(BasePermission):
    """The API role is a machine/integration account: read-only everywhere."""

    message = "API accounts have read-only access."

    def has_permission(self, request, view):
        user = request.user
        if user and user.is_authenticated and user.role == Role.API:
            return request.method in SAFE_METHODS
        return True
