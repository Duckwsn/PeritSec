ALTER TABLE accounts
  ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('admin', 'member'));

-- Migra instalações com contas preexistentes sem deixar a instalação sem admin.
UPDATE accounts
   SET role = 'admin'
 WHERE id = (
   SELECT id FROM accounts ORDER BY created_at ASC, id ASC LIMIT 1
 )
   AND NOT EXISTS (SELECT 1 FROM accounts WHERE role = 'admin');
