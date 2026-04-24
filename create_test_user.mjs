import oracledb from "oracledb";

// Configure for local machine
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function createTestUser() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: "JD2",
      password: "Oracle123",
      connectionString: "192.168.1.35:1521/ORCLPDB1",
    });

    console.log("Connected to Oracle DB");

    // Check if user already exists
    const checkResult = await connection.execute(
      `SELECT ID FROM APP_USERS WHERE PHONE = '9999999999'`,
    );

    if (checkResult.rows.length > 0) {
      console.log("Test user already exists");
      return;
    }

    // Insert test user
    const insertResult = await connection.execute(
      `INSERT INTO APP_USERS (PHONE, PASSWORD_HASH, IS_ACTIVE)
       VALUES ('9999999999', '$2b$12$T/.khfF4mu4X7NQNS7AFPeGTnixHJUIg0S80lXrd105ErtHQpDoAi', 1)`,
      [],
      { autoCommit: true },
    );

    console.log("Test user created successfully!");
    console.log("Phone: 9999999999");
    console.log("Password: Admin@123");

    // Verify
    const verifyResult = await connection.execute(
      `SELECT ID, PHONE, IS_ACTIVE FROM APP_USERS WHERE PHONE = '9999999999'`,
    );

    console.log("\nVerified user in database:");
    console.log(verifyResult.rows[0]);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

createTestUser();
