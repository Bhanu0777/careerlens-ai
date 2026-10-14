import unittest

from fastapi.testclient import TestClient

from app.main import app


class CareerApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_analyze_endpoint_returns_explainable_evidence(self):
        response = self.client.post(
            "/api/career/analyze",
            json={
                "target_role": "Python Backend Developer",
                "candidate_skills": ["Python", "FastAPI", "SQL"],
                "job_requirements": ["Python", "FastAPI", "Docker", "SQL"],
                "market_skills": {"Docker": 90, "Python": 95},
                "candidate_experience": "0-1 years",
                "required_experience": "0-2 years",
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["fit"]["score"], 85)
        self.assertEqual(payload["fit"]["missing_skills"], ["Docker"])
        self.assertEqual(payload["gaps"][0]["name"], "Docker")
        self.assertIn("not guaranteed", payload["action_plan"]["disclaimer"].lower())


if __name__ == "__main__":
    unittest.main()
