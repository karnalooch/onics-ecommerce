"""Geometry acceptance for adjacent catalog actions (CSS pixel coordinates)."""
import math


def validate_catalog_actions(first: dict | None, second: dict | None) -> None:
    for box in (first, second):
        if box is None or any(not isinstance(box.get(key), (int, float)) or
                              not math.isfinite(box[key]) for key in ('x', 'y', 'width', 'height')):
            raise AssertionError('Catalog action has no usable bounding box')
        if box['width'] < 44 or box['height'] < 44:
            raise AssertionError('Catalog action touch target is smaller than 44 CSS pixels')
    # Accept horizontal separation or wrapped rows, never touching/overlapping targets.
    horizontal = max(second['x'] - first['x'] - first['width'],
                     first['x'] - second['x'] - second['width'])
    vertical = max(second['y'] - first['y'] - first['height'],
                   first['y'] - second['y'] - second['height'])
    if horizontal < 12 and vertical < 8:
        raise AssertionError('Catalog actions run together or overlap')
