import type { DialectId } from './dialects';

export interface Sample {
  id: string;
  title: string;
  dialect: DialectId | 'any';
  sql: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'monthly-revenue',
    title: 'Monthly revenue by tier (90d)',
    dialect: 'postgresql',
    sql: `-- monthly revenue by tier, last 90 days
WITH recent_orders AS (
  SELECT
    o.id,
    o.user_id,
    o.total_cents,
    DATE_TRUNC('month', o.created_at) AS month
  FROM orders o
  WHERE o.created_at >= NOW() - INTERVAL '90 days'
)
SELECT
  u.tier,
  r.month,
  COUNT(*) AS orders,
  SUM(r.total_cents) / 100.0 AS revenue
FROM recent_orders r
JOIN users u ON u.id = r.user_id
GROUP BY u.tier, r.month
ORDER BY r.month DESC, revenue DESC;
`,
  },
  {
    id: 'top-n-per-group',
    title: 'Top-N rows per group (window)',
    dialect: 'any',
    sql: `SELECT *
FROM (
  SELECT
    p.id,
    p.category_id,
    p.name,
    p.price,
    ROW_NUMBER() OVER (PARTITION BY p.category_id ORDER BY p.price DESC) AS rn
  FROM products p
) ranked
WHERE rn <= 3;
`,
  },
  {
    id: 'recursive-tree',
    title: 'Recursive CTE — org chart',
    dialect: 'postgresql',
    sql: `WITH RECURSIVE tree AS (
  SELECT id, name, manager_id, 1 AS depth
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, t.depth + 1
  FROM employees e
  JOIN tree t ON t.id = e.manager_id
)
SELECT depth, id, name FROM tree ORDER BY depth, name;
`,
  },
  {
    id: 'cohort-retention',
    title: 'Cohort retention skeleton',
    dialect: 'any',
    sql: `SELECT
  c.cohort_month,
  DATE_TRUNC('month', e.occurred_at) AS event_month,
  COUNT(DISTINCT e.user_id) AS active
FROM cohorts c
LEFT JOIN events e ON e.user_id = c.user_id
GROUP BY 1, 2
ORDER BY 1, 2;
`,
  },
];
