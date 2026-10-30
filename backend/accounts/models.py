from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager["User"]):
    use_in_migrations = True

    def create_user(self, email: str, password: str | None = None, **extra_fields) -> "User":
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")
        user = self.model(email=self.normalize_email(email).lower(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def get_by_natural_key(self, username: str) -> "User":
        # E-mail login is case-insensitive.
        return self.get(email__iexact=username)

    def create_superuser(self, email: str, password: str | None = None, **extra_fields) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Application user, identified by e-mail address."""

    email = models.EmailField("adresse e-mail", unique=True)
    display_name = models.CharField("nom affiché", max_length=80, blank=True)
    # Daily focus goal, used for the focus streak.
    focus_goal_minutes = models.PositiveSmallIntegerField(
        "objectif de concentration (min/jour)",
        default=120,
        validators=[MinValueValidator(10), MaxValueValidator(720)],
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self) -> str:
        return self.email
