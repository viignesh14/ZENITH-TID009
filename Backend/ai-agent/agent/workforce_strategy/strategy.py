import json
from django.conf import settings
from google import genai


class WorkforceStrategyAgent:
    """
    Sub-Agent 4: Workforce Planning Agent
    Purpose: Analyse the current workforce from the database and a project PDF
    uploaded by HR, then recommend how many employees to hire per domain for
    the next month.
    """

    def __init__(self):
        self.name = "Workforce Planning Agent"
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def _call_gemini(self, prompt: str) -> dict:
        """Call Gemini with JSON mode and model fallback."""
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"response_mime_type": "application/json"},
            )
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                response = self.client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                    config={"response_mime_type": "application/json"},
                )
            else:
                raise e
        return json.loads(response.text)

    def analyse_workforce_plan(self, project_pdf_text: str, current_workforce: list) -> dict:
        """
        Core method: given the project plan PDF text and the current workforce
        snapshot from the DB, return hiring recommendations for next month.

        current_workforce: list of dicts like
            [{"role": "Frontend Engineer", "count": 3}, ...]
        """
        workforce_summary = "\n".join(
            f"  - {w['role']}: {w['count']} employee(s)" for w in current_workforce
        ) or "  No employees currently hired."

        total_employees = sum(w['count'] for w in current_workforce)

        prompt = f"""
You are the HireNexus Workforce Planning AI — a strategic HR analyst.

Your job is to read a company project/roadmap document and the current
employee headcount, then produce a concrete hiring recommendation for the
NEXT MONTH only.

=== CURRENT WORKFORCE (from live database) ===
Total hired employees: {total_employees}
Breakdown by role:
{workforce_summary}

=== PROJECT PLAN / ROADMAP DOCUMENT ===
{project_pdf_text[:6000]}

=== YOUR TASK ===
1. Understand the projects, timelines, and required skills in the document.
2. Compare against the current headcount.
3. Identify gaps: what roles/skills are missing or understaffed?
4. Output a precise hiring plan for NEXT MONTH only.

Return ONLY this exact JSON (no extra text):
{{
  "executive_summary": "<2-3 sentence overview of the workforce situation>",
  "current_strength": {total_employees},
  "total_hires_needed_next_month": <integer>,
  "hiring_recommendations": [
    {{
      "domain": "<e.g. Backend Engineering / Data Science / DevOps / etc.>",
      "count": <integer>,
      "required_skills": ["skill1", "skill2"],
      "priority": "<Critical | High | Medium>",
      "reason": "<why this many in this domain>"
    }}
  ],
  "skill_gaps_identified": ["<gap1>", "<gap2>"],
  "risk_if_not_hired": "<what happens to projects if these hires are not made>",
  "suggested_timeline": "<e.g. Week 1: post JDs, Week 2-3: interviews, Week 4: onboarding>",
  "additional_notes": "<any other strategic advice>"
}}
"""
        return self._call_gemini(prompt)

    # ── Legacy stub kept for backward compatibility with orchestrator ──────────
    def generate_strategy(self, data):
        return {
            "hiring_plan": "Upload a project PDF to get AI-powered hiring recommendations.",
            "skill_shortage_alerts": [],
            "workforce_roadmap": "Use the Workforce Planning tab to analyse your project needs."
        }

    def forecast_hiring_needs(self, growth_projections):
        return {"engineers_needed": 0, "product_managers_needed": 0}

    def detect_skill_gaps(self, current_census, industry_trends):
        return []

    def recommend_hiring_vs_training(self, gap_analysis):
        return {}

    def optimize_team_composition(self, project_requirements):
        return {}
