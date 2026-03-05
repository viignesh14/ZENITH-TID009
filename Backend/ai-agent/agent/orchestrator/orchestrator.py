from ..candidate_evaluation.evaluation import CandidateEvaluationAgent
from ..fairness_compliance.compliance import FairnessComplianceAgent
from ..compensation_negotiation.compensation import CompensationNegotiationAgent
from ..workforce_strategy.strategy import WorkforceStrategyAgent
from ..talent_management.talent import TalentManagementAgent

class MainOrchestratorAgent:
    """
    Main Agent (Orchestrator)
    Purpose: Coordination only. Understands requests, breaks into subtasks,
    calls sub-agents, and merges their outputs.
    """

    def __init__(self):
        self.name = "Main Orchestrator"
        self.candidate_evaluator = CandidateEvaluationAgent()
        self.compliance_officer = FairnessComplianceAgent()
        self.compensation_planner = CompensationNegotiationAgent()
        self.strategy_planner = WorkforceStrategyAgent()
        self.talent_manager = TalentManagementAgent()

    def process_request(self, request_type, data):
        """
        Main entry point for handling requests.
        Types: 'hire', 'promote', 'plan_workforce', 'manage_talent'
        """
        print(f"[{self.name}] Received request: {request_type}")
        
        if request_type == 'hire':
            return self._handle_hiring_flow(data)
        elif request_type == 'promote':
            return self._handle_promotion_flow(data)
        elif request_type == 'plan_workforce':
            return self._handle_strategy_flow(data)
        elif request_type == 'manage_talent':
            return self._handle_talent_flow(data)
        else:
            return {"error": "Unknown request type"}

    def _handle_hiring_flow(self, data):
        """Coordinates hiring subtasks."""
        print(f"[{self.name}] Orchestrating hiring process...")
        
        # 1. Evaluate Candidate
        evaluation = self.candidate_evaluator.evaluate(data['candidate'], data['job'])
        
        # 2. Check Fairness
        fairness = self.compliance_officer.audit(evaluation)
        
        # 3. Create Compensation Plan
        compensation = self.compensation_planner.create_plan(evaluation)
        
        return {
            "status": "Hiring decision ready",
            "evaluation_summary": evaluation,
            "fairness_report": fairness,
            "compensation_offer": compensation
        }

    def _handle_promotion_flow(self, data):
        """Coordinates promotion subtasks."""
        print(f"[{self.name}] Orchestrating promotion process...")
        
        # 1. Check Readiness (Talent Management)
        readiness = self.talent_manager.predict_promotion_readiness(data['employee'], data['target_role'])
        
        # 2. Strategy Check (Workforce Strategy)
        strategy = self.strategy_planner.optimize_team_composition(data['target_role'])
        
        # 3. Salary Adjustment (Compensation)
        salary = self.compensation_planner.calculate_promotion_change(data['employee']['id'], data['target_role'])
        
        return {
            "status": "Promotion assessment complete",
            "readiness": readiness,
            "team_impact": strategy,
            "salary_adjustment": salary
        }

    def _handle_strategy_flow(self, data):
        """Coordinates company-level strategy tasks."""
        print(f"[{self.name}] Orchestrating workforce strategy...")
        return self.strategy_planner.generate_strategy(data)

    def _handle_talent_flow(self, data):
        """Coordinates employee growth and retention tasks."""
        print(f"[{self.name}] Orchestrating talent management...")
        return self.talent_manager.manage(data)
