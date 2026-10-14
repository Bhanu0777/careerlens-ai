import unittest

from app.services.career_intelligence import (
    calculate_fit_score,
    generate_action_plan,
    generate_gaps,
    normalize_skill,
)


class CareerIntelligenceTests(unittest.TestCase):
    def test_normalize_skill_groups_related_terms(self):
        self.assertEqual(normalize_skill("Large Language Models"), "LLMs")
        self.assertEqual(normalize_skill("React.js"), "React")
        self.assertEqual(normalize_skill("Generative AI"), "GenAI")

    def test_fit_score_is_deterministic_and_evidence_based(self):
        result = calculate_fit_score(
            candidate_skills=["Python", "FastAPI", "SQL"],
            job_requirements=["Python", "FastAPI", "Docker", "SQL"],
            candidate_experience="0-1 years",
            required_experience="0-2 years",
        )
        self.assertEqual(result["score"], 85)
        self.assertEqual(result["matched_skills"], ["Python", "FastAPI", "SQL"])
        self.assertEqual(result["missing_skills"], ["Docker"])
        self.assertEqual(result["breakdown"]["skill_match"], 75)

    def test_gap_generation_prioritizes_market_demand_and_candidate_gap(self):
        gaps = generate_gaps(
            candidate_skills={"Python"},
            market_skills={"Python": 95, "Docker": 90, "Cloud": 85},
            required_skills={"Python", "Docker", "Cloud"},
        )
        self.assertEqual([gap["name"] for gap in gaps], ["Docker", "Cloud"])
        self.assertEqual(gaps[0]["opportunity_score"], 91)

    def test_action_plan_is_generated_from_gaps_without_claiming_outcomes(self):
        plan = generate_action_plan(
            target_role="GenAI Engineer",
            gaps=[{"name": "Docker", "priority": "Critical"}],
        )
        self.assertEqual(plan["target_role"], "GenAI Engineer")
        self.assertEqual(len(plan["weeks"]), 4)
        self.assertIn("Docker", plan["weeks"][0]["tasks"][0]["description"])
        self.assertIn("not guaranteed", plan["disclaimer"].lower())


if __name__ == "__main__":
    unittest.main()
