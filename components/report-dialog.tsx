"use client"
import { useState } from 'react'
import { submitReport } from '@/lib/api/report'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ReportDialogProps {
  targetType: 'character' | 'battle' | 'user'
  targetId: string
  trigger?: React.ReactNode
}

const PRESET_REASONS = [
  { code: 'nsfw', label: '부적절/NSFW' },
  { code: 'spam', label: '스팸/도배' },
  { code: 'hate', label: '혐오/차별' },
  { code: 'violence', label: '과도한 폭력 묘사' },
  { code: 'other', label: '기타' },
]

export function ReportDialog({ targetType, targetId, trigger }: ReportDialogProps) {
  const { toast } = useToast()
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = reason.length > 0 && !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = (await submitReport({ targetType, targetId, reason, details })) as any
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        throw new Error(String(res.error))
      }
      toast({
        title: '신고 접수됨',
        description: '검토 큐에 추가되었습니다.',
      })
      setReason('')
      setDetails('')
    } catch (e: any) {
      setError(e?.message || '신고 실패')
      toast({ title: '오류', description: e?.message || '신고 실패', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger || <Button variant="outline">신고</Button>}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>신고하기</AlertDialogTitle>
          <AlertDialogDescription>해당 콘텐츠가 규칙을 위반한다고 생각되는 이유를 선택하세요.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>사유 선택</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_REASONS.map((r) => (
                <Button
                  key={r.code}
                  type="button"
                  variant={reason === r.code ? 'default' : 'secondary'}
                  onClick={() => setReason(r.code)}
                  disabled={isSubmitting}
                  className="text-sm"
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-details">추가 설명 (선택)</Label>
            <Input
              id="report-details"
              placeholder="상세 내용 (최대 1000자)"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              disabled={isSubmitting}
            />
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>취소</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {isSubmitting ? '제출 중...' : '신고 제출'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
