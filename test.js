const oracledb = require("oracledb");

async function test() {
  try {
    const connection = await oracledb.getConnection({
      user: "APP_USER",
      password: "Saras123",
      connectString: "10.10.1.90:1521/ORCLPDB1",
    });

    console.log("✅ Connected to Oracle");

    const result = await connection.execute(`SELECT 'CONNECTED' FROM dual`);
    console.log(result.rows);

    await connection.close();
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

test();
