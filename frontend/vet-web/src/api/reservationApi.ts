import axios from "axios"

const BASE_URL = "http://localhost:8000"

export const getReservations = async () => {
  const response = await axios.get(
    `${BASE_URL}/doctor/reservations`
  )

  return response.data
}

export const updateReservationStatus = async (
  scheduleId: number,
  status: string
) => {

  const response = await axios.patch(
    `${BASE_URL}/doctor/reservations/${scheduleId}`,
    { status }
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

  const response = await axios.post(
    `${BASE_URL}/doctor/reservations`,
    payload
  )

  return response.data
}

export const updateReservation = async (
  scheduleId: number,
  payload: ReservationUpdatePayload
) => {

  const response = await axios.put(
    `${BASE_URL}/doctor/reservations/${scheduleId}`,
    payload
  )

  return response.data
}

export const deleteReservation = async (scheduleId: number) => {

  const response = await axios.delete(
    `${BASE_URL}/doctor/reservations/${scheduleId}`
  )

  return response.data
}