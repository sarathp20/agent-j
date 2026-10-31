export const STATUSES = [
    "Applied", "In Progress", "Screening Call", "Interview",
    "Offer", "Rejected", "Withdrawn", "On Hold",
] as const
export type Status = (typeof STATUSES)[number]

export const WORK_MODES = ["On-site", "Hybrid", "Remote"] as const
export type WorkMode = (typeof WORK_MODES)[number]

export const CHANNELS = [
    "LinkedIn", "Company Website", "Referral", "Recruiter Outreach", "Job Board",
] as const
export type Channel = (typeof CHANNELS)[number]

export interface Application {
    id: string
    company: string
    role: string
    country: string
    city: string
    appliedDate: string
    lastContactDate?: string
    status: Status
    workMode?: WorkMode
    channel?: Channel
    recruiterName?: string
    referralContact?: string
    nextAction?: string
    notes?: string
    recruiterContacted: boolean
    salaryShared: boolean
    archived: boolean
}
