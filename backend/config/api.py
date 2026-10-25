"""Small helpers shared by API views."""
from datetime import date, datetime

from django.core.paginator import Paginator
from django.utils import timezone
from rest_framework.response import Response

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100


def _positive_int(value, default, maximum=None):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    if number < 1:
        return default
    if maximum is not None:
        return min(number, maximum)
    return number


def paginate(
    request, queryset, serializer_class, *, context=None, default_size=DEFAULT_PAGE_SIZE, extra=None
):
    page_number = _positive_int(request.query_params.get("page"), 1)
    page_size = _positive_int(
        request.query_params.get("page_size"), default_size, MAX_PAGE_SIZE
    )
    paginator = Paginator(queryset, page_size)
    page = paginator.get_page(page_number)
    data = serializer_class(page.object_list, many=True, context=context or {}).data
    body = {
        "success": True,
        "count": paginator.count,
        "page": page.number,
        "page_size": page_size,
        "total_pages": paginator.num_pages,
        "results": data,
    }
    if extra:
        body.update(extra)
    return Response(body)


def parse_date(value, default=None):
    """Parse an ISO date (YYYY-MM-DD); return `default` when absent/invalid."""
    if not value:
        return default
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return default


def today():
    return timezone.localdate()


def ok(payload=None, **extra):
    body = {"success": True}
    if payload:
        body.update(payload)
    body.update(extra)
    return Response(body)
