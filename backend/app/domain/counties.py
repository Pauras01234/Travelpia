"""Static domain data: the 32 counties of Ireland.

Kept as a single source of truth so request validation and any future
county->coordinate lookups (used by the /weather endpoint) agree.
"""

from __future__ import annotations

COUNTIES: tuple[str, ...] = (
    "Antrim", "Armagh", "Carlow", "Cavan", "Clare", "Cork", "Derry",
    "Donegal", "Down", "Dublin", "Fermanagh", "Galway", "Kerry", "Kildare",
    "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth", "Mayo",
    "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary",
    "Tyrone", "Waterford", "Westmeath", "Wexford", "Wicklow",
)

# Case-insensitive lookup: normalised name -> canonical name.
_CANONICAL: dict[str, str] = {c.lower(): c for c in COUNTIES}


def normalise_county(name: str) -> str | None:
    """Return the canonical county name, or ``None`` if not recognised."""
    if not name:
        return None
    return _CANONICAL.get(name.strip().lower())
