import json
from django.conf import settings
from google import genai

class TalentManagementAgent:
    """
    Sub-Agent 5: Talent Management Agent (Lifecycle Brain)
    Purpose: Manage employees after hiring. Suggests growth, courses, and tracks retention.
    """

    def __init__(self):
        self.name = "Talent Management Agent"
        # Initialise client inside the agent to pick up dynamic API key changes
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def manage(self, employee_data):
        """
        Main entry point for talent management lifecycle.
        Uses AI to generate a growth roadmap, identify skill gaps, and suggest real courses.
        """
        role = employee_data.get("current_role", "Software Engineer")
        name = employee_data.get("name", "Employee")
        performance = employee_data.get("performance_history", "Excellent")

        prompt = f"""
        You are the HireNexus Talent Management AI. 
        Analyze the following employee/hired candidate data and provide a comprehensive career growth plan.

        Employee Name: {name}
        Hired Domain/Role: {role}
        Recent Performance Feedback: {performance}

        CRITICAL REQUIREMENT:
        Suggest 3 YouTube videos that are TIED DIRECTLY to the "{role}" domain. 
        ONLY suggest YouTube videos. NO Coursera, Udemy, or edX.

        Please provide a JSON response with the following fields:
        1. career_path_suggestions: (string) Specific long-term advisor for this role.
        2. promotion_readiness: (string) A realistic assessment of when and how they can move up.
        3. burnout_risk: (string) Low/Medium/High risk assessment based on role intensity.
        4. upskilling_summary: (string) A high-level summary of their learning plan.
        5. course_recommendations: (list of objects) Suggest 3 REAL YouTube videos from expert creators.
           Each object MUST have: "title", "platform" (must be "YouTube"), "focus_area", and "direct_url".
           The "direct_url" MUST be a real, clickable YouTube video link.
        6. identified_skill_gaps: (list) 3-4 specific technical or soft skills to improve.
        7. assigned_mentor_role: (string) A hypothetical mentor role that would help them most.

        Respond ONLY with the JSON object.
        """

        try:
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config={
                    'response_mime_type': 'application/json',
                }
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"[{self.name}] AI Error: {e}")
            # Fallback data if AI fails
            return {
                "career_path_suggestions": f"Deepen expertise in {role} and transition towards System Architecture.",
                "promotion_readiness": "Assessment in 6 months contingent on project leadership.",
                "burnout_risk": "Low",
                "upskilling_summary": f"Focus on mastering advanced {role} patterns via specialized video content.",
                "course_recommendations": [
                    {"title": f"Complete {role} Roadmap 2026", "platform": "YouTube", "focus_area": "Career Mastery", "direct_url": "https://www.youtube.com/results?search_query=" + role.replace(' ', '+') + "+roadmap"},
                    {"title": f"Advanced {role} Design Patterns", "platform": "YouTube", "focus_area": "Technical", "direct_url": "https://www.youtube.com/results?search_query=" + role.replace(' ', '+') + "+advanced+patterns"},
                    {"title": "System Design for " + role, "platform": "YouTube", "focus_area": "Architecture", "direct_url": "https://www.youtube.com/results?search_query=system+design+for+" + role.replace(' ', '+')}
                ],
                "identified_skill_gaps": ["Domain Optimization", "Scalable Patterns"],
                "assigned_mentor_role": "Principal Engineer / Tech Lead"
            }
