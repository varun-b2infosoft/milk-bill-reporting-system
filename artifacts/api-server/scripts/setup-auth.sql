-- =======================================================
-- Milk Bill System — Auth Setup Script (Oracle)
-- Run this in SQL*Plus or SQL Developer as JD2
-- =======================================================

-- 1. Create the users table (if not auto-created by the server)
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE APP_USERS (
      ID            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      PHONE         VARCHAR2(10)  NOT NULL,
      PASSWORD_HASH VARCHAR2(255) NOT NULL,
      IS_ACTIVE     NUMBER(1)     DEFAULT 1 NOT NULL,
      CREATED_AT    TIMESTAMP     DEFAULT SYSDATE NOT NULL,
      CONSTRAINT APP_USERS_PHONE_UQ UNIQUE (PHONE)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('APP_USERS table already exists — skipping create.');
    ELSE RAISE;
    END IF;
END;
/

-- 2. Example: Insert an admin user
--    IMPORTANT: Replace the PASSWORD_HASH value below with a real bcrypt hash.
--
--    To generate a hash, run this Node.js one-liner on any machine:
--
--      node -e "const b=require('bcryptjs'); b.hash('YourPassword123', 12).then(h => console.log(h));"
--
--    Paste the output (starting with $2b$...) as the PASSWORD_HASH below.

INSERT INTO APP_USERS (PHONE, PASSWORD_HASH, IS_ACTIVE)
VALUES (
  '9876543210',                               -- Replace with real phone number
  '$2b$12$REPLACE_WITH_BCRYPT_HASH_HERE',     -- Replace with bcrypt hash
  1
);
COMMIT;

-- 3. Verify
SELECT ID, PHONE, IS_ACTIVE, CREATED_AT FROM APP_USERS;
