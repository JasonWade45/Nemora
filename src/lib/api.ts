const API_URL = "https://nemora.fastapicloud.dev";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nemora_token");
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("nemora_token");
}

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ============ Types ============

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  organization_id: string;
  phone?: string | null;
  specialties?: string[];
  supervisor_id?: string | null;
  supervisor_name?: string | null;
  created_at?: string;
};

export type Doctor = {
  id: string;
  organization_id?: string | null;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  area?: string | null;
  zip_code?: string | null;
  notes?: string | null;
  status?: string;
  priority?: string;
  tags?: string[];
  working_hours?: Record<string, string | null>;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type Organization = { id: string; name: string; slug: string; created_at: string };

export type TeamLocation = {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  last_seen: string | null;
  shift_status: string | null;
  shift_started_at: string | null;
  is_online: boolean;
};

export type TeamLocationsResponse = { items: TeamLocation[] };

export type TrackPoint = { latitude: number; longitude: number; recorded_at: string };
export type TrackResponse = {
  user_id: string;
  date: string;
  points: TrackPoint[];
  total_distance_km: number;
};

export type HeatmapPoint = { latitude: number; longitude: number; weight: number };
export type HeatmapResponse = { points: HeatmapPoint[] };

// ============ Doctors ============

export async function getAllDoctors(): Promise<Doctor[]> {
  const PAGE_SIZE = 100;
  const all: Doctor[] = [];
  let page = 1;
  const MAX_PAGES = 50;

  while (page <= MAX_PAGES) {
    const res = await apiFetch<any>(`/api/doctors?page=${page}&page_size=${PAGE_SIZE}`);
    const items: Doctor[] = Array.isArray(res) ? res : (res.items ?? []);
    if (items.length === 0) break;
    all.push(...items);
    if (items.length < PAGE_SIZE) break;
    page += 1;
  }
  return all;
}

export async function getDoctor(id: string) {
  return apiFetch<Doctor>(`/api/doctors/${id}`);
}

export function doctorDisplayName(d: Doctor): string {
  if (d.full_name && d.full_name.trim()) return d.full_name.trim();
  const f = (d.first_name ?? "").trim();
  const l = (d.last_name ?? "").trim();
  return `${f} ${l}`.trim() || "Unknown";
}

export function buildMapsUrl(doctor: Doctor): string {
  if (doctor.latitude != null && doctor.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${doctor.latitude},${doctor.longitude}`;
  }
  const q = [doctor.address, doctor.city, doctor.state].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || doctorDisplayName(doctor))}`;
}

export async function discoverDoctor(data: {
  first_name: string;
  last_name: string;
  specialty?: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}): Promise<Doctor> {
  return apiFetch<Doctor>("/api/doctors/discover", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getNotifications(page = 1, unreadOnly = false) {
  return apiFetch<any>(`/api/notifications?page=${page}&unread_only=${unreadOnly}`);
}

export async function markNotificationRead(id: string) {
  return apiFetch<any>(`/api/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead() {
  return apiFetch<any>("/api/notifications/read-all", { method: "POST" });
}

// ============ Live Map / Tracking ============

export async function getTeamLocations() {
  return apiFetch<TeamLocationsResponse>("/api/team/locations");
}

export async function getUserTrack(userId: string, date: string) {
  return apiFetch<TrackResponse>(`/api/team/track/${userId}?date=${date}`);
}

export async function getHeatmap(days = 7) {
  return apiFetch<HeatmapResponse>(`/api/team/heatmap?days=${days}`);
}

// ============ Users (Team Management) ============

export async function getAllUsers(): Promise<User[]> {
  const PAGE_SIZE = 100;
  const all: User[] = [];
  let page = 1;
  const MAX_PAGES = 50;

  while (page <= MAX_PAGES) {
    const res = await apiFetch<any>(`/api/users?page=${page}&page_size=${PAGE_SIZE}`);
    const items: User[] = Array.isArray(res) ? res : (res.items ?? []);
    if (items.length === 0) break;
    all.push(...items);
    if (items.length < PAGE_SIZE) break;
    page += 1;
  }
  return all;
}

export async function createUser(payload: {
  full_name: string;
  email: string;
  password: string;
  role: string;
  phone?: string | null;
  specialties?: string[];
  supervisor_id?: string | null;
}) {
  return apiFetch<User>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(
  id: string,
  payload: Partial<{
    full_name: string;
    phone: string | null;
    role: string;
    is_active: boolean;
    specialties: string[];
    supervisor_id: string | null;
  }>
) {
  return apiFetch<User>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getUser(id: string) {
  return apiFetch<User>(`/api/users/${id}`);
}

// ============ RBAC / Reports ============

export async function getMyReps(): Promise<User[]> {
  return apiFetch<User[]>("/api/users/my-reps");
}

export async function sendVisitToAdmin(visitId: string): Promise<Visit> {
  return apiFetch(`/api/visits/${visitId}/send-to-admin`, { method: "POST" });
}

export async function forwardVisitToManager(visitId: string): Promise<Visit> {
  return apiFetch(`/api/visits/${visitId}/forward-to-manager`, { method: "POST" });
}

export async function updateAdminNotes(visitId: string, adminNotes: string): Promise<Visit> {
  return apiFetch(`/api/visits/${visitId}/admin-notes`, {
    method: "PATCH",
    body: JSON.stringify({ admin_notes: adminNotes }),
  });
}

// ============ Visits ============

export type Visit = {
  id: string;
  organization_id: string;
  rep_id: string;
  rep_name?: string | null;
  doctor_id: string;
  doctor_name?: string | null;
  doctor_specialty?: string | null;
  doctor_phone?: string | null;
  doctor_address?: string | null;
  doctor_latitude?: number | null;
  doctor_longitude?: number | null;
  visit_purpose: string;
  status: string;
  planned_at?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  duration_minutes?: number | null;
  checkin_latitude?: number | null;
  checkin_longitude?: number | null;
  checkout_latitude?: number | null;
  checkout_longitude?: number | null;
  distance_from_doctor?: number | null;
  is_verified: boolean;
  doctor_response?: string | null;
  notes?: string | null;
  next_follow_up_date?: string | null;
  next_follow_up_type?: string | null;
  next_follow_up_notes?: string | null;
  feedback_positive?: string | null;
  feedback_objections?: string | null;
  feedback_next_steps?: string | null;
  feedback_overall?: string | null;
  report_sent_to_admin_at?: string | null;
  report_forwarded_to_manager_at?: string | null;
  admin_notes?: string | null;
  signature_data?: string | null;
  products?: Array<{ id: string; name: string; category?: string | null }>;
  created_at: string;
  updated_at: string;
};

export async function getVisits(params?: {
  status?: string;
  doctor_id?: string;
  rep_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}): Promise<{ items: Visit[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.doctor_id) q.set("doctor_id", params.doctor_id);
  if (params?.rep_id) q.set("rep_id", params.rep_id);
  if (params?.date_from) q.set("date_from", params.date_from);
  if (params?.date_to) q.set("date_to", params.date_to);
  if (params?.limit) q.set("limit", String(params.limit));
  const suffix = q.toString() ? "?" + q.toString() : "";
  return apiFetch("/api/visits" + suffix);
}

export async function getActiveVisit(): Promise<Visit | null> {
  return apiFetch("/api/visits/active");
}

export async function getVisit(id: string): Promise<Visit> {
  return apiFetch("/api/visits/" + id);
}

export async function createVisit(payload: {
  doctor_id: string;
  visit_purpose?: string;
  planned_at?: string | null;
  notes?: string | null;
}): Promise<Visit> {
  return apiFetch("/api/visits", {
    method: "POST",
    body: JSON.stringify({
      doctor_id: payload.doctor_id,
      visit_purpose: payload.visit_purpose || "DETAILING",
      planned_at: payload.planned_at || null,
      notes: payload.notes || null,
    }),
  });
}

export async function checkInVisit(visitId: string, latitude: number, longitude: number, accuracy?: number): Promise<Visit> {
  return apiFetch("/api/visits/" + visitId + "/check-in", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude, accuracy: accuracy ?? null }),
  });
}

export async function checkOutVisit(visitId: string, payload: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  notes?: string | null;
  doctor_response?: string | null;
  next_follow_up_date?: string | null;
  next_follow_up_type?: string | null;
  next_follow_up_notes?: string | null;
  feedback_positive?: string | null;
  feedback_objections?: string | null;
  feedback_next_steps?: string | null;
  feedback_overall?: string | null;
  signature_data?: string | null;
  send_to_admin?: boolean;
}): Promise<Visit> {
  return apiFetch("/api/visits/" + visitId + "/check-out", {
    method: "POST",
    body: JSON.stringify({
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy ?? null,
      notes: payload.notes ?? null,
      doctor_response: payload.doctor_response ?? null,
      next_follow_up_date: payload.next_follow_up_date ?? null,
      next_follow_up_type: payload.next_follow_up_type ?? null,
      next_follow_up_notes: payload.next_follow_up_notes ?? null,
      feedback_positive: payload.feedback_positive ?? null,
      feedback_objections: payload.feedback_objections ?? null,
      feedback_next_steps: payload.feedback_next_steps ?? null,
      feedback_overall: payload.feedback_overall ?? null,
      signature_data: payload.signature_data ?? null,
      send_to_admin: payload.send_to_admin ?? true,
    }),
  });
}

export async function updateVisit(id: string, payload: { visit_purpose?: string; planned_at?: string | null; notes?: string | null }): Promise<Visit> {
  return apiFetch("/api/visits/" + id, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ============ Visit Products ============

export async function addProductToVisit(visitId: string, productId: string): Promise<Visit> {
  return apiFetch(`/api/visits/${visitId}/products/${productId}`, { method: "POST" });
}

export async function removeProductFromVisit(visitId: string, productId: string): Promise<Visit> {
  return apiFetch(`/api/visits/${visitId}/products/${productId}`, { method: "DELETE" });
}

// ============ Shifts ============

export type ShiftInfo = {
  id: string;
  user_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
};

export type ShiftCurrentResponse = {
  active: boolean;
  shift: ShiftInfo | null;
};

export async function getCurrentShift(): Promise<ShiftCurrentResponse> {
  return apiFetch("/api/shifts/current");
}

export async function startShift(notes?: string): Promise<ShiftInfo> {
  return apiFetch("/api/shifts/start", {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? null }),
  });
}

export async function endShift(notes?: string): Promise<ShiftInfo> {
  return apiFetch("/api/shifts/end", {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? null }),
  });
}

export async function sendLocationPing(latitude: number, longitude: number, accuracy?: number) {
  return apiFetch("/api/location/ping", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude, accuracy: accuracy ?? null }),
  });
}

// ============ Aliases / Helpers ============

export async function getMyVisits(): Promise<Visit[]> {
  const res = await getVisits();
  return res.items || [];
}

export async function getMyDoctors(): Promise<Doctor[]> {
  return getAllDoctors();
}

// ============ Doctor Areas ============

export type AreaInfo = {
  area: string | null;
  label: string;
  count: number;
};

export async function getDoctorAreas(): Promise<AreaInfo[]> {
  return apiFetch<AreaInfo[]>("/api/doctors/areas/list");
}

export async function getDoctorsByArea(
  area: string | null,
  search?: string
): Promise<Doctor[]> {
  const all = await getAllDoctors();
  let filtered = all;
  if (area !== null && area !== undefined) {
    filtered = filtered.filter((d) => d.area === area);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (d) =>
        doctorDisplayName(d).toLowerCase().includes(q) ||
        (d.specialty ?? "").toLowerCase().includes(q) ||
        (d.phone ?? "").toLowerCase().includes(q) ||
        (d.address ?? "").toLowerCase().includes(q)
    );
  }
  return filtered;
}

// ============ Products ============

export type Product = {
  id: string;
  organization_id: string;
  owner_user_id: string;
  owner_name?: string | null;
  assigned_to_user_id?: string | null;
  assigned_to_name?: string | null;
  visible_to_all: boolean;
  name: string;
  generic_name?: string | null;
  category?: string | null;
  description?: string | null;
  dosage_info?: string | null;
  image_url?: string | null;
  unit_price?: number | null;
  unit_cost?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getProducts(params?: { search?: string; category?: string }): Promise<{ items: Product[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.category) q.set("category", params.category);
  const suffix = q.toString() ? "?" + q.toString() : "";
  return apiFetch(`/api/products${suffix}`);
}

export async function getProduct(id: string): Promise<Product> {
  return apiFetch(`/api/products/${id}`);
}

export async function createProduct(payload: {
  name: string;
  generic_name?: string | null;
  category?: string | null;
  description?: string | null;
  dosage_info?: string | null;
  image_url?: string | null;
  unit_price?: number | null;
  unit_cost?: number | null;
  visible_to_all?: boolean;
  assigned_to_user_id?: string | null;
}): Promise<Product> {
  return apiFetch("/api/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(id: string, payload: Partial<{
  name: string;
  generic_name: string | null;
  category: string | null;
  description: string | null;
  dosage_info: string | null;
  image_url: string | null;
  unit_price: number | null;
  unit_cost: number | null;
  visible_to_all: boolean;
  assigned_to_user_id: string | null;
  is_active: boolean;
}>): Promise<Product> {
  return apiFetch(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  return apiFetch(`/api/products/${id}`, { method: "DELETE" });
}

export async function getProductCategories(): Promise<string[]> {
  return apiFetch<string[]>("/api/products/categories");
}

// ============ Uploads ============

export async function uploadImage(file: File): Promise<{ url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/uploads/image`, {
    method: "POST",
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Upload failed");
  }
  const data = await res.json();
  return { url: `${API_URL}${data.url}` };
}

// ============ Categories ============

export const PRODUCT_CATEGORIES = [
  "جلدية",
  "قلب",
  "أعصاب",
  "أطفال",
  "عظام",
  "باطنة",
  "عيون",
  "أنف وأذن",
  "مسالك بولية",
  "نساء وتوليد",
  "جهاز هضمي",
  "صدر وحساسية",
  "غدد صماء",
  "نفسية",
  "أسنان",
  "تجميل",
  "مكملات غذائية",
  "فيتامينات",
  "مضادات حيوية",
  "مسكنات",
  "أخرى",
];

// ============ Analytics ============

export type AnalyticsOverview = {
  totals: {
    visits: number;
    completed: number;
    unique_doctors: number;
    unique_reps: number;
    conversion_rate: number;
  };
  responses: {
    very_interested: number;
    interested: number;
    neutral: number;
    not_interested: number;
  };
  top_products: Array<{ id: string; name: string; category: string | null; count: number }>;
  top_reps: Array<{ id: string; name: string; count: number }>;
  top_areas: Array<{ area: string; count: number }>;
  top_specialties: Array<{ specialty: string; count: number }>;
  visit_trend: Array<{ date: string; count: number }>;
};

export type AnalyticsFilters = {
  specialties: string[];
  areas: string[];
  products: Array<{ id: string; name: string }>;
  reps: Array<{ id: string; name: string; role: string }>;
};

export async function getAnalyticsFilters(): Promise<AnalyticsFilters> {
  return apiFetch<AnalyticsFilters>("/api/analytics/filters");
}

export async function getAnalyticsOverview(params?: {
  days?: number;
  specialty?: string;
  area?: string;
  rep_id?: string;
  product_id?: string;
}): Promise<AnalyticsOverview> {
  const q = new URLSearchParams();
  if (params?.days) q.set("days", String(params.days));
  if (params?.specialty) q.set("specialty", params.specialty);
  if (params?.area) q.set("area", params.area);
  if (params?.rep_id) q.set("rep_id", params.rep_id);
  if (params?.product_id) q.set("product_id", params.product_id);
  const suffix = q.toString() ? "?" + q.toString() : "";
  return apiFetch<AnalyticsOverview>(`/api/analytics/overview${suffix}`);
}

// ============ Analytics Details ============

export type AnalyticsDetailsItem = {
  id: string;
  doctor_name?: string;
  doctor_specialty?: string | null;
  doctor_area?: string | null;
  rep_name?: string;
  name?: string;
  email?: string;
  role?: string;
  specialty?: string | null;
  area?: string | null;
  phone?: string | null;
  status?: string;
  checked_in_at?: string | null;
  doctor_response?: string | null;
  duration_minutes?: number | null;
  count: number;
};

export async function getAnalyticsDetails(params: {
  type: "visits" | "completed" | "doctors" | "reps" | "responses";
  response_type?: string;
  days?: number;
  specialty?: string;
  area?: string;
  rep_id?: string;
  product_id?: string;
}): Promise<{ type: string; items: AnalyticsDetailsItem[]; total: number }> {
  const q = new URLSearchParams();
  q.set("type", params.type);
  if (params.response_type) q.set("response_type", params.response_type);
  if (params.days) q.set("days", String(params.days));
  if (params.specialty) q.set("specialty", params.specialty);
  if (params.area) q.set("area", params.area);
  if (params.rep_id) q.set("rep_id", params.rep_id);
  if (params.product_id) q.set("product_id", params.product_id);
  return apiFetch(`/api/analytics/details?${q.toString()}`);
}

// ============ Signup ============

export type SignupPayload = {
  organization_name: string;
  organization_slug: string;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
  focus_areas: string[];
};

export type SignupResponse = {
  organization_id: string;
  organization_name: string;
  admin_user_id: string;
  admin_email: string;
  access_token: string;
  expires_in_minutes: number;
};

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  return apiFetch<SignupResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ============ Super Admin ============

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  users_count: number;
  doctors_count: number;
  visits_count: number;
  created_at: string;
};

export type OrganizationDetail = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  settings: Record<string, any>;
  limits: {
    max_users: number;
    max_doctors: number;
    max_visits_per_month: number;
  };
  usage: {
    users: number;
    doctors: number;
  };
  users: Array<{
    id: string;
    email: string;
    full_name: string;
    phone?: string | null;
    role: string;
    is_active: boolean;
    is_super_admin: boolean;
    created_at: string;
  }>;
  created_at: string;
};

export type PlatformStats = {
  organizations: number;
  users: number;
  doctors: number;
  visits: number;
};

export async function getSuperStats(): Promise<PlatformStats> {
  return apiFetch<PlatformStats>("/api/super/stats");
}

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  return apiFetch<OrganizationSummary[]>("/api/super/organizations");
}

export async function getOrganization(id: string): Promise<OrganizationDetail> {
  return apiFetch<OrganizationDetail>(`/api/super/organizations/${id}`);
}

export async function deleteOrganization(id: string): Promise<void> {
  return apiFetch(`/api/super/organizations/${id}`, { method: "DELETE" });
}

// ============ Super Admin — Extended ============

export type OrgStatus = "active" | "suspended";
export type OrgPlan = "basic" | "professional" | "enterprise";

export async function updateOrganization(
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    status: OrgStatus;
    plan: OrgPlan;
    settings: Record<string, any>;
  }>
): Promise<OrganizationSummary> {
  return apiFetch<OrganizationSummary>(`/api/super/organizations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function suspendOrganization(id: string): Promise<OrganizationSummary> {
  return updateOrganization(id, { status: "suspended" });
}

export async function activateOrganization(id: string): Promise<OrganizationSummary> {
  return updateOrganization(id, { status: "active" });
}

// Users management
export async function superUpdateUser(
  userId: string,
  payload: Partial<{
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    is_super_admin: boolean;
  }>
): Promise<{ ok: boolean }> {
  return apiFetch(`/api/super/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ ok: boolean }> {
  return apiFetch(`/api/super/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export async function impersonateUser(userId: string): Promise<{
  access_token: string;
  user_email: string;
  user_name: string;
  user_role: string;
}> {
  return apiFetch(`/api/super/users/${userId}/impersonate`, { method: "POST" });
}

export async function superDeleteUser(userId: string): Promise<void> {
  return apiFetch(`/api/super/users/${userId}`, { method: "DELETE" });
}

// Audit Logs
export type AuditLogEntry = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_name: string;
  actor_email: string | null;
  metadata: string | null;
  created_at: string | null;
};

export async function listAuditLogs(params?: {
  limit?: number;
  action_filter?: string;
}): Promise<AuditLogEntry[]> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.action_filter) q.set("action_filter", params.action_filter);
  const suffix = q.toString() ? "?" + q.toString() : "";
  return apiFetch<AuditLogEntry[]>(`/api/super/audit-logs${suffix}`);
}

// Broadcast
export async function broadcastNotification(payload: {
  title: string;
  message: string;
  type?: string;
}): Promise<{ ok: boolean; sent_to: number }> {
  return apiFetch(`/api/super/broadcast`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Platform Analytics
export type PlatformAnalytics = {
  new_orgs_30d: number;
  new_orgs_7d: number;
  new_users_30d: number;
  visits_30d: number;
  top_organizations: Array<{ id: string; name: string; slug: string; visits: number }>;
};

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  return apiFetch<PlatformAnalytics>("/api/super/analytics/overview");
}

// System Health
export async function getSystemHealth(): Promise<{
  database: string;
  timestamp: string;
}> {
  return apiFetch("/api/super/system/health");
}

// ============ Platform Doctors (Super Admin) ============

export type PlatformDoctor = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  created_at: string;
};

export type ImportResult = {
  success: number;
  duplicates: number;
  failed: number;
  errors: Array<{ row: number; name: string; error: string }>;
  total: number;
};

export type PlatformDoctorsStats = {
  total: number;
  specialties: Array<{ specialty: string; count: number }>;
};

export async function listPlatformDoctors(params?: {
  search?: string;
  specialty?: string;
  page?: number;
  page_size?: number;
}): Promise<PlatformDoctor[]> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.specialty) q.set("specialty", params.specialty);
  if (params?.page) q.set("page", String(params.page));
  if (params?.page_size) q.set("page_size", String(params.page_size));
  const suffix = q.toString() ? "?" + q.toString() : "";
  return apiFetch<PlatformDoctor[]>(`/api/super/doctors${suffix}`);
}

export async function getPlatformDoctorsStats(): Promise<PlatformDoctorsStats> {
  return apiFetch<PlatformDoctorsStats>("/api/super/doctors/stats");
}

export async function importPlatformDoctors(file: File): Promise<ImportResult> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/super/doctors/import`, {
    method: "POST",
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Import failed");
  }
  return res.json();
}

export async function deletePlatformDoctor(id: string): Promise<void> {
  await apiFetch(`/api/super/doctors/${id}`, { method: "DELETE" });
}

// ============ Sales ============

export type SaleStatus = "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";

export type Sale = {
  id: string;
  organization_id: string;
  rep_id: string;
  rep_name?: string | null;
  doctor_id: string;
  doctor_name?: string | null;
  doctor_specialty?: string | null;
  doctor_area?: string | null;
  product_id: string;
  product_name?: string | null;
  product_category?: string | null;
  visit_id?: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
  total_cost: number;
  profit: number;
  status: SaleStatus;
  notes?: string | null;
  sold_at: string;
  created_at: string;
};

export type SaleListResponse = {
  items: Sale[];
  total: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
};

export type SalesAnalytics = {
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  total_sales: number;
  avg_sale_value: number;
  top_products: Array<{ id: string; name: string; category?: string | null; quantity: number; revenue: number }>;
  top_reps: Array<{ id: string; name: string; sales_count: number; revenue: number }>;
  top_doctors: Array<{ id: string; name: string; specialty?: string | null; area?: string | null; sales_count: number; revenue: number }>;
  revenue_trend: Array<{ date: string; revenue: number; profit: number; count: number }>;
};

export async function getSales(params?: {
  days?: number;
  doctor_id?: string;
  product_id?: string;
  rep_id?: string;
  status?: string;
}): Promise<SaleListResponse> {
  const q = new URLSearchParams();
  if (params?.days) q.set("days", String(params.days));
  if (params?.doctor_id) q.set("doctor_id", params.doctor_id);
  if (params?.product_id) q.set("product_id", params.product_id);
  if (params?.rep_id) q.set("rep_id", params.rep_id);
  if (params?.status) q.set("status", params.status);
  const suffix = q.toString() ? "?" + q.toString() : "";
  return apiFetch(`/api/sales${suffix}`);
}

export async function getSale(id: string): Promise<Sale> {
  return apiFetch(`/api/sales/${id}`);
}

export async function createSale(payload: {
  doctor_id: string;
  product_id: string;
  quantity: number;
  unit_price?: number | null;
  unit_cost?: number | null;
  visit_id?: string | null;
  notes?: string | null;
  status?: SaleStatus;
}): Promise<Sale> {
  return apiFetch("/api/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSale(
  id: string,
  payload: Partial<{
    quantity: number;
    unit_price: number;
    unit_cost: number;
    status: SaleStatus;
    notes: string;
  }>
): Promise<Sale> {
  return apiFetch(`/api/sales/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSale(id: string): Promise<void> {
  return apiFetch(`/api/sales/${id}`, { method: "DELETE" });
}

export async function getSalesAnalytics(params?: {
  days?: number;
  specialty?: string;
  area?: string;
  rep_id?: string;
  product_id?: string;
}): Promise<SalesAnalytics> {
  const q = new URLSearchParams();
  if (params?.days) q.set("days", String(params.days));
  if (params?.specialty) q.set("specialty", params.specialty);
  if (params?.area) q.set("area", params.area);
  if (params?.rep_id) q.set("rep_id", params.rep_id);
  if (params?.product_id) q.set("product_id", params.product_id);
  const suffix = q.toString() ? "?" + q.toString() : "";
  return apiFetch(`/api/sales/analytics/overview${suffix}`);
}

// ============ Plan My Day ============

export type PlanItem = {
  doctor_id: string;
  doctor_name: string;
  specialty?: string | null;
  area?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priority?: string | null;
  last_visit_at?: string | null;
  days_since_visit?: number | null;
  reason: string;
  score: number;
};

export type PlanResponse = {
  items: PlanItem[];
  generated_at: string;
  total: number;
};

export type PlanDoctorItem = {
  doctor_id: string;
  doctor_name: string;
  specialty?: string | null;
  area?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priority?: string | null;
  days_since_visit?: number | null;
  last_visit_at?: string | null;
  score: number;
  selected?: boolean;
};

export type PlanBuildResponse = {
  doctors: PlanDoctorItem[];
  areas: string[];
  specialties: string[];
  total: number;
};

export type VisitSelection = {
  doctor_id: string;
  visit_purpose: string;
};

export type PlannedVisit = {
  visit_id: string;
  doctor_id: string;
  doctor_name: string;
  visit_purpose: string;
  order: number;
  latitude?: number | null;
  longitude?: number | null;
};

export type PlanConfirmResponse = {
  shift_id: string;
  visits: PlannedVisit[];
  total_distance_km?: number | null;
  message: string;
};

export const VISIT_PURPOSES = [
  { value: "DETAILING", label: "عرض منتجات" },
  { value: "FOLLOW_UP", label: "متابعة" },
  { value: "PRODUCT_LAUNCH", label: "إطلاق منتج جديد" },
  { value: "SAMPLE_DELIVERY", label: "توصيل عينات" },
  { value: "MEDICAL_EDUCATION", label: "تعليم طبي" },
  { value: "RELATIONSHIP_BUILDING", label: "بناء علاقة" },
] as const;

export async function getPlanToday(params?: {
  limit?: number;
  lat?: number;
  lng?: number;
}): Promise<PlanResponse> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.lat != null) q.set("lat", String(params.lat));
  if (params?.lng != null) q.set("lng", String(params.lng));
  const suffix = q.toString() ? "?" + q.toString() : "";
  return apiFetch(`/api/plan/today${suffix}`);
}

export async function buildPlan(params?: {
  lat?: number;
  lng?: number;
}): Promise<PlanBuildResponse> {
  const q = new URLSearchParams();
  if (params?.lat != null) q.set("lat", String(params.lat));
  if (params?.lng != null) q.set("lng", String(params.lng));
  const suffix = q.toString() ? "?" + q.toString() : "";
  return apiFetch(`/api/plan/build${suffix}`);
}

export async function confirmPlan(selections: VisitSelection[]): Promise<PlanConfirmResponse> {
  return apiFetch<PlanConfirmResponse>("/api/plan/confirm", {
    method: "POST",
    body: JSON.stringify({ selections }),
  });
}

// ── Chat ────────────────────────────────────────────────────────────
export type ChatMessage = {
  id: string;
  sender_id: string;
  sender_name?: string | null;
  receiver_id?: string | null;
  receiver_name?: string | null;
  group_name?: string | null;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
};

export type Conversation = {
  peer_id?: string | null;
  peer_name?: string | null;
  group_name?: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export async function getConversations(): Promise<Conversation[]> {
  return apiFetch("/api/chat/conversations");
}

export async function getMessages(peerId: string, limit = 50): Promise<ChatMessage[]> {
  return apiFetch(`/api/chat/messages/${peerId}?limit=${limit}`);
}

export async function sendMessage(payload: { receiver_id?: string; group_name?: string; content: string }): Promise<ChatMessage> {
  return apiFetch("/api/chat/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTeamMembers(): Promise<Array<{ id: string; full_name: string; email: string; role: string }>> {
  return apiFetch("/api/chat/team");
}