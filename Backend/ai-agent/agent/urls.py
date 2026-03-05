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
    generate_mock_interview,
    submit_mock_interview,
    get_mock_interview_result,
    get_candidate_interview_scores,
    delete_mock_interview,
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
    # Sub-Agent 6: Mock Interview with AI
    path("mock-interview/generate/", generate_mock_interview),
    path("mock-interview/submit/", submit_mock_interview),
    path("mock-interview/result/", get_mock_interview_result),
    path("mock-interview/hr-scores/", get_candidate_interview_scores),
    path("mock-interview/<int:pk>/delete/", delete_mock_interview),
]