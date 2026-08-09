import { prisma } from "../../../config/prisma.js";

type CouponMatch = {
  code: string;
  name: string;
  partner_name: string;
  discount_type: string;
  discount_value: number;
  min_subtotal: number;
  max_discount: number | null;
  allow_pix_discount: boolean;
  starts_at: Date | null;
  ends_at: Date | null;
  status: string;
};

export type SearchCouponsResult =
  | { status: "query_required" }
  | { status: "not_found" }
  | { status: "found"; matches: CouponMatch[] };

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function couponStatus(coupon: {
  is_active: boolean;
  starts_at: Date | null;
  ends_at: Date | null;
  usage_limit: number | null;
  _count: { redemptions: number };
}) {
  const now = new Date();

  if (!coupon.is_active) return "inactive";
  if (coupon.starts_at && coupon.starts_at > now) return "not_started";
  if (coupon.ends_at && coupon.ends_at < now) return "expired";
  if (
    coupon.usage_limit &&
    coupon._count.redemptions >= coupon.usage_limit
  ) return "usage_limit_reached";

  return "active";
}

function matchScore(query: string, value: string) {
  if (!value) return 0;
  if (query.includes(value)) return 100 + value.length;
  if (value.includes(query) && query.length >= 3) return 80 + query.length;

  const queryWords = new Set(query.split(" ").filter((word) => word.length >= 3));
  const valueWords = value.split(" ").filter((word) => word.length >= 3);
  const matchingWords = valueWords.filter((word) => queryWords.has(word));

  return matchingWords.length === valueWords.length && valueWords.length
    ? 40 + matchingWords.length
    : 0;
}

export async function searchCouponsTool({
  query,
}: {
  query: string;
}): Promise<SearchCouponsResult> {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return { status: "query_required" };
  }

  const coupons = await prisma.coupon.findMany({
    include: {
      _count: {
        select: { redemptions: true },
      },
    },
  });

  const matches = coupons
    .map((coupon) => ({
      coupon,
      score: Math.max(
        matchScore(normalizedQuery, normalizeText(coupon.code)),
        matchScore(normalizedQuery, normalizeText(coupon.name)),
        matchScore(normalizedQuery, normalizeText(coupon.partner_name))
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ coupon }) => ({
      code: coupon.code,
      name: coupon.name,
      partner_name: coupon.partner_name,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_subtotal: coupon.min_subtotal,
      max_discount: coupon.max_discount,
      allow_pix_discount: coupon.allow_pix_discount,
      starts_at: coupon.starts_at,
      ends_at: coupon.ends_at,
      status: couponStatus(coupon),
    }));

  return matches.length
    ? { status: "found", matches }
    : { status: "not_found" };
}
