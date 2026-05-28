import { apiClient } from "./client"

export const getReservations = async () => {
  const response = await apiClient.get(
    "/doctor/reservations"
  )

  return response.data
}

export const updateReservationStatus = async (
  scheduleId: number,
  status: string,
  payload?: {
    vet_memo?: string;
    attachments?: Array<{ id?: number; url: string; label: string }>;
  },
) => {

  const response = await apiClient.patch(
    `/doctor/reservations/${scheduleId}`,
    { status, ...payload }
  )

  return response.data
}

export interface ReservationCreatePayload {
  pet_id: number
  date: string
  time: string
  doctor_name?: string
  memo?: string
}

export interface ReservationUpdatePayload {
  date?: string
  time?: string
  doctor_name?: string
  memo?: string
}

export const createReservation = async (
  payload: ReservationCreatePayload
) => {

  const response = await apiClient.post(
    "/doctor/reservations",
    payload
  )

  return response.data
}

export const updateReservation = async (
  scheduleId: number,
  payload: ReservationUpdatePayload
) => {

  const response = await apiClient.put(
    `/doctor/reservations/${scheduleId}`,
    payload
  )

  return response.data
}

export const deleteReservation = async (scheduleId: number) => {

  const response = await apiClient.delete(
    `/doctor/reservations/${scheduleId}`
  )

  return response.data
}
