'use client'
import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  exportCasesToCsv, exportProceduresToCsv, exportAirwayToCsv,
  exportArterialLineToCsv, exportCvcToCsv, exportUssToCSV,
  exportRegionalBlockToCsv, exportWardReviewsToCsv, exportTransfersToCsv,
  exportEdToCsv, exportMedicineToCsv,
} from '@/lib/export'
import type { CaseLog, ProcedureLog, AirwayLog, ArterialLineLog, CVCLog, USSLog, RegionalBlockLog, WardReviewLog, TransferLog, EDAttendanceLog, MedicinePlacementLog } from '@/types/database'

interface ExportItem {
  label: string
  description: string
  table: string
  exportFn: (data: unknown[]) => void
}

const EXPORTS: ExportItem[] = [
  { label: 'ICU Cases', description: 'All case log entries with COBATRICE and organ systems', table: 'case_logs', exportFn: (d) => exportCasesToCsv(d as CaseLog[]) },
  { label: 'Procedures', description: 'General procedure logs', table: 'procedure_logs', exportFn: (d) => exportProceduresToCsv(d as ProcedureLog[]) },
  { label: 'Airway Management', description: 'All airway/intubation logs', table: 'airway_logs', exportFn: (d) => exportAirwayToCsv(d as AirwayLog[]) },
  { label: 'Arterial Lines', description: 'Arterial line insertion logs', table: 'arterial_line_logs', exportFn: (d) => exportArterialLineToCsv(d as ArterialLineLog[]) },
  { label: 'CVCs', description: 'Central venous catheter logs', table: 'cvc_logs', exportFn: (d) => exportCvcToCsv(d as CVCLog[]) },
  { label: 'Ultrasound', description: 'Point-of-care USS logs', table: 'uss_logs', exportFn: (d) => exportUssToCSV(d as USSLog[]) },
  { label: 'Regional Blocks', description: 'Regional anaesthesia logs', table: 'regional_block_logs', exportFn: (d) => exportRegionalBlockToCsv(d as RegionalBlockLog[]) },
  { label: 'Ward Reviews', description: 'Outreach and ward review logs', table: 'ward_review_logs', exportFn: (d) => exportWardReviewsToCsv(d as WardReviewLog[]) },
  { label: 'Transfers', description: 'Transfer logs', table: 'transfer_logs', exportFn: (d) => exportTransfersToCsv(d as TransferLog[]) },
  { label: 'ED Attendances', description: 'Emergency department logs', table: 'ed_attendance_logs', exportFn: (d) => exportEdToCsv(d as EDAttendanceLog[]) },
  { label: 'Medicine Placements', description: 'Medicine and specialty placements', table: 'medicine_placement_logs', exportFn: (d) => exportMedicineToCsv(d as MedicinePlacementLog[]) },
]

export default function ExportPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)

  const handleExport = async (item: ExportItem) => {
    setLoading(item.table)
    try {
      const { data } = await supabase
        .from(item.table)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      item.exportFn(data ?? [])
    } finally {
      setLoading(null)
    }
  }

  const handleExportAll = async () => {
    setLoading('all')
    for (const item of EXPORTS) {
      const { data } = await supabase.from(item.table).select('*').is('deleted_at', null).order('created_at', { ascending: false })
      item.exportFn(data ?? [])
      // Small delay to avoid browser blocking multiple downloads
      await new Promise((r) => setTimeout(r, 300))
    }
    setLoading(null)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Export</h1>
        <p className="text-gray-500 text-sm">Download your logbook data as CSV files for ARCP submission</p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export all data</h2>
            <p className="text-sm text-gray-500">Download all log types at once</p>
          </div>
          <Button onClick={handleExportAll} loading={loading === 'all'} size="lg">
            Download all CSVs
          </Button>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          {EXPORTS.map((item) => (
            <div key={item.table} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleExport(item)}
                loading={loading === item.table}
              >
                Export CSV
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
