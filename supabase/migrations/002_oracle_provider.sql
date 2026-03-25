-- Migration: Pivot from Hetzner to Oracle Cloud as default provider
-- Oracle Cloud Always Free ARM instances (VM.Standard.A1.Flex)

-- Update default provider for new assistants
ALTER TABLE assistants
  ALTER COLUMN provider SET DEFAULT 'oracle';

-- OCI uses OCID strings (e.g., ocid1.instance.oc1.phx.xxx) which are longer than
-- typical integer IDs. Ensure vm_id column can hold them.
ALTER TABLE assistants
  ALTER COLUMN vm_id TYPE text;

-- Update any existing assistants still on hetzner default that haven't been provisioned
-- (optional — only affects rows where vm_id is null, meaning not yet launched)
UPDATE assistants
  SET provider = 'oracle'
  WHERE provider = 'hetzner' AND vm_id IS NULL;
