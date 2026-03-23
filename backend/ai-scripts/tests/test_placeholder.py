def test_ai_service_placeholder():
    assert True


def test_sample_fixture(sample_cart_items):
    assert len(sample_cart_items) == 2
    assert sample_cart_items[0]["category"] == "Feluri principale"
