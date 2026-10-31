import { pool } from "../src/db"

const ACTIVE_STATUSES = ["Applied", "In Progress", "Screening Call", "Interview", "On Hold"]

// Mirrors get_application
async function getApplication(id: string) {
    const result = await pool.query(`SELECT * FROM applications WHERE id = $1`, [id])
    return result.rows[0] ?? { error: `No application with id ${id}` }
}

// Mirrors search_by_company: "contains", case-insensitive, includes archived
async function searchByCompany(company: string) {
    const result = await pool.query(
        `SELECT id, company, role, status, applied_date, archived
         FROM applications
         WHERE company ILIKE $1
         ORDER BY id`,
        [`%${company}%`],
    )
    return result.rows
}

// Mirrors list_active_applications: not archived, active status, optional country
async function listActive(country: string | null) {
    const result = await pool.query(
        `SELECT id, company, role, status, last_contact_date
         FROM applications
         WHERE archived = false
           AND status = ANY($1::text[])
           AND ($2::text IS NULL OR lower(country) = lower($2))
         ORDER BY id`,
        [ACTIVE_STATUSES, country],
    )
    return result.rows
}

try {
    console.log("--- get APP002 (dates should be plain strings like '2025-11-18')")
    console.log(await getApplication("APP002"))

    console.log("--- get APP999 (should be an error object)")
    console.log(await getApplication("APP999"))

    console.log("--- search 'ib' (should find both IBM rows)")
    console.log(await searchByCompany("ib"))

    console.log("--- search 'IBM'")
    console.log(await searchByCompany("IBM"))

    console.log("--- search 'zzz' (should be an empty list)")
    console.log(await searchByCompany("zzz"))

    console.log("--- active, no country filter")
    console.log(await listActive(null))

    console.log("--- active, country 'india' (lowercase on purpose)")
    console.log(await listActive("india"))

    console.log("--- active, country 'Germany' (should be empty)")
    console.log(await listActive("Germany"))
} finally {
    await pool.end()
}