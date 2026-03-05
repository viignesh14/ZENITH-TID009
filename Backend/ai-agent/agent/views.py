import json
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from google import genai
from .models import Candidate, Vacancy, MockInterview

@api_view(["POST"])
def evaluate_candidate(request):
    # Initialize client inside the view to pick up dynamic API key changes
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    try:
        print("DATA:", request.data)
        print("FILES:", request.FILES)
        vacancy_id = request.data.get("vacancy_id")
        name = request.data.get("name")
        email = request.data.get("email")
        resume_file = request.FILES.get("resume_file")

        print(request.data)
        print(request.FILES)
        # Validation
        if not vacancy_id or not name or not email or not resume_file:
            return Response(
                {"error": "vacancy_id, name, email and resume_file are required"},
                status=400,
            )

        # Check if already applied (allow re-applying if previously rejected or fired)
        if Candidate.objects.filter(vacancy_id=vacancy_id, email=email).exclude(status__in=["fired", "rejected", "ai_rejected"]).exists():
            return Response(
                {"error": "You already have an active application for this role."},
                status=400,
            )

        # Extract resume text
        from .utils.resume_parser import extract_text_from_pdf
        resume_text = extract_text_from_pdf(resume_file)
        print(f"RESUME TEXT EXTRACTED: {len(resume_text)} chars")

        # Fetch vacancy
        try:
            vacancy = Vacancy.objects.get(id=vacancy_id)
        except Vacancy.DoesNotExist:
            return Response({"error": "Invalid vacancy_id"}, status=404)

        # -------------------------------
        # CONSOLIDATED AI AGENT EVALUATION (Prevents 429 Errors)
        # -------------------------------
        from .utils.github_checker import extract_username_from_url, get_github_profile
        
        # We'll do a quick pass to extract basic info if needed, but the primary logic is one call.
        super_agent_prompt = f"""
You are the HireNexus Orchestrator, an advanced multi-agent AI system.
You must perform four distinct roles and return a consolidated JSON response.

CONTEXT:
Job Role: {vacancy.title}
Job Description: {vacancy.description}
Requirements: {vacancy.required_skills}, {vacancy.experience_required} yrs exp

RESUME DATA:
{resume_text}

TASKS:
1. SCORING AGENT: Evaluate the candidate vs job requirements (score 0-100).
2. EXTRACTION AGENT: Find the GitHub profile URL.
3. COMPLIANCE AGENT: Analyze if this candidate evaluation is fair and unbiased.
4. NEGOTIATION AGENT: Suggest a base salary range and negotiation strategy based on skills.
5. VERIFICATION AGENT: Note any missing info or alignment between the data.

RETURN EXACT JSON FORMAT:
{{
    "overall": {{
        "score": number,
        "recommendation": "shortlisted" | "rejected",
        "reason": "text"
    }},
    "extraction": {{
        "github_url": "url or null"
    }},
    "insights": {{
        "strengths": ["list", "of", "strings"],
        "weaknesses": ["list", "of", "strings"],
        "fairness_report": "text reasoning"
    }},
    "compensation": {{
        "salary_range": "₹minL - ₹maxL",
        "negotiation_strategy": "text"
    }},
    "verification": {{
        "status": "verified" | "suspicious" | "mismatch",
        "confidence": number,
        "reason": "text"
    }}
}}
"""

        # Model Fallback Logic (Handles Quota Exhaustion)
        try:
            # Try 2.0/2.5 Flash first
            model_name = "gemini-2.5-flash"
            response = client.models.generate_content(
                model=model_name,
                contents=super_agent_prompt,
                config={"response_mime_type": "application/json"},
            )
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print("Primary model exhausted, switching to 2.0-flash fallback...")
                model_name = "gemini-2.0-flash"
                response = client.models.generate_content(
                    model=model_name,
                    contents=super_agent_prompt,
                    config={"response_mime_type": "application/json"},
                )
            else:
                raise e

        try:
            full_data = json.loads(response.text)
        except Exception:
            return Response({"error": "AI failed to return valid JSON format."}, status=500)

        # -------------------------------
        # POST-PROCESSING
        # -------------------------------
        github_url = full_data.get("extraction", {}).get("github_url")
        final_score = full_data.get("overall", {}).get("score", 0)
        
        # Localize Salary to INR (Ensures No Dollars)
        raw_salary = full_data.get("compensation", {}).get("salary_range", "₹8L - ₹12L")
        inr_salary = raw_salary.replace('$', '₹').replace('USD', 'LPA').replace('k', 'L')
        if '₹' not in inr_salary: inr_salary = f"₹{inr_salary}"
        
        # Autonomous Hiring Logic
        current_hires = Candidate.objects.filter(vacancy=vacancy, status="hired").count()
        if final_score >= vacancy.shortlist_threshold:
            status = "offered" if vacancy.autopilot_enabled else "hr_pending"
        else:
            status = "ai_rejected"

        # Save Candidate
        candidate = Candidate.objects.create(
            name=name, email=email, vacancy=vacancy, resume_file=resume_file,
            resume_text=resume_text, ai_score=final_score,
            ai_recommendation=full_data.get("overall", {}).get("recommendation"),
            status=status, github_url=github_url,
            verification_status=full_data.get("verification", {}).get("status"),
            verification_score=full_data.get("verification", {}).get("confidence"),
            verification_reason=full_data.get("verification", {}).get("reason"),
            strengths=", ".join(full_data.get("insights", {}).get("strengths", [])),
            weaknesses=", ".join(full_data.get("insights", {}).get("weaknesses", [])),
            fairness_report=full_data.get("insights", {}).get("fairness_report", ""),
            salary_suggestion=inr_salary,
            negotiation_strategy=full_data.get("compensation", {}).get("negotiation_strategy", ""),
            offered_salary=inr_salary.split('-')[0].replace('₹', '').replace('L', '').strip(),
        )

        return Response({
            "candidate_id": candidate.id,
            "status": candidate.status,
            "ai_score": candidate.ai_score,
            "verification_status": candidate.verification_status,
            "verification_reason": candidate.verification_reason,
            "strengths": candidate.strengths,
            "weaknesses": candidate.weaknesses,
            "fairness_report": candidate.fairness_report,
            "offered_salary": candidate.offered_salary.replace('₹', '').replace('L', '').strip() if candidate.offered_salary else None,
            "negotiation_history": candidate.negotiation_history,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e), "details": traceback.format_exc()}, status=500)


