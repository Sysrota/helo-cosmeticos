UPDATE "store_config"
SET "ai_rules" = 'Nunca inventar informações. Use as condições comerciais configuradas no sistema e os valores finais retornados pelo cálculo de frete.'
WHERE "ai_rules" LIKE '%PIX com 10% de desconto%'
   OR "ai_rules" LIKE '%abatimento de até R$ 25,00%';
