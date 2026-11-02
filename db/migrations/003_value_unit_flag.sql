-- Marks 13F lines left on the 3 January 2023 date rule because too few filers
-- reported that CUSIP in the period to support a 1000x rescale.

ALTER TABLE holding_13f
    ADD COLUMN value_unit_flagged boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN holding_13f.value_unit_flagged IS
    'True when the date-rule value was kept and flagged instead of rescaled. A rescale requires the implied price to be about 1000x off the median of enough filers.';
