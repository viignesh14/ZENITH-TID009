from google import genai
from django.conf import settings
import json

class CompensationNegotiationAgent:
    """
    Sub-Agent 3: Compensation & Negotiation Agent
    Purpose: Decide offers and salary logic using AI reasoning.
    """

    def __init__(self):
        self.name = "Compensation Agent"
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def benchmark_salary(self, role, location, experience_level):
        """Fetches market salary benchmarks for a specific role and region."""
        print(f"[{self.name}] Benchmarking salary for {role} in India...")
        return {"min": "₹6L", "median": "₹12L", "max": "₹22L"}

    def generate_offer(self, candidate_id, budget_constraints):
        """Constructs a formal job offer package."""
        print(f"[{self.name}] Generating offer for candidate {candidate_id}...")
        return {"base_salary": "₹10,00,000", "bonus": "₹1,00,000", "equity": "ESOPs"}

    def negotiate(self, current_offer, counter_offer, strategy):
        """
        Gemini AI Logic to decide whether to accept or decline a counter-offer.
        """
        print(f"[{self.name}] AI Negotiating: Current {current_offer} vs Counter {counter_offer}")
        
        prompt = f"""
        You are the HireNexus Compensation Agent, a direct, conversational, and professional AI recruiter. 
        A candidate has submitted a counter-offer for a job role.
        
        CONTEXT:
        Original Offer: {current_offer}
        Candidate Counter-Offer: {counter_offer}
        Initial AI Insights & Strategy: {strategy}
        
        TASK:
        Evaluate the counter-offer based on the candidate's skills and experience mentioned in the 'Strategy'.
        1. If you accept: Say "This is perfect, I will hire you at this rate."
        2. If you want to haggle: You MUST explain WHY using their experience level. 
           Example: "Based on our analysis, for your experience level, {current_offer} is a highly competitive package. Your request of {counter_offer} is significantly higher than our budget for this role. Please quote a more reasonable amount or consider our latest offer."
        3. Specific instruction: Use phrases like "for your experience [amount] is the best package" and "[requested amount] is very huge for your experience so please quote lesser amount."
        
        TONE:
        Direct, Recruit-like, and Conversational.
        
        RETURN EXACT JSON:
        {{
            "decision": "accept" | "counter" | "reject",
            "new_offer": "string (propose a specific INR amount like '₹12.5L' if decision is counter, else null)",
            "reason": "Conversational message to candidate (e.g., 'For your experience 3.7L is the best package...', etc.)"
        }}
        """

        try:
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            
            clean_text = response.text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:].strip()
            if clean_text.startswith("```"):
                clean_text = clean_text[3:].strip()
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3].strip()
            
            return json.loads(clean_text)
        except Exception as e:
            print(f"[{self.name}] AI Error (Fallback to Rules): {e}")
            
            # --- Smart Rule-Based Fallback ---
            try:
                def get_val(s):
                    import re
                    match = re.search(r'(\d+\.?\d*)', str(s))
                    return float(match.group(1)) if match else 0

                curr = get_val(current_offer)
                count = get_val(counter_offer)
                
                if count <= 0: return {"decision": "counter", "new_offer": current_offer, "reason": "I need a specific amount to evaluate your request."}

                ratio = count / curr if curr > 0 else 1.5
                
                if ratio <= 1.15: # Within 15% increase
                    return {
                        "decision": "accept", 
                        "new_offer": counter_offer, 
                        "reason": f"This is perfect, I will hire you at this rate of {counter_offer}."
                    }
                else:
                    # Suggest a middle ground OR stick to current but with the requested message
                    mid = round(curr + (count - curr) * 0.3, 1)
                    mid_str = f"₹{mid}L"
                    return {
                        "decision": "counter", 
                        "new_offer": mid_str, 
                        "reason": f"Based on our evaluation, for your experience {curr if curr > 0 else 3.5}L is the best package we can offer. Your request of {counter_offer} is very huge for your experience level, so please quote a lesser amount or accept our adjusted offer of {mid_str}."
                    }
            except:
                return {"decision": "counter", "new_offer": current_offer, "reason": "I am reviewing your request. Please wait a moment while I check our budget."}

    def create_plan(self, details):
        """Main entry point for compensation planning."""
        plan = {
            "salary_range": "₹8L - ₹14L",
            "negotiation_strategy": "Highlight the annual performance bonus and health insurance for family.",
            "compensation_plan": "Fixed Base + 10% Performance Variable"
        }
        return plan
