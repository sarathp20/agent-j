import { applications } from "../src/data";
import { pool } from "../src/db"

applications.forEach(
    async application => {
        const result = await pool.query(
            `INSERT INTO applications (id, company, role, country, city, applied_date, last_contact_date, status, work_mode, channel, recruiter_name, referral_contact, next_action, notes, recruiter_contacted, salary_shared, archived)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
            [
                application.id, 
                application.company, 
                application.role, 
                application.country, 
                application.city, 
                application.appliedDate, 
                application.lastContactDate??null, 
                application.status, application.workMode??null, 
                application.channel??null, 
                application.recruiterName??null, 
                application.referralContact??null,
                application.nextAction??null,
                application.notes??null, 
                application.recruiterContacted, 
                application.salaryShared, 
                application.archived
             ],
        )
        console.log(result.rows, result.rowCount)
    }
)