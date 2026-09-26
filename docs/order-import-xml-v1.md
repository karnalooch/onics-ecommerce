# CELTRONICS_ORDER_XML_V1

The cart import intentionally supports one narrow XML contract. It is **not** a
generic EDI/XML parser.

## Limits

- UTF-8 XML 1.0.
- Maximum payload: 256 KiB.
- Maximum source lines: 250 `item` elements.
- Product identifier: exact catalog `sku`.
- Quantity: integer from 1 to 10000; duplicate SKU lines are aggregated before
  catalog validation.
- Unknown SKU does not fail the whole file. It appears in the rejected-lines
  review report.
- Prices, product names, discounts and stock are never accepted from the file.
  They are resolved from the server-side catalog and current customer account.

## Security contract

Request bodies are bounded while streaming, so missing or understated `Content-Length` cannot bypass the 256 KiB limit.

The parser is fail-closed. The following are not part of the format and are
rejected: DTD, ENTITY declarations, CDATA, comments, namespaces, text nodes,
unknown elements, unknown attributes and arbitrary XML extensions.

## Template

```xml
<?xml version="1.0" encoding="UTF-8"?>
<celtronics-order version="1">
  <item sku="ABC-123" quantity="2"/>
  <item sku="XYZ-9000" quantity="1"/>
</celtronics-order>
```

Attribute order inside `item` is not significant, but attribute names are
fixed to `sku` and `quantity`.

The import endpoint only creates a preview. The cart is mutated in the browser
only after the user reviews and explicitly accepts the preview. Final checkout
and order creation still repeat the normal server-side catalog, pricing and
stock validation.
