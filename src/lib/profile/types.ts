export interface OwnProfile {
  id: string;
  displayName: string;
  kind: 'student' | 'alumni';
  programme: string | null;
  admissionYear: number | null;
  graduationYear: number | null;
  company: string | null;
  jobTitle: string | null;
  bio: string;
  skills: string[];
  openToMentoring: boolean;
  isPublic: boolean;
  avatarPath: string | null;
  verificationStatus: string;
  email: string;
  phone: string | null;
}

/** What other members may see. There is deliberately no email, phone or role here. */
export interface PublicProfile {
  id: string;
  displayName: string;
  kind: 'student' | 'alumni';
  programme: string | null;
  admissionYear: number | null;
  graduationYear: number | null;
  company: string | null;
  jobTitle: string | null;
  bio: string;
  skills: string[];
  openToMentoring: boolean;
  avatarPath: string | null;
  isVerified: boolean;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
