'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import { formatDateOnly } from '@/lib/date-utils'
import type { Shift } from '@plantoes-medicos/types'
import { compensationLabels } from '@/lib/compensation'

const pinIcon = L.divIcon({
  html: `<div style="background:#4F46E5;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -30],
})

interface ShiftWithCoords extends Shift {
  hospital: NonNullable<Shift['hospital']> & { latitude: number; longitude: number }
}

interface ShiftsMapProps {
  shifts: Shift[]
  height?: number
}

export function ShiftsMap({ shifts, height = 440 }: ShiftsMapProps) {
  const points = useMemo(
    () =>
      shifts.filter(
        (s): s is ShiftWithCoords => s.hospital?.latitude != null && s.hospital?.longitude != null
      ),
    [shifts]
  )

  const center: [number, number] =
    points.length > 0
      ? [
          points.reduce((sum, s) => sum + s.hospital.latitude, 0) / points.length,
          points.reduce((sum, s) => sum + s.hospital.longitude, 0) / points.length,
        ]
      : [-14.235, -51.9253]

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400 px-6 text-center"
        style={{ height }}
      >
        Nenhuma vaga com localização disponível pra exibir no mapa.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200" style={{ height }}>
      <MapContainer
        center={center}
        zoom={points.length === 1 ? 13 : 11}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((shift) => (
          <Marker key={shift.id} position={[shift.hospital.latitude, shift.hospital.longitude]} icon={pinIcon}>
            <Popup>
              <div className="text-sm space-y-1 min-w-[180px]">
                <p className="font-semibold text-slate-900">{shift.title}</p>
                <p className="text-slate-500">
                  {shift.hospital.name} — {shift.hospital.city}/{shift.hospital.state}
                </p>
                <p className="text-slate-700">
                  {formatDateOnly(shift.date)} · {shift.startTime}–{shift.endTime}
                </p>
                <p className="text-slate-700">{compensationLabels[shift.compensationType]}</p>
                <Link href={`/profissional/plantoes/${shift.id}`} className="text-primary font-medium hover:underline">
                  Ver detalhes →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
