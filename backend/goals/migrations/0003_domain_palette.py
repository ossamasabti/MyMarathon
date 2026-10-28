"""Move domain colors to the validated categorical palette (step 5).

The first palette (step 2) had pairs that were hard to tell apart (orange/red) and two
low-chroma colors; each old color maps to the closest hue of the new palette.
"""

from django.db import migrations, models

LEGACY_TO_PALETTE = {
    "#1F5FD1": "#2A78D6",  # blue -> blue
    "#1E7A3E": "#008300",  # green -> green
    "#B42318": "#E34948",  # red -> red
    "#B54708": "#EB6834",  # orange -> orange
    "#7A2E9E": "#6250D6",  # purple -> violet
    "#0E7490": "#1BAF7A",  # teal -> aqua
    "#C11574": "#E87BA4",  # pink -> magenta
    "#4B5563": "#EDA100",  # gray (not a usable series color) -> yellow, the remaining slot
}


def forwards(apps, schema_editor):
    Domain = apps.get_model("goals", "Domain")
    for old, new in LEGACY_TO_PALETTE.items():
        Domain.objects.filter(color__iexact=old).update(color=new)


def backwards(apps, schema_editor):
    Domain = apps.get_model("goals", "Domain")
    for old, new in LEGACY_TO_PALETTE.items():
        Domain.objects.filter(color__iexact=new).update(color=old)


class Migration(migrations.Migration):
    dependencies = [
        ("goals", "0002_goal_achieved_at_habit_habitlog_review"),
    ]

    operations = [
        migrations.AlterField(
            model_name="domain",
            name="color",
            field=models.CharField(default="#2A78D6", max_length=7, verbose_name="couleur"),
        ),
        migrations.RunPython(forwards, backwards),
    ]