@api_view(["POST"])
def candidate_negotiate(request):
    candidate_id = request.data.get("candidate_id")
    counter_offer = request.data.get("counter_offer") # e.g. "$115k"
    action = request.data.get("action") # "accept" or "negotiate" or "reject"

    if not candidate_id:
        return Response({"error": "candidate_id required"}, status=400)

    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({"error": "Candidate not found"}, status=404)

    if action == "accept":
        candidate.status = "hired"
        candidate.negotiation_history = (candidate.negotiation_history or "") + f"\nCandidate accepted: {candidate.offered_salary}"
    elif action == "reject":
        candidate.status = "rejected"
        candidate.negotiation_history = (candidate.negotiation_history or "") + f"\nCandidate rejected offer."
    elif action == "negotiate":
        if not counter_offer:
            return Response({"error": "Counter offer value required for negotiation"}, status=400)
        
        # Save the candidate's last counter-offer
        candidate.candidate_counter_offer = counter_offer
        
        # Check if AI Autopilot is enabled for this vacancy
        if candidate.vacancy.autopilot_enabled:
            from .compensation_negotiation.compensation import CompensationNegotiationAgent
            agent = CompensationNegotiationAgent()
            
            result = agent.negotiate(candidate.offered_salary, counter_offer, candidate.negotiation_strategy)
            
            history_entry = f"\nCandidate countered with: {counter_offer}. AI response: {result['reason']}"
            candidate.negotiation_history = (candidate.negotiation_history or "") + history_entry
            
            if result['decision'] == 'accept':
                candidate.status = "hired"
                candidate.offered_salary = counter_offer
            elif result['decision'] == 'counter':
                candidate.offered_salary = result.get('new_offer', candidate.offered_salary)
            elif result['decision'] == 'reject':
                candidate.status = "rejected"
        else:
            # HR Manual Mode: Just record the counter-offer and wait for HR
            history_entry = f"\nCandidate submitted counter-offer: {counter_offer}. (Waiting for HR review)"
            candidate.negotiation_history = (candidate.negotiation_history or "") + history_entry
            # Status remains 'offered' so HR can see the update in their dashboard
    
    candidate.save()
    return Response({
        "status": candidate.status,
        "current_offer": candidate.offered_salary,
        "history": candidate.negotiation_history
    })


