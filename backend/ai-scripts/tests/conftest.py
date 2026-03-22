import pytest


@pytest.fixture
def sample_cart_items() -> list[dict]:
    return [
        {"menu_item_id": "00000000-0000-0000-0000-000000000001", "name": "Grătar mixt", "category": "Feluri principale", "tags": ["meat", "grill"]},
        {"menu_item_id": "00000000-0000-0000-0000-000000000002", "name": "Salată Caesar", "category": "Salate", "tags": ["salad", "cold"]},
    ]
