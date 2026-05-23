import { apiClient } from "./api-client";

export interface CreateFollowupPayload {
  emrid: number;
  images: string[];
  message?: string;
}

export interface FollowupResponse {
  code: number;
  message: string;
  result: {
    followup_id: number;
    followup_recommended?: boolean;
    guardian_message?: string;
    recommended_actions?: string[];
  };
}

export const createFollowup = async (
  payload: CreateFollowupPayload,
): Promise<FollowupResponse> => {
  const response = await apiClient.post<FollowupResponse>("/followup", payload);
  return response.data;
};
