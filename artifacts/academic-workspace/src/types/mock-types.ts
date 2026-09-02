// Standalone types for mocks (production build-safe)
// These are duplicated from @workspace/api-client-react to avoid
// workspace dependency during Vercel production build.
export interface Project {
  id: number;
  title: string;
  status: string;
  progress: number;
  instructionText: string | null;
  subject: string | null;
  taskType: string | null;
  citationFormat: string | null;
  outputFormat: string | null;
  minRefYear: number | null;
  minRefCount: number | null;
  createdAt: string;
  updatedAt: string;
  aiDisclosure?: boolean;
}

export interface Message {
  id: number;
  projectId: number;
  role: string;
  content: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: number;
  projectId: number;
  versionNumber: number;
  content: string;
  outline: string | null;
  changeDescription: string | null;
  createdAt: string;
}

export interface Reference {
  id: number;
  projectId: number;
  title: string;
  authors: string;
  year: number;
  journal: string | null;
  doi: string | null;
  validationStatus: string;
  usedInChapters: string | null;
  createdAt: string;
}

export interface Attachment {
  id: number;
  projectId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  attachmentType: string;
  extractedText: string | null;
  createdAt: string;
}

export interface Activity {
  id: number;
  projectId: number;
  eventType: string;
  description: string;
  createdAt: string;
}

export interface Job {
  id: number;
  projectId: number;
  jobType: string;
  status: string;
  result: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMetadata {
  id: number;
  projectId: number;
  detectedTitle: string;
  subject: string | null;
  taskType: string | null;
  citationFormat: string | null;
  language: string;
  outline: string | null;
  contextSummary: string;
  createdAt: string;
  updatedAt: string;
}
