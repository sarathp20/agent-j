export type Status = "Applied" | "In Progress" | "Screening Call" | "Interview" | "Offer" | "Rejected" | "Withdrawn" | "On Hold";
export type WorkMode = "On-site" | "Hybrid" | "Remote";
export type Channel = "LinkedIn" | "Company Website" | "Referral" | "Recruiter Outreach" | "Job Board"

export interface Application {
    id: string
    company: string
    role: string
    country: string
    city: string
    appliedDate: string
    lastContactDate?: string
    status: Status
    workMode: WorkMode
    channel: Channel
    recruiterName?: string
    referralContact?: string
    nextAction?: string
    notes?: string
    recruiterContacted: boolean
    salaryShared: boolean
    archived: boolean
}
