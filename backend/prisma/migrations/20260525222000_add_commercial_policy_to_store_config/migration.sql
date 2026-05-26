ALTER TABLE "store_config"
ADD COLUMN "free_shipping_minimum" DOUBLE PRECISION NOT NULL DEFAULT 99,
ADD COLUMN "pix_discount_percent" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN "card_interest_free_installments" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "card_max_installments" INTEGER NOT NULL DEFAULT 12;

UPDATE "store_config"
SET "shipping_info" = 'Frete grátis em compras acima de R$ 99,00 para todo o Brasil. Valor e prazo finais são calculados pelo CEP.'
WHERE "shipping_info" LIKE '%Goiânia%'
   OR "shipping_info" LIKE '%25,00%';
