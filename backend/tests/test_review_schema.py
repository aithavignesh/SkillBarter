from pydantic import ValidationError
import pytest

from app.schemas.review import ReviewCreate


def test_review_comment_is_trimmed():
    review = ReviewCreate(exchange_id=1, rating=5, comment="  Great exchange!  ")
    assert review.comment == "Great exchange!"


def test_review_comment_rejects_blank_text():
    with pytest.raises(ValidationError):
        ReviewCreate(exchange_id=1, rating=5, comment="   ")


def test_review_comment_rejects_oversized_text():
    with pytest.raises(ValidationError):
        ReviewCreate(exchange_id=1, rating=5, comment="x" * 1001)


def test_review_comment_is_optional():
    review = ReviewCreate(exchange_id=1, rating=5)
    assert review.comment is None
