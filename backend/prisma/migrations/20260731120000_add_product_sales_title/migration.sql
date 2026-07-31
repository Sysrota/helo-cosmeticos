ALTER TABLE "products"
ADD COLUMN "sales_title" TEXT;

UPDATE "products"
SET
  "sales_title" = 'Sua pele merece esse cuidado todos os dias.',
  "subtitle" = 'Uma rotina completa em 3 passos para limpar, renovar e hidratar, deixando a pele mais macia, confortável e com aparência iluminada.'
WHERE "id" = 2;
