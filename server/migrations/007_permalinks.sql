ALTER TABLE ingredient_products ADD COLUMN permalink TEXT;
ALTER TABLE recipes ADD COLUMN permalink TEXT;

WITH base AS (
  SELECT
    id,
    COALESCE(NULLIF(
      trim(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(lower(name), '&', ' and '),
                      '/', '-'
                    ),
                    '+', '-'
                  ),
                  '.', ''
                ),
                '''', ''
              ),
              ' ', '-'
            ),
            '--', '-'
          ),
          '--', '-'
        ),
        '-'
      ),
      ''
    ), 'ingredient') AS base_permalink,
    created_at
  FROM ingredient_products
),
ranked AS (
  SELECT
    id,
    base_permalink,
    row_number() OVER (PARTITION BY base_permalink ORDER BY created_at, id) AS duplicate_index
  FROM base
)
UPDATE ingredient_products
SET permalink = (
  SELECT
    CASE
      WHEN duplicate_index = 1 THEN base_permalink
      ELSE base_permalink || '-' || duplicate_index
    END
  FROM ranked
  WHERE ranked.id = ingredient_products.id
);

WITH base AS (
  SELECT
    id,
    COALESCE(NULLIF(
      trim(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(lower(name), '&', ' and '),
                      '/', '-'
                    ),
                    '+', '-'
                  ),
                  '.', ''
                ),
                '''', ''
              ),
              ' ', '-'
            ),
            '--', '-'
          ),
          '--', '-'
        ),
        '-'
      ),
      ''
    ), 'recipe') AS base_permalink,
    created_at
  FROM recipes
),
ranked AS (
  SELECT
    id,
    base_permalink,
    row_number() OVER (PARTITION BY base_permalink ORDER BY created_at, id) AS duplicate_index
  FROM base
)
UPDATE recipes
SET permalink = (
  SELECT
    CASE
      WHEN duplicate_index = 1 THEN base_permalink
      ELSE base_permalink || '-' || duplicate_index
    END
  FROM ranked
  WHERE ranked.id = recipes.id
);

CREATE UNIQUE INDEX ingredient_products_permalink_unique ON ingredient_products(permalink);
CREATE UNIQUE INDEX recipes_permalink_unique ON recipes(permalink);
