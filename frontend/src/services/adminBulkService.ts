import axios from '@/lib/axios';

export interface ImportErrorItem {
  rowNumber: number;
  fieldName: string | null;
  errorMessage: string;
  rowData: unknown;
}

export interface ImportBatchStatus {
  id: string;
  fileName: string;
  status: 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
  uploadedAt: string;
  uploadedBy: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: ImportErrorItem[];
}

export interface RolloverPreviewResponse {
  previewSummary: {
    targetYear: string;
    totalDens: number;
    totalChildren: number;
    graduatingScouts: number;
    denChanges: Array<{
      denNumber: number;
      denName: string;
      currentRank: string;
      nextRank: string;
    }>;
    byRank: Array<{
      currentRank: string;
      count: number;
      nextRank: string;
    }>;
  };
}

export interface RolloverBatchStatus {
  id: string;
  targetYear: string;
  status: 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'ROLLED_BACK';
  executedAt: string;
  executedBy: string;
  densProcessed: number;
  childrenProcessed: number;
  childrenFailed: number;
  isDryRun: boolean;
  errors: Array<{
    childRankId: string;
    childName: string;
    errorMessage: string;
  }>;
}

class AdminBulkService {
  async importChildScouts(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post<{ batchId: string; message: string }>(
      '/child-scouts/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return response.data;
  }

  async getImportBatch(batchId: string): Promise<ImportBatchStatus> {
    const response = await axios.get<ImportBatchStatus>(`/imports/${batchId}`);
    return response.data;
  }

  async previewRollover(targetYear: string): Promise<RolloverPreviewResponse> {
    const response = await axios.post<RolloverPreviewResponse>('/rollover/preview', {
      targetYear,
    });
    return response.data;
  }

  async executeRollover(targetYear: string, isDryRun = false) {
    const response = await axios.post<{ batchId: string; message: string }>('/rollover/execute', {
      targetYear,
      isDryRun,
    });
    return response.data;
  }

  async getRolloverBatch(batchId: string): Promise<RolloverBatchStatus> {
    const response = await axios.get<RolloverBatchStatus>(`/rollover/${batchId}`);
    return response.data;
  }
}

export const adminBulkService = new AdminBulkService();