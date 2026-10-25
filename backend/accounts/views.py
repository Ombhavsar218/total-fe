from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from config.api import paginate

from .models import Role
from .permissions import IsSuperAdmin
from .serializers import ChangePasswordSerializer, LoginSerializer, UserSerializer

User = get_user_model()


def _token_pair(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["email"] = user.email
    refresh["full_name"] = user.full_name
    return str(refresh.access_token), str(refresh)


def _session_payload(user, access, refresh):
    return {
        "success": True,
        "token": access,
        "access": access,
        "refresh": refresh,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        },
    }


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower().strip()
        password = serializer.validated_data["password"]

        user = User.objects.filter(email=email).first()
        if user is None or not user.check_password(password):
            return Response(
                {"success": False, "message": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response(
                {
                    "success": False,
                    "message": "Your account has been deactivated. Please contact your administrator.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        access, refresh = _token_pair(user)
        return Response(_session_payload(user, access, refresh))


class MeView(APIView):
    def get(self, request):
        user = request.user
        return Response(
            {
                "success": True,
                "user": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                    "is_active": user.is_active,
                    "created_at": user.created_at,
                    "updated_at": user.updated_at,
                },
            }
        )


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["current_password"]):
            return Response(
                {"success": False, "message": "Your current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password", "updated_at"])
        return Response({"success": True, "message": "Password updated successfully."})


class UserListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        qs = User.objects.all().order_by("full_name")
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(role__icontains=search)
            )
        role = request.query_params.get("role")
        if role and role != "ALL":
            qs = qs.filter(role=role)
        is_active = request.query_params.get("active")
        if is_active in {"true", "false"}:
            qs = qs.filter(is_active=is_active == "true")
        return paginate(request, qs, UserSerializer)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"success": True, "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get_object(self, pk):
        return User.objects.filter(pk=pk).first()

    def get(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({"success": False, "message": "User not found."}, status=404)
        return Response({"success": True, "user": UserSerializer(user).data})

    def put(self, request, pk):
        return self._update(request, pk, partial=False)

    def patch(self, request, pk):
        return self._update(request, pk, partial=True)

    def _update(self, request, pk, partial):
        user = self.get_object(pk)
        if not user:
            return Response({"success": False, "message": "User not found."}, status=404)

        if user.pk == request.user.pk:
            if request.data.get("is_active") is False:
                return Response(
                    {"success": False, "message": "You cannot deactivate your own account."},
                    status=400,
                )
            if "role" in request.data and request.data["role"] != Role.SUPERADMIN:
                return Response(
                    {"success": False, "message": "You cannot change your own Super Admin role."},
                    status=400,
                )

        serializer = UserSerializer(user, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "user": serializer.data})

    def delete(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({"success": False, "message": "User not found."}, status=404)
        if user.pk == request.user.pk:
            return Response(
                {"success": False, "message": "You cannot delete your own account."},
                status=400,
            )
        from django.db.models import ProtectedError

        try:
            user.delete()
        except ProtectedError:
            return Response(
                {
                    "success": False,
                    "message": "This user has shops, stock, bills or purchase orders and cannot be deleted.",
                },
                status=400,
            )
        return Response({"success": True, "message": "User deleted."})


class ToggleUserStatusView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, pk):
        user = User.objects.filter(pk=pk).first()
        if not user:
            return Response({"success": False, "message": "User not found."}, status=404)
        if user.pk == request.user.pk:
            return Response(
                {"success": False, "message": "You cannot change your own account status."},
                status=400,
            )
        user.is_active = not user.is_active
        user.save(update_fields=["is_active", "updated_at"])
        return Response(
            {
                "success": True,
                "message": "User activated." if user.is_active else "User deactivated.",
                "user": UserSerializer(user).data,
            }
        )
