export type UserRole = 'ADMIN' | 'MANAGER' | 'MEDICAL_REP';

export type DoctorPriority = 'A' | 'B' | 'C';

export type InterestLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type VisitPurpose = 
  | 'DETAILING' 
  | 'FOLLOW_UP' 
  | 'PRODUCT_LAUNCH' 
  | 'SAMPLE_DELIVERY' 
  | 'MEDICAL_EDUCATION' 
  | 'RELATIONSHIP_BUILDING';

export type VisitStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type DoctorResponse = 
  | 'VERY_INTERESTED' 
  | 'INTERESTED' 
  | 'NEUTRAL' 
  | 'NOT_INTERESTED';

export type FollowUpActionType = 'CALL' | 'VISIT' | 'SEND_INFO' | 'OTHER';

export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'MISSED';

export type NotificationType = 'VISIT' | 'FOLLOW_UP' | 'TARGET' | 'SYSTEM' | 'ASSIGNMENT';

export type SubscriptionPlan = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  employeeId?: string;
  role: UserRole;
  profileImage?: string;
  jobTitle?: string;
  isActive: boolean;
  companyId: string;
  managerId?: string;
  workingDays: number[];
  workingHours: { start: string; end: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  settings: Record<string, unknown>;
  subscription: SubscriptionPlan;
  createdAt: Date;
  updatedAt: Date;
}

export interface Specialty {
  id: string;
  name: string;
  companyId: string;
}

export interface Doctor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  specialtyId: string;
  subSpecialty?: string;
  gender?: string;
  clinicName?: string;
  address?: string;
  governorate?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  priority: DoctorPriority;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  specialty?: Specialty;
  distance?: number;
}

export interface DoctorLocation {
  id: string;
  doctorId: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isPrimary: boolean;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  doctorLocationId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface Product {
  id: string;
  name: string;
  genericName?: string;
  category?: string;
  description?: string;
  dosageInfo?: string;
  companyId: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Visit {
  id: string;
  repId: string;
  doctorId: string;
  doctorLocationId?: string;
  visitPurpose: VisitPurpose;
  status: VisitStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  latitude?: number;
  longitude?: number;
  distanceFromDoctor?: number;
  isVerified: boolean;
  doctorResponse?: DoctorResponse;
  notes?: string;
  nextFollowUpDate?: Date;
  nextFollowUpType?: string;
  nextFollowUpNotes?: string;
  companyId: string;
  createdAt: Date;
  rep?: User;
  doctor?: Doctor;
  visitProducts?: VisitProduct[];
}

export interface VisitProduct {
  id: string;
  visitId: string;
  productId: string;
  product?: Product;
}

export interface FollowUp {
  id: string;
  repId: string;
  doctorId: string;
  visitId?: string;
  dueDate: Date;
  actionType: FollowUpActionType;
  notes?: string;
  status: FollowUpStatus;
  completedAt?: Date;
  companyId: string;
  createdAt: Date;
}

export interface Target {
  id: string;
  repId: string;
  month: number;
  year: number;
  totalVisits: number;
  totalDoctors: number;
  newDoctors: number;
  followUps: number;
  companyId: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata: Record<string, unknown>;
  companyId: string;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  companyId: string;
  plan: SubscriptionPlan;
  maxUsers: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface NearbyDoctor extends Doctor {
  distance: number;
  isOpenNow?: boolean;
}

export interface VisitFormData {
  visitPurpose: VisitPurpose;
  products: string[];
  doctorResponse: DoctorResponse;
  notes: string;
  nextFollowUpDate?: Date;
  nextFollowUpType?: FollowUpActionType;
  nextFollowUpNotes?: string;
}

export interface KPIMetrics {
  totalVisits: number;
  completedVisits: number;
  coveragePercentage: number;
  targetAchievement: number;
  avgVisitDuration: number;
  newDoctorsVisited: number;
  followUpsCompleted: number;
}

export interface RepLocation {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  status: 'active' | 'idle' | 'offline';
}