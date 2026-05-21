from datetime import date


def calculate_age(birth_date: date | None) -> str:
    """생년월일로 나이 라벨을 만든다. 1세 이상은 "N세", 미만은 "N개월"."""
    if not birth_date:
        return ""

    today = date.today()
    years = today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )

    if years >= 1:
        return f"{years}세"

    months = (
        (today.year - birth_date.year) * 12
        + today.month
        - birth_date.month
    )
    if today.day < birth_date.day:
        months -= 1

    return f"{max(months, 0)}개월"
