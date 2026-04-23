import { Router } from "express";
import oracledb from "oracledb";
import { query, execute, queryOne, T } from "../lib/oracle";
import { CreateSocietyBody } from "@workspace/api-zod";

const router = Router();

router.get("/societies", async (req, res) => {
  try {
    let rows: any[] = [];
    try {
      rows = await query<{
        ID: number; NAME: string; CODE: string; ROUTE_CODE: string;
        BANK_NAME: string; BANK_ACCOUNT: string; BANK_IFSC: string;
        CONTACT_PERSON: string; PHONE: string;
      }>(
        `SELECT ID, NAME, CODE, ROUTE_CODE, BANK_NAME, BANK_ACCOUNT, BANK_IFSC,
                CONTACT_PERSON, PHONE
           FROM ${T.societies}
          ORDER BY NAME`
      );
    } catch (_err) {
      // Societies table doesn't exist, return empty array
      rows = [];
    }

    res.json(
      rows.map((s) => ({
        id: Number(s.ID),
        name: s.NAME,
        code: s.CODE,
        routeCode: s.ROUTE_CODE ?? null,
        bankName: s.BANK_NAME ?? null,
        bankAccount: s.BANK_ACCOUNT ?? null,
        bankIfsc: s.BANK_IFSC ?? null,
        contactPerson: s.CONTACT_PERSON ?? null,
        phone: s.PHONE ?? null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list societies");
    // Return empty array instead of error
    res.json([]);
  }
});

router.post("/societies", async (req, res) => {
  const parsed = CreateSocietyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  try {
    const d = parsed.data;
    const result = await execute(
      `INSERT INTO ${T.societies} (NAME, CODE, ROUTE_CODE, BANK_NAME, BANK_ACCOUNT, BANK_IFSC, CONTACT_PERSON, PHONE)
       VALUES (:name, :code, :routeCode, :bankName, :bankAccount, :bankIfsc, :contactPerson, :phone)
       RETURNING ID INTO :newId`,
      {
        name: d.name,
        code: d.code,
        routeCode: d.routeCode ?? null,
        bankName: d.bankName ?? null,
        bankAccount: d.bankAccount ?? null,
        bankIfsc: d.bankIfsc ?? null,
        contactPerson: d.contactPerson ?? null,
        phone: d.phone ?? null,
        newId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    );

    const outBinds = result.outBinds as Record<string, number[]>;
    const newId = outBinds?.newId?.[0] ?? outBinds?.NEWID?.[0];
    const society = await queryOne<Record<string, unknown>>(
      `SELECT ID, NAME, CODE, ROUTE_CODE, BANK_NAME, BANK_ACCOUNT, BANK_IFSC, CONTACT_PERSON, PHONE
         FROM ${T.societies} WHERE ID = :id`,
      { id: newId }
    );

    res.status(201).json({
      id: Number(society?.ID),
      name: society?.NAME,
      code: society?.CODE,
      routeCode: society?.ROUTE_CODE ?? null,
      bankName: society?.BANK_NAME ?? null,
      bankAccount: society?.BANK_ACCOUNT ?? null,
      bankIfsc: society?.BANK_IFSC ?? null,
      contactPerson: society?.CONTACT_PERSON ?? null,
      phone: society?.PHONE ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create society");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
