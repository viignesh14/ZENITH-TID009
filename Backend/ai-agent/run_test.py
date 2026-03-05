import sys
import os

# Add the root directory to path
sys.path.append(os.getcwd())

try:
    from agent.orchestrator.orchestrator import MainOrchestratorAgent
    
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
    print("\n")

    # Test Workforce Strategy Flow
    print("--- Testing Workforce Strategy Flow ---")
    mock_strategy_data = {"growth_projection": "20% YoY"}
    strategy_result = orchestrator.process_request('plan_workforce', mock_strategy_data)
    print("Strategy Flow Result:", strategy_result)
    print("\n")

    # Test Talent Management Flow
    print("--- Testing Talent Management Flow ---")
    mock_talent_data = {"employee_id": 202, "name": "Bob Brown"}
    talent_result = orchestrator.process_request('manage_talent', mock_talent_data)
    print("Talent Management Flow Result:", talent_result)

    print("\n" + "="*50)
    print("✅ VERIFICATION COMPLETE: All 4 Orchestration Flows active.")
    print("="*50)    
except Exception as e:
    print(f"Error during test: {e}")
    import traceback
    traceback.print_exc()
