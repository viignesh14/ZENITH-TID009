import json
from django.conf import settings
from google import genai


class MockInterviewAgent:
    """
    Sub-Agent 6: Mock Interview with AI
    Purpose: Generate domain-specific interview questions for a vacancy,
             evaluate candidate answers, and return a structured score report.
    """

    def __init__(self):
        self.name = "Mock Interview Agent"
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def _call_gemini(self, prompt):
        """Helper: call Gemini with JSON output mode and model fallback."""
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

    def generate_questions(self, vacancy_title: str, required_skills: str, experience_required: int) -> list:
        """
        Generate 5 domain-specific interview questions for the vacancy.
        Returns a list of question strings.
        """
        prompt = f"""
You are an expert technical interviewer at a top-tier tech company.

Job Role: {vacancy_title}
Required Skills: {required_skills}
Years Experience Required: {experience_required}

Generate exactly 5 interview questions for this role.
Questions should cover:
1. Core technical skill (domain-specific)
2. Problem-solving / system design
3. Behavioral / situational
4. Experience & past projects
5. Advanced concept or edge case

Return ONLY this exact JSON format:
{{
  "questions": [
    "Question 1 text here?",
    "Question 2 text here?",
    "Question 3 text here?",
    "Question 4 text here?",
    "Question 5 text here?"
  ]
}}
"""
        data = self._call_gemini(prompt)
        return data.get("questions", [])

    def evaluate_answers(self, vacancy_title: str, required_skills: str, questions_and_answers: list) -> dict:
        """
        Evaluate a candidate's answers to interview questions.
        questions_and_answers: list of {"question": str, "answer": str}
        Returns evaluation report with overall score.
        """
        qa_text = ""
        for i, qa in enumerate(questions_and_answers, 1):
            qa_text += f"\nQ{i}: {qa['question']}\nA{i}: {qa['answer']}\n"

        prompt = f"""
You are a senior technical interviewer evaluating a mock interview for the role of {vacancy_title}.
Required skills: {required_skills}

Here are the candidate's answers:
{qa_text}

Evaluate each answer thoroughly. Be fair but rigorous.

Return ONLY this exact JSON format:
{{
  "overall_score": <number 0-100>,
  "grade": "<A+|A|B+|B|C+|C|D|F>",
  "summary": "<2-3 sentence overall assessment>",
  "per_question": [
    {{
      "question": "<question text>",
      "answer": "<candidate answer>",
      "score": <0-20>,
      "feedback": "<specific feedback for this answer>",
      "ideal_points": "<key points the ideal answer should cover>"
    }}
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areas_for_improvement": ["<area 1>", "<area 2>", "<area 3>"],
  "hiring_recommendation": "<Strong Hire|Hire|Maybe|No Hire>",
  "recommended_resources": ["<resource 1>", "<resource 2>", "<resource 3>"]
}}
"""
        return self._call_gemini(prompt)
