from decimal import Decimal

import pytest

from goals.bibliography import make_citation_key, normalize_doi, to_bibtex
from goals.models import Reference

from .conftest import make_goal

URL = "/api/references/"
SVM = {
    "kind": "article",
    "title": "Support-vector networks",
    "authors": "Cortes, Corinna; Vapník, Vladimir",
    "year": 1995,
    "venue": "Machine Learning",
    "doi": "https://doi.org/10.1007/BF00994018",
    "tags": ["SVM", "classification", "svm "],
}


def test_normalize_doi():
    assert normalize_doi(" https://doi.org/10.1007/BF00994018 ") == "10.1007/bf00994018"
    assert normalize_doi("doi:10.1109/4235.996017") == "10.1109/4235.996017"
    assert normalize_doi("http://dx.doi.org/10.1/X") == "10.1/x"


def test_citation_key_skips_stop_words_and_accents_and_dedupes():
    assert make_citation_key("Vapník, Vladimir", 1995, "The nature of statistical learning", []) == "vapnik1995nature"
    assert make_citation_key("Kalyanmoy Deb", 2002, "A fast elitist algorithm", []) == "deb2002fast"
    assert make_citation_key("", None, "Le titre", []) == "reftitre"
    assert make_citation_key("Deb, K.", 2002, "Fast", ["deb2002fast"]) == "deb2002fastb"
    assert make_citation_key("Deb, K.", 2002, "Fast", ["deb2002fast", "deb2002fastb"]) == "deb2002fastc"


def test_bibtex_types_and_escaping():
    refs = [
        Reference(kind="conference", title="Pareto & SVM: 100% {fun}", authors="Doe, J.; Roe, R.", year=2020,
                  venue="GECCO", citation_key="doe2020pareto", tags=["SVM"]),
        Reference(kind="thesis", title="Ma thèse", authors="Sabti, O.", venue="ENSIAS", citation_key="sabti2029ma"),
    ]
    bib = to_bibtex(refs)
    assert "@inproceedings{doe2020pareto," in bib
    assert "title = {{Pareto \\& SVM: 100\\% \\{fun\\}}}" in bib
    assert "author = {Doe, J. and Roe, R.}" in bib
    assert "booktitle = {GECCO}" in bib
    assert "@phdthesis{sabti2029ma," in bib and "school = {ENSIAS}" in bib
    assert "year" not in bib.split("@phdthesis")[1]  # empty fields are left out
    assert to_bibtex([]) == ""


@pytest.mark.django_db
def test_create_normalizes_and_generates_key(api, user):
    response = api.post(URL, SVM, format="json")
    assert response.status_code == 201
    body = response.json()
    assert body["doi"] == "10.1007/bf00994018"
    assert body["citation_key"] == "cortes1995supportvector"
    assert body["tags"] == ["SVM", "classification"]
    assert body["status"] == "to_read" and body["read_at"] is None

    duplicate = api.post(URL, {**SVM, "doi": "10.1007/bf00994018"}, format="json")
    assert duplicate.status_code == 400
    assert "déjà" in duplicate.json()["doi"][0]

    same_key = api.post(URL, {**SVM, "doi": ""}, format="json").json()
    assert same_key["citation_key"] == "cortes1995supportvectorb"


@pytest.mark.django_db
def test_validation_messages(api):
    assert "doi" in api.post(URL, {**SVM, "doi": "pas-un-doi"}, format="json").json()
    assert "year" in api.post(URL, {**SVM, "doi": "", "year": 3000}, format="json").json()
    assert "notes" in api.post(URL, {**SVM, "doi": "", "notes": {"other": "x"}}, format="json").json()
    assert "tags" in api.post(URL, {**SVM, "doi": "", "tags": "SVM"}, format="json").json()


@pytest.mark.django_db
def test_filters_search_tags_and_export(api):
    api.post(URL, SVM, format="json")
    api.post(URL, {"title": "A fast elitist multiobjective genetic algorithm: NSGA-II", "authors": "Deb, Kalyanmoy",
                   "year": 2002, "tags": ["Pareto", "NSGA-II"], "status": "read"}, format="json")

    assert [r["year"] for r in api.get(URL, {"status": "read"}).json()] == [2002]
    assert [r["year"] for r in api.get(URL, {"tag": "svm"}).json()] == [1995]
    assert [r["year"] for r in api.get(URL, {"q": "elitist deb"}).json()] == [2002]
    assert [r["year"] for r in api.get(URL, {"q": "pareto"}).json()] == [2002]
    assert api.get(URL, {"q": "introuvable"}).json() == []

    tags = api.get(URL + "tags/").json()
    assert {"tag": "SVM", "count": 1} in tags and len(tags) == 4

    export = api.get(URL + "export/", {"tag": "Pareto"}).json()
    assert export["count"] == 1
    assert export["bibtex"].startswith("@article{deb2002fast,")


@pytest.mark.django_db
def test_read_status_sets_read_at(api):
    ref = api.post(URL, SVM, format="json").json()
    read = api.patch(f"{URL}{ref['id']}/", {"status": "read"}, format="json").json()
    assert read["read_at"] is not None
    back = api.patch(f"{URL}{ref['id']}/", {"status": "reading"}, format="json").json()
    assert back["read_at"] is None


@pytest.mark.django_db
def test_goal_indicator_counts_read_references(api, user):
    review = make_goal(user, "quarterly", title="Revue", target_value=Decimal(60), current_value=Decimal(0), unit="articles")
    other = make_goal(user, "quarterly", title="Autre", target_value=Decimal(10), current_value=Decimal(3), unit="km")

    ref = api.post(URL, {**SVM, "goal": review.id, "status": "read"}, format="json").json()
    review.refresh_from_db()
    assert review.current_value == 1
    assert api.get(f"/api/goals/{review.id}/").json()["progress"] == pytest.approx(1 / 60, abs=1e-4)

    api.patch(f"{URL}{ref['id']}/", {"status": "reading"}, format="json")
    review.refresh_from_db()
    assert review.current_value == 0

    api.patch(f"{URL}{ref['id']}/", {"status": "read"}, format="json")
    api.patch(f"{URL}{ref['id']}/", {"goal": other.id}, format="json")
    review.refresh_from_db()
    other.refresh_from_db()
    assert review.current_value == 0
    assert other.current_value == 3  # not counted in articles: left alone

    api.patch(f"{URL}{ref['id']}/", {"goal": review.id}, format="json")
    api.delete(f"{URL}{ref['id']}/")
    review.refresh_from_db()
    assert review.current_value == 0


@pytest.mark.django_db
def test_references_are_private(api, other_api, other_user):
    ref = api.post(URL, SVM, format="json").json()
    assert other_api.get(f"{URL}{ref['id']}/").status_code == 404
    assert other_api.get(URL).json() == []
    assert other_api.get(URL + "export/").json()["count"] == 0
    foreign_goal = make_goal(other_user)
    assert "goal" in api.patch(f"{URL}{ref['id']}/", {"goal": foreign_goal.id}, format="json").json()
    # The same DOI is allowed for another user.
    assert other_api.post(URL, SVM, format="json").status_code == 201
