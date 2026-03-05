from django.db import models


class Vacancy(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("closed", "Closed"),
    ]

    
    title = models.CharField(max_length=255)
    description = models.TextField()
    required_skills = models.TextField()
    experience_required = models.IntegerField()
    
    max_hires = models.IntegerField(default=2)
    autopilot_enabled = models.BooleanField(default=False)
    shortlist_threshold = models.IntegerField(default=80)

    status = models.CharField(
        max_length=20,  
        choices=STATUS_CHOICES,
        default="open",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    

    def __str__(self):
        return self.title


class Candidate(models.Model):

    VERIFICATION_CHOICES = [
    ("verified", "Verified"),
    ("suspicious", "Suspicious"),
    ("mismatch", "Mismatch"),
]

    github_url = models.URLField(blank=True, null=True)

    verification_status = models.CharField(
    max_length=20,
    choices=VERIFICATION_CHOICES,
    blank=True,
    null=True
)

    verification_score = models.IntegerField(blank=True, null=True)

    verification_reason = models.TextField(blank=True, null=True)

    STATUS_CHOICES = [
        ("applied", "Applied"),
        ("ai_rejected", "AI Rejected"),
        ("hr_pending", "HR Pending"),
        ("offered", "Offer Received"),
        ("hired", "Hired"),
        ("rejected", "Rejected"),
        ("fired", "Fired"),
    ]

    name = models.CharField(max_length=255)
    email = models.EmailField()

    resume_file = models.FileField(upload_to="resumes/")
    resume_text = models.TextField(blank=True, null=True)

    vacancy = models.ForeignKey(
        Vacancy,
        on_delete=models.CASCADE,
        related_name="candidates",
    )

    ai_score = models.IntegerField(blank=True, null=True)
    ai_recommendation = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="applied",
    )

    # Multi-Agent Insights
    strengths = models.TextField(blank=True, null=True)
    weaknesses = models.TextField(blank=True, null=True)
    fairness_report = models.TextField(blank=True, null=True)
    salary_suggestion = models.CharField(max_length=255, blank=True, null=True)
    negotiation_strategy = models.TextField(blank=True, null=True)

    # Negotiation Specifics
    offered_salary = models.CharField(max_length=100, blank=True, null=True)
    candidate_counter_offer = models.CharField(max_length=100, blank=True, null=True)
    negotiation_history = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.vacancy.title}"