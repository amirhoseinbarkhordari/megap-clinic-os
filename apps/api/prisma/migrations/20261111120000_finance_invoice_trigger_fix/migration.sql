DROP TRIGGER "invoices_total_matches_lines" ON "invoices";
DROP TRIGGER "invoice_lines_match_total" ON "invoice_lines";

CREATE FUNCTION "assert_invoice_total"(target_tenant uuid, target_invoice uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE expected_total bigint; line_total bigint;
BEGIN
  SELECT "total_rial" INTO expected_total FROM "invoices"
    WHERE "tenant_id" = target_tenant AND "id" = target_invoice;
  SELECT COALESCE(SUM("line_total_rial"), 0) INTO line_total FROM "invoice_lines"
    WHERE "tenant_id" = target_tenant AND "invoice_id" = target_invoice;
  IF expected_total IS NULL OR expected_total <> line_total THEN
    RAISE EXCEPTION 'Invoice total must equal the sum of its immutable lines.' USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE FUNCTION "verify_invoice_insert_total"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "assert_invoice_total"(NEW."tenant_id", NEW."id");
  RETURN NULL;
END;
$$;

CREATE FUNCTION "verify_invoice_line_insert_total"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "assert_invoice_total"(NEW."tenant_id", NEW."invoice_id");
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "invoices_total_matches_lines"
  AFTER INSERT ON "invoices" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "verify_invoice_insert_total"();
CREATE CONSTRAINT TRIGGER "invoice_lines_match_total"
  AFTER INSERT ON "invoice_lines" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "verify_invoice_line_insert_total"();