# ✅ ADD THIS BACK (THIS WAS MISSING)
@api_view(["POST"])
def hr_confirm_candidate(request):
    candidate_id = request.data.get("candidate_id")
    action = request.data.get("action")

    if not candidate_id or not action:
        return Response({"error": "candidate_id and action required"}, status=400)

    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({"error": "Candidate not found"}, status=404)

    if action == "approve" and candidate.status in ["hr_pending", "offered"]:
        # "Force Hire" at WHATEVER the current offered_salary is
        candidate.status = "hired"
        candidate.negotiation_history = (candidate.negotiation_history or "") + f"\n[Final] HR Force Hire at: {candidate.offered_salary}"
    elif action == "accept_counter" and candidate.status == "offered":
        # Hire at candidate's counter-offer amount
        if candidate.candidate_counter_offer:
            candidate.offered_salary = candidate.candidate_counter_offer
            candidate.status = "hired"
            candidate.negotiation_history = (candidate.negotiation_history or "") + f"\n[Final] HR accepted candidate counter-offer: {candidate.offered_salary}"
        else:
            return Response({"error": "No counter offer found"}, status=400)
    elif action == "reject" and candidate.status in ["hr_pending", "offered"]:
        candidate.status = "rejected"
    elif action == "fire" and candidate.status == "hired":
        candidate.status = "fired"
    elif action == "offer" and candidate.status == "hr_pending":
        candidate.status = "offered"
    elif action == "update_offer" and candidate.status == "offered":
        new_offer = request.data.get("new_offer")
        if new_offer:
            candidate.offered_salary = str(new_offer)
            candidate.candidate_counter_offer = None # Reset counter after HR responds
            candidate.negotiation_history = (candidate.negotiation_history or "") + f"\n[Update] HR adjusted offer: {new_offer}"
    elif action == "restore" and candidate.status in ["rejected", "ai_rejected", "fired"]:
        candidate.status = "hr_pending"
    elif action == "delete":
        candidate.delete()
        return Response({"message": "Candidate deleted", "candidate_id": candidate_id})
    else:
        return Response({"error": f"Invalid action {action} for status {candidate.status}"}, status=400)

    candidate.save()

    return Response({
        "candidate_id": candidate.id,
        "final_status": candidate.status
    })


@api_view(["GET"])
def hr_dashboard_candidates(request):
    vacancy_id = request.GET.get("vacancy_id")

    if not vacancy_id:
        return Response({"error": "vacancy_id required"}, status=400)

    try:
        vacancy = Vacancy.objects.get(id=vacancy_id)
    except Vacancy.DoesNotExist:
        return Response({"error": "Invalid vacancy_id"}, status=404)

    candidates = Candidate.objects.filter(
        vacancy=vacancy
    ).order_by("-ai_score")

    data = []
    for c in candidates:
        item = {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "status": c.status,
            "ai_score": c.ai_score,
            "verification_status": c.verification_status,
            "verification_score": c.verification_score,
            "verification_reason": c.verification_reason,
            "strengths": c.strengths,
            "weaknesses": c.weaknesses,
            "fairness_report": c.fairness_report,
            "salary_suggestion": c.salary_suggestion,
            "negotiation_strategy": c.negotiation_strategy,
            "ai_recommendation": c.ai_recommendation,
            "offered_salary": c.offered_salary,
            "candidate_counter_offer": c.candidate_counter_offer,
            "negotiation_history": c.negotiation_history,
            "resume_url": request.build_absolute_uri(c.resume_file.url) if c.resume_file else None,
            "talent_insights": None
        }
        
        # Sub-Agent 5 - Talent Management Insights for Hired Employees
        if c.status == "hired":
            from .talent_management.talent import TalentManagementAgent
            tm_agent = TalentManagementAgent()
            item["talent_insights"] = tm_agent.manage({"id": c.id, "name": c.name})
            
        data.append(item)

    return Response({
        "vacancy": vacancy.title,
        "autopilot_enabled": vacancy.autopilot_enabled,
        "shortlist_threshold": vacancy.shortlist_threshold,
        "max_hires": vacancy.max_hires,
        "current_hires": Candidate.objects.filter(
            vacancy=vacancy,
            status="hired"
        ).count(),
        "candidates": data
    })


@api_view(["POST"])
def toggle_autopilot(request):
    vacancy_id = request.data.get("vacancy_id")
    enabled = request.data.get("enabled")

    if vacancy_id is None or enabled is None:
        return Response({"error": "vacancy_id and enabled required"}, status=400)

    try:
        vacancy = Vacancy.objects.get(id=vacancy_id)
    except Vacancy.DoesNotExist:
        return Response({"error": "Invalid vacancy_id"}, status=404)

    vacancy.autopilot_enabled = bool(enabled)
    vacancy.save()

    return Response({
        "vacancy_id": vacancy.id,
        "autopilot_enabled": vacancy.autopilot_enabled
    })

