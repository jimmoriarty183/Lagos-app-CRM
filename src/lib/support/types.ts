export type SupportRequestRecord = {
  id: string;
  businessId: string | null;
  businessLabel: string | null;
  type: string | null;
  subject: string | null;
  message: string | null;
  status: string | null;
  priority: string | null;
  source: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  submitterUserId: string | null;
  submitterLabel: string | null;
  assignedUserId: string | null;
  assignedLabel: string | null;
};

export type SupportAttachmentRecord = {
  id: string;
  requestId: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  bucket: string;
  objectPath: string;
  createdAt: string | null;
};

export type SupportStatusHistoryRecord = {
  id: string;
  requestId: string;
  fromStatus: string | null;
  toStatus: string | null;
  changedAt: string | null;
  changedByUserId: string | null;
  changedByLabel: string | null;
};

export type SupportInternalNoteRecord = {
  id: string;
  requestId: string;
  note: string;
  createdAt: string | null;
  createdByUserId: string | null;
  createdByLabel: string | null;
};

export type SupportAssignmentRecord = {
  id: string;
  requestId: string;
  assignedToUserId: string | null;
  assignedByUserId: string | null;
  assignedToLabel: string | null;
  assignedByLabel: string | null;
  createdAt: string | null;
};

export type SupportSummaryCounters = {
  total: number;
  new: number;
  inProgress: number;
  waitingForCustomer: number;
  resolved: number;
};

