BEGIN TRANSACTION;

ALTER TABLE compras ADD COLUMN proveedor_identificacion TEXT;
ALTER TABLE compras ADD COLUMN metadata TEXT;

COMMIT;