@api_view(["POST"])
def update_threshold(request):
    vacancy_id = request.data.get("vacancy_id")
    threshold = request.data.get("threshold")

    if vacancy_id is None or threshold is None:
        return Response({"error": "vacancy_id and threshold required"}, status=400)

    try:
        vacancy = Vacancy.objects.get(id=vacancy_id)
    except Vacancy.DoesNotExist:
        return Response({"error": "Invalid vacancy_id"}, status=404)

    vacancy.shortlist_threshold = int(threshold)
    vacancy.save()

    return Response({
        "vacancy_id": vacancy.id,
        "shortlist_threshold": vacancy.shortlist_threshold
    })


@api_view(["GET", "POST"])
def vacancy_list_create(request):
    if request.method == "GET":
        vacancies = Vacancy.objects.all().order_by("-created_at")
        data = []
        for v in vacancies:
            data.append({
                "id": v.id,
                "title": v.title,
                "description": v.description,
                "required_skills": v.required_skills,
                "experience_required": v.experience_required,
                "max_hires": v.max_hires,
                "autopilot_enabled": v.autopilot_enabled,
                "shortlist_threshold": v.shortlist_threshold,
                "status": v.status,
            })
        return Response(data)

    elif request.method == "POST":
        data = request.data
        try:
            vacancy = Vacancy.objects.create(
                title=data.get("title"),
                description=data.get("description"),
                required_skills=data.get("required_skills"),
                experience_required=int(data.get("experience_required", 0)),
                max_hires=int(data.get("max_hires", 1)),
                shortlist_threshold=int(data.get("shortlist_threshold", 80)),
                autopilot_enabled=data.get("autopilot_enabled", False),
            )
            return Response({"id": vacancy.id, "title": vacancy.title}, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


@api_view(["DELETE"])
def delete_vacancy(request, pk):
    try:
        vacancy = Vacancy.objects.get(id=pk)
        vacancy.delete()
        return Response({"message": "Vacancy deleted successfully"}, status=200)
    except Vacancy.DoesNotExist:
        return Response({"error": "Vacancy not found"}, status=404)


@api_view(["GET"])
def candidate_applications(request):
    email = request.GET.get("email")
    if not email:
        return Response({"error": "email required"}, status=400)
    
    candidates = Candidate.objects.filter(email__iexact=email).order_by("-created_at")
    data = []
    for c in candidates:
        data.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "vacancy_title": c.vacancy.title,
            "status": c.status,
            "created_at": c.created_at,
            "ai_score": c.ai_score,
            "ai_recommendation": c.ai_recommendation,
            "offered_salary": c.offered_salary,
            "negotiation_history": c.negotiation_history,
        })
    return Response(data)


@api_view(["GET"])
def get_workforce_strategy(request):
    from .orchestrator.orchestrator import MainOrchestratorAgent
    orchestrator = MainOrchestratorAgent()
    
    # Mock some data for the macro view
    data = {"growth_projection": "15% expansion next quarter"}
    result = orchestrator.process_request('plan_workforce', data)
    return Response(result)


