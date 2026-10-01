import unittest
from public_layout_contract import validate_catalog_actions


class CatalogActionLayoutTests(unittest.TestCase):
    def test_horizontal_actions_have_separation(self):
        validate_catalog_actions({'x': 0, 'y': 0, 'width': 140, 'height': 44},
                                 {'x': 160, 'y': 0, 'width': 110, 'height': 44})

    def test_wrapped_actions_have_separation(self):
        validate_catalog_actions({'x': 0, 'y': 0, 'width': 140, 'height': 44},
                                 {'x': 0, 'y': 52, 'width': 110, 'height': 44})

    def test_touching_overlapping_and_small_targets_fail(self):
        first = {'x': 0, 'y': 0, 'width': 140, 'height': 44}
        for second in ({'x': 140, 'y': 0, 'width': 110, 'height': 44},
                       {'x': 100, 'y': 10, 'width': 110, 'height': 44},
                       {'x': 160, 'y': 0, 'width': 110, 'height': 20},
                       {'x': 160, 'y': 0, 'width': 40, 'height': 44},
                       {'x': float('nan'), 'y': 0, 'width': 110, 'height': 44}, None):
            with self.assertRaises(AssertionError):
                validate_catalog_actions(first, second)


if __name__ == '__main__':
    unittest.main()
