import sys
import os

# Add the agent directory to path so we can import modules
sys.path.append(r"c:\Users\Dell\Desktop\HireNexus\Backend\ai-agent")

try:
    from agent.orchestrator import MainOrchestratorAgent
    
    orchestrator = MainOrchestratorAgent()
    
    # Test Hiring Flow
    print("--- Testing Hiring Flow ---")
    mock_hiring_data = {
        "candidate": {"name": "John Doe", "experience": "5 years"},
        "job": {"title": "Python Developer", "salary_range": "90k-120k"}
    }
    result = orchestrator.process_request('hire', mock_hiring_data)
    print("Hiring Flow Result:", result)
    print("\n")

    # Test Promotion Flow
    print("--- Testing Promotion Flow ---")
    mock_promotion_data = {
        "employee": {"id": 101, "name": "Jane Smith", "current_role": "Junior Mid"},
        "target_role": "Senior Developer"
    }
    promo_result = orchestrator.process_request('promote', mock_promotion_data)
    print("Promotion Flow Result:", promo_result)
    
except Exception as e:
    print(f"Error during test: {e}")
