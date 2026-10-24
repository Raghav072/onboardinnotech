/**
 * SAMPLE DATA ONLY. Every person, company and skill below is fictional and exists
 * to show the layout. Nothing here is real, verified or stored in a database.
 */
import { computeAcademicStanding } from '../academic-year';
import type { AcademicStanding } from '../academic-year';

export interface MockPerson {
  id: string;
  name: string;
  kind: 'student' | 'alumni';
  programme: string;
  /** Students only. */
  admissionYear?: number;
  programmeDurationYears?: number;
  /** Alumni only. */
  graduationYear?: number;
  company?: string;
  role?: string;
  openToMentoring?: boolean;
  bio: string;
  skills: string[];
  projects: string[];
  experience: { title: string; detail: string }[];
  isMock: true;
}

export const MOCK_PEOPLE: readonly MockPerson[] = [
  { id: 'sample-aarav', name: 'Aarav Nair', kind: 'student', programme: 'B.Tech CSIT', admissionYear: 2026,
    bio: 'Just started and curious about everything. Looking for study groups and seniors to learn from.',
    skills: ['Python', 'C', 'Public speaking'], projects: ['Portfolio website'], experience: [], isMock: true },
  { id: 'sample-meera', name: 'Meera Kapoor', kind: 'student', programme: 'B.Tech CSE', admissionYear: 2026,
    bio: 'Interested in design and front-end work.',
    skills: ['Figma', 'HTML/CSS', 'JavaScript'], projects: ['Campus map concept'], experience: [], isMock: true },
  { id: 'sample-rohan', name: 'Rohan Das', kind: 'student', programme: 'B.Tech CSIT', admissionYear: 2025,
    bio: 'Building small tools and learning backend development.',
    skills: ['Node.js', 'SQL', 'Git'], projects: ['Timetable reminder bot', 'Expense splitter'],
    experience: [{ title: 'Open-source contributor', detail: 'Sample entry: documentation fixes' }], isMock: true },
  { id: 'sample-isha', name: 'Isha Verma', kind: 'student', programme: 'MBA', admissionYear: 2025, programmeDurationYears: 2,
    bio: 'Marketing and analytics. Happy to talk case competitions.',
    skills: ['Marketing', 'Excel', 'Case studies'], projects: ['Brand audit for a local cafe'], experience: [], isMock: true },
  { id: 'sample-kabir', name: 'Kabir Anand', kind: 'student', programme: 'B.Tech CSE', admissionYear: 2024,
    bio: 'App developer and hackathon regular.',
    skills: ['Flutter', 'Dart', 'Firebase'], projects: ['Habit tracker', 'Lost-and-found app'],
    experience: [{ title: 'Mobile app intern', detail: 'Sample entry: summer internship' }], isMock: true },
  { id: 'sample-tanvi', name: 'Tanvi Rao', kind: 'student', programme: 'B.Tech Electronics', admissionYear: 2024,
    bio: 'Embedded systems and robotics.',
    skills: ['Arduino', 'C++', 'PCB design'], projects: ['Line-following robot'], experience: [], isMock: true },
  { id: 'sample-dev', name: 'Dev Malhotra', kind: 'student', programme: 'B.Tech CSIT', admissionYear: 2023,
    bio: 'Final year, preparing for placements and happy to share interview notes.',
    skills: ['Java', 'DSA', 'System design'], projects: ['Interview question bank'],
    experience: [{ title: 'Software intern', detail: 'Sample entry: backend team' }], isMock: true },
  { id: 'sample-sana', name: 'Sana Qureshi', kind: 'student', programme: 'B.Tech CSE', admissionYear: 2023,
    bio: 'Machine learning projects and research reading.',
    skills: ['Python', 'PyTorch', 'Statistics'], projects: ['Crop disease classifier'], experience: [], isMock: true },
  { id: 'sample-nisha', name: 'Nisha Bose', kind: 'alumni', programme: 'B.Tech CSE', graduationYear: 2024,
    company: 'Northwind Labs (fictional)', role: 'Software Engineer', openToMentoring: true,
    bio: 'Happy to talk about moving from campus projects to a first engineering job.',
    skills: ['Go', 'Cloud', 'Mentoring'], projects: [],
    experience: [{ title: 'Software Engineer', detail: 'Northwind Labs (fictional), sample entry' }], isMock: true },
  { id: 'sample-vikram', name: 'Vikram Sethi', kind: 'alumni', programme: 'B.Tech CSIT', graduationYear: 2024,
    company: 'Harbor Analytics (fictional)', role: 'Data Analyst', openToMentoring: false,
    bio: 'Analytics and BI. Not currently taking mentoring requests.',
    skills: ['SQL', 'Power BI', 'Statistics'], projects: [],
    experience: [{ title: 'Data Analyst', detail: 'Harbor Analytics (fictional), sample entry' }], isMock: true },
  { id: 'sample-pooja', name: 'Pooja Iyer', kind: 'alumni', programme: 'MBA', graduationYear: 2025,
    company: 'Lumen Retail (fictional)', role: 'Associate Product Manager', openToMentoring: true,
    bio: 'Product and operations. Glad to review MBA placement resumes.',
    skills: ['Product', 'Operations', 'Analytics'], projects: [],
    experience: [{ title: 'Associate Product Manager', detail: 'Lumen Retail (fictional), sample entry' }], isMock: true },
];

export function getMockPerson(id: string): MockPerson | undefined {
  return MOCK_PEOPLE.find((p) => p.id === id);
}

/** Standing for sample students, computed with the real academic-year rule. Alumni have none. */
export function standingFor(person: MockPerson): AcademicStanding | null {
  if (person.kind !== 'student' || person.admissionYear === undefined) return null;
  return computeAcademicStanding({
    admissionYear: person.admissionYear,
    programmeDurationYears: person.programmeDurationYears,
  });
}