@api_view(["POST"])
def workforce_planning(request):
    """
    HR uploads a project/roadmap PDF.
    The agent reads current hired employees from the DB and the PDF,
    then returns AI-powered next-month hiring recommendations.
    """
    project_pdf = request.FILES.get("project_pdf")
    if not project_pdf:
        return Response({"error": "project_pdf file is required"}, status=400)

    # ── Extract PDF text ─────────────────────────────────────────────────────
    from .utils.resume_parser import extract_text_from_pdf
    try:
        pdf_text = extract_text_from_pdf(project_pdf)
    except Exception as e:
        return Response({"error": f"Failed to read PDF: {str(e)}"}, status=400)

    if not pdf_text or len(pdf_text.strip()) < 30:
        return Response({"error": "The uploaded PDF appears to be empty or unreadable."}, status=400)

    # ── Gather current workforce from DB ──────────────────────────────────────
    from django.db.models import Count
    hired_qs = (
        Candidate.objects
        .filter(status="hired")
        .values("vacancy__title")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    current_workforce = [
        {"role": row["vacancy__title"], "count": row["count"]}
        for row in hired_qs
    ]

    # ── Call AI Agent ─────────────────────────────────────────────────────────
    from .workforce_strategy.strategy import WorkforceStrategyAgent
    agent = WorkforceStrategyAgent()
    try:
        result = agent.analyse_workforce_plan(
            project_pdf_text=pdf_text,
            current_workforce=current_workforce,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": f"AI analysis failed: {str(e)}"}, status=500)

    return Response({
        "current_workforce": current_workforce,
        "analysis": result,
    })

@api_view(["GET"])
def get_talent_management(request):
    email = request.GET.get("email")
    if not email:
        return Response({"error": "email required"}, status=400)
    
    # In a real app we'd check if status is hired, but for demo let's just find the candidate
    candidate = Candidate.objects.filter(email=email).first()
    if not candidate:
        return Response({"error": "No candidate found for this email"}, status=404)

    from .orchestrator.orchestrator import MainOrchestratorAgent
    orchestrator = MainOrchestratorAgent()

    data = {
        "employee_id": candidate.id,
        "name": candidate.name,
        "current_role": candidate.vacancy.title,
        "performance_history": "Exceeds Expectations"
    }
    
    result = orchestrator.process_request('manage_talent', data)
    return Response(result)


# ==============================================================================
# SUB-AGENT 6: MOCK INTERVIEW WITH AI
# ==============================================================================

@api_view(["POST"])
def generate_mock_interview(request):
    """
    Called automatically when HR creates a vacancy OR when a candidate requests.
    Generates 5 AI-tailored interview questions for a vacancy domain.
    """
    vacancy_id = request.data.get("vacancy_id")
    candidate_email = request.data.get("candidate_email", "").strip().lower()
    candidate_name = request.data.get("candidate_name", "Candidate")

    if not vacancy_id or not candidate_email:
        return Response({"error": "vacancy_id and candidate_email are required"}, status=400)

    try:
        vacancy = Vacancy.objects.get(id=vacancy_id)
    except Vacancy.DoesNotExist:
        return Response({"error": "Vacancy not found"}, status=404)

    # Check if a pending interview already exists for this candidate+vacancy
    existing = MockInterview.objects.filter(
        vacancy=vacancy,
        candidate_email=candidate_email,
        status="pending"
    ).first()
    if existing:
        return Response({
            "interview_id": existing.id,
            "questions": json.loads(existing.questions),
            "vacancy_title": vacancy.title,
            "status": "pending",
            "message": "Existing interview session found."
        })

    # Generate questions via AI agent
    from .mock_interview.interview import MockInterviewAgent
    agent = MockInterviewAgent()
    try:
        questions = agent.generate_questions(
            vacancy_title=vacancy.title,
            required_skills=vacancy.required_skills,
            experience_required=vacancy.experience_required
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": f"AI question generation failed: {str(e)}"}, status=500)

    interview = MockInterview.objects.create(
        vacancy=vacancy,
        candidate_email=candidate_email,
        candidate_name=candidate_name,
        questions=json.dumps(questions),
        status="pending",
    )

    return Response({
        "interview_id": interview.id,
        "questions": questions,
        "vacancy_title": vacancy.title,
        "status": "pending",
        "message": "Mock interview created successfully."
    }, status=201)


@api_view(["POST"])
def submit_mock_interview(request):
    """
    Candidate submits their answers. AI evaluates and returns a score report.
    """
    interview_id = request.data.get("interview_id")
    answers = request.data.get("answers")  # List of {question, answer}

    if not interview_id or not answers:
        return Response({"error": "interview_id and answers are required"}, status=400)

    try:
        interview = MockInterview.objects.get(id=interview_id)
    except MockInterview.DoesNotExist:
        return Response({"error": "Interview not found"}, status=404)

    if interview.status == "completed":
        # Return existing results
        return Response({
            "interview_id": interview.id,
            "status": "completed",
            "overall_score": interview.overall_score,
            "grade": interview.grade,
            "evaluation_report": json.loads(interview.evaluation_report),
        })

    # Evaluate with AI
    from .mock_interview.interview import MockInterviewAgent
    agent = MockInterviewAgent()
    try:
        report = agent.evaluate_answers(
            vacancy_title=interview.vacancy.title,
            required_skills=interview.vacancy.required_skills,
            questions_and_answers=answers
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": f"AI evaluation failed: {str(e)}"}, status=500)

    from django.utils import timezone
    interview.answers = json.dumps(answers)
    interview.overall_score = report.get("overall_score", 0)
    interview.grade = report.get("grade", "N/A")
    interview.evaluation_report = json.dumps(report)
    interview.status = "completed"
    interview.completed_at = timezone.now()
    interview.save()

    return Response({
        "interview_id": interview.id,
        "status": "completed",
        "overall_score": interview.overall_score,
        "grade": interview.grade,
        "evaluation_report": report,
    })


@api_view(["GET"])
def get_mock_interview_result(request):
    """
    Get a candidate's existing mock interview for a vacancy.
    Query params: ?candidate_email=...&vacancy_id=...
    """
    email = request.GET.get("candidate_email", "").strip().lower()
    vacancy_id = request.GET.get("vacancy_id")

    if not email:
        return Response({"error": "candidate_email required"}, status=400)

    qs = MockInterview.objects.filter(candidate_email=email)
    if vacancy_id:
        qs = qs.filter(vacancy_id=vacancy_id)

    qs = qs.order_by("-created_at")
    result = []
    for mi in qs:
        result.append({
            "interview_id": mi.id,
            "vacancy_id": mi.vacancy_id,
            "vacancy_title": mi.vacancy.title,
            "status": mi.status,
            "overall_score": mi.overall_score,
            "grade": mi.grade,
            "questions": json.loads(mi.questions) if mi.questions else [],
            "evaluation_report": json.loads(mi.evaluation_report) if mi.evaluation_report else None,
            "created_at": mi.created_at,
            "completed_at": mi.completed_at,
        })
    return Response(result)


@api_view(["GET"])
def get_candidate_interview_scores(request):
    """
    HR view: Get all mock interview scores for candidates in a vacancy.
    Query params: ?vacancy_id=...
    """
    vacancy_id = request.GET.get("vacancy_id")
    if not vacancy_id:
        return Response({"error": "vacancy_id required"}, status=400)

    interviews = MockInterview.objects.filter(
        vacancy_id=vacancy_id,
        status="completed"
    ).order_by("-overall_score")

    result = []
    for mi in interviews:
        result.append({
            "interview_id": mi.id,
            "candidate_email": mi.candidate_email,
            "candidate_name": mi.candidate_name,
            "overall_score": mi.overall_score,
            "grade": mi.grade,
            "hiring_recommendation": json.loads(mi.evaluation_report).get("hiring_recommendation") if mi.evaluation_report else None,
            "summary": json.loads(mi.evaluation_report).get("summary") if mi.evaluation_report else None,
            "strengths": json.loads(mi.evaluation_report).get("strengths", []) if mi.evaluation_report else [],
            "areas_for_improvement": json.loads(mi.evaluation_report).get("areas_for_improvement", []) if mi.evaluation_report else [],
            "completed_at": mi.completed_at,
        })
    return Response(result)


@api_view(["DELETE"])
def delete_mock_interview(request, pk):
    """
    HR view: Permanently delete a mock interview result.
    """
    try:
        interview = MockInterview.objects.get(id=pk)
        interview.delete()
        return Response({"message": "Mock interview result deleted successfully"}, status=200)
    except MockInterview.DoesNotExist:
        return Response({"error": "Interview not found"}, status=404)


@api_view(["GET"])
def company_employees(request):
    """
    Company-wide employee overview.
    Returns total hired headcount + breakdown by domain (vacancy title)
    across ALL vacancies, not just one.
    """
    from django.db.models import Count

    total = Candidate.objects.filter(status="hired").count()

    # Per-domain breakdown (only domains with actual hires, sorted desc)
    domain_qs = (
        Candidate.objects
        .filter(status="hired")
        .values("vacancy__id", "vacancy__title", "vacancy__required_skills")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    hired_domains = [
        {
            "vacancy_id": row["vacancy__id"],
            "domain": row["vacancy__title"],
            "required_skills": row["vacancy__required_skills"],
            "employee_count": row["count"],
        }
        for row in domain_qs
    ]

    hired_ids = {d["vacancy_id"] for d in hired_domains}

    # Include vacancies with 0 hires so HR sees every domain
    zero_domains = [
        {
            "vacancy_id": v["id"],
            "domain": v["title"],
            "required_skills": v["required_skills"],
            "employee_count": 0,
        }
        for v in Vacancy.objects.all().values("id", "title", "required_skills")
        if v["id"] not in hired_ids
    ]

    all_domains = hired_domains + zero_domains  # hired ones already sorted desc first

    return Response({
        "total_employees": total,
        "total_vacancies": Vacancy.objects.count(),
        "total_open_vacancies": Vacancy.objects.filter(status="open").count(),
        "domains": all_domains,
    })
