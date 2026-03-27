-- Add step-based provisioning columns to assistants table
-- These track progress through async Azure VM provisioning steps

ALTER TABLE assistants
  ADD COLUMN IF NOT EXISTS provisioning_step text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provisioning_data jsonb DEFAULT NULL;

COMMENT ON COLUMN assistants.provisioning_step IS 'Current step in async provisioning: validate, create_rg, create_nsg, create_vnet, create_ip, create_nic, create_vm, wait_vm, done';
COMMENT ON COLUMN assistants.provisioning_data IS 'Ephemeral JSON blob holding state between provisioning steps (subscriptionId, vmName, etc.)';
