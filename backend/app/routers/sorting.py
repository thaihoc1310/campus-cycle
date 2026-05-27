def apply_sort(query, sort_by: str, sort_order: str, sort_fields: dict, default_sort: str = "created_at"):
    sort_column = sort_fields[sort_by] if sort_by in sort_fields else sort_fields[default_sort]
    direction = sort_column.asc() if sort_order == "asc" else sort_column.desc()
    return query.order_by(direction.nullslast())
