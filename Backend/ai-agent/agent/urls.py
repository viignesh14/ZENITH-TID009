from django.urls import path
from .views import (
    evaluate_candidate,
    hr_confirm_candidate,
    hr_dashboard_candidates,
    toggle_autopilot,
    update_threshold,
    vacancy_list_create,
    delete_vacancy,
    candidate_applications,
    get_workforce_strategy,
    get_talent_management,
    candidate_negotiate,
)

urlpatterns = [
    path("evaluate/", evaluate_candidate),
    path("hr-confirm/", hr_confirm_candidate),
    path("hr-dashboard/", hr_dashboard_candidates),
    path("toggle-autopilot/", toggle_autopilot),
    path("update-threshold/", update_threshold),
    path("vacancies/", vacancy_list_create),
    path("vacancies/<int:pk>/", delete_vacancy),
    path("candidate-applications/", candidate_applications),
    path("get-strategy/", get_workforce_strategy),
    path("get-talent/", get_talent_management),
    path("candidate-negotiate/", candidate_negotiate),
]