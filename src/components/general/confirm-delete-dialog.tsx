import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Trash2, Undo2, XCircle } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const DEFAULT_DELAY_SECONDS = 10

type Stage = 'confirm' | 'countdown' | 'deleting'

interface ConfirmDeleteDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    subjectName?: string | null
    /** The identifying value the operator has to retype. Emails are best. */
    subjectEmail?: string | null
    /** Runs once both checks pass AND the countdown reaches zero. */
    onConfirm: () => Promise<unknown>
    delaySeconds?: number
}

/**
 * Destructive delete with two deliberate speed bumps.
 *
 * Step 1 — both of these have to match before the button even enables:
 *   • the exact identifier (email), and
 *   • the literal phrase `delete <identifier>` typed into a second field.
 * Step 2 — a countdown. The record is only removed when it reaches zero, and
 * there is an Undo the whole way down. Closing the dialog (Escape, backdrop,
 * Cancel or Undo) cancels the pending deletion: nothing is sent to the server
 * until the timer finishes, so a cancel can never leave a half-done delete.
 *
 * The slow path is the point — it makes deleting the wrong row, or deleting
 * while distracted, awkward rather than one stray click away.
 */
export function ConfirmDeleteDialog({
    open,
    onOpenChange,
    subjectName,
    subjectEmail,
    onConfirm,
    delaySeconds = DEFAULT_DELAY_SECONDS,
}: ConfirmDeleteDialogProps) {
    const identifier = (subjectEmail || subjectName || '').trim()

    const [stage, setStage] = useState<Stage>('confirm')
    const [emailInput, setEmailInput] = useState('')
    const [phraseInput, setPhraseInput] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [cancelled, setCancelled] = useState(false)
    const [secondsLeft, setSecondsLeft] = useState(delaySeconds)

    // The countdown effect must not re-subscribe when these props change mid-tick,
    // so the live values are read through refs instead of being dependencies.
    const onConfirmRef = useRef(onConfirm)
    const onOpenChangeRef = useRef(onOpenChange)
    const firedRef = useRef(false)
    useEffect(() => {
        onConfirmRef.current = onConfirm
        onOpenChangeRef.current = onOpenChange
    })

    // Fresh state every time it opens — never reopen onto a half-typed phrase.
    useEffect(() => {
        if (open) {
            setStage('confirm')
            setEmailInput('')
            setPhraseInput('')
            setError(null)
            setCancelled(false)
            setSecondsLeft(delaySeconds)
            firedRef.current = false
        }
    }, [open, delaySeconds])

    // Case-insensitive, surrounding whitespace ignored. The operator has to
    // reproduce the value, not its exact capitalisation.
    const emailMatches =
        identifier.length > 0 &&
        emailInput.trim().toLowerCase() === identifier.toLowerCase()
    const phraseMatches =
        identifier.length > 0 &&
        phraseInput.trim().toLowerCase() === `delete ${identifier}`.toLowerCase()
    const canDelete = emailMatches && phraseMatches

    useEffect(() => {
        if (stage !== 'countdown') return

        const totalMs = delaySeconds * 1000
        const startedAt = Date.now()
        const tick = setInterval(() => {
            const elapsed = Date.now() - startedAt

            if (elapsed < totalMs) {
                setSecondsLeft(Math.ceil((totalMs - elapsed) / 1000))
                return
            }

            clearInterval(tick)
            if (firedRef.current) return
            firedRef.current = true

            // The timer is the only path that deletes anything.
            setStage('deleting')
            onConfirmRef.current()
                .then(() => onOpenChangeRef.current(false))
                .catch((err) => {
                    setError(err instanceof Error ? err.message : 'Failed to delete')
                    setStage('confirm')
                })
        }, 100)

        // Unmounting, or returning to `confirm`, clears the pending deletion.
        return () => clearInterval(tick)
    }, [stage, delaySeconds])

    const handleDeleteClick = () => {
        setError(null)
        setCancelled(false)
        setSecondsLeft(delaySeconds)
        setStage('countdown')
    }

    const handleUndo = () => {
        setStage('confirm')
        setEmailInput('')
        setPhraseInput('')
        setCancelled(true)
        setSecondsLeft(delaySeconds)
    }

    const progress = Math.min(
        100,
        Math.max(0, ((delaySeconds - secondsLeft) / delaySeconds) * 100)
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                {stage === 'confirm' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <Trash2 className="size-5" />
                                Delete {subjectName || 'this user'}?
                            </DialogTitle>
                            <DialogDescription>
                                This permanently deletes the account
                                {subjectEmail ? <> <span className="font-medium">{subjectEmail}</span></> : null}
                                . It cannot be brought back. Confirm it twice below.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {cancelled && (
                                <Alert>
                                    <Undo2 className="h-4 w-4" />
                                    <AlertDescription>
                                        Deletion cancelled — nothing was deleted.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {identifier.length === 0 ? (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        This account has no email on record, so it cannot be
                                        confirmed for deletion here.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="delete-confirm-email">
                                            1. Type the user&apos;s email
                                        </Label>
                                        <Input
                                            id="delete-confirm-email"
                                            value={emailInput}
                                            autoComplete="off"
                                            spellCheck={false}
                                            placeholder={identifier}
                                            aria-invalid={emailInput.length > 0 && !emailMatches}
                                            onChange={(e) => {
                                                setEmailInput(e.target.value)
                                                setCancelled(false)
                                            }}
                                        />
                                        {emailInput.length > 0 && (
                                            <p className={`flex items-center gap-1.5 text-xs ${emailMatches ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {emailMatches
                                                    ? <><CheckCircle2 className="size-3.5" /> Matches</>
                                                    : <><XCircle className="size-3.5" /> Keep typing — it must match exactly</>}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="delete-confirm-phrase">
                                            2. Type{' '}
                                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                                delete {identifier}
                                            </span>
                                        </Label>
                                        <Input
                                            id="delete-confirm-phrase"
                                            value={phraseInput}
                                            autoComplete="off"
                                            spellCheck={false}
                                            placeholder={`delete ${identifier}`}
                                            aria-invalid={phraseInput.length > 0 && !phraseMatches}
                                            onChange={(e) => {
                                                setPhraseInput(e.target.value)
                                                setCancelled(false)
                                            }}
                                        />
                                        {phraseInput.length > 0 && (
                                            <p className={`flex items-center gap-1.5 text-xs ${phraseMatches ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {phraseMatches
                                                    ? <><CheckCircle2 className="size-3.5" /> Matches</>
                                                    : <><XCircle className="size-3.5" /> Keep typing — it must match exactly</>}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={!canDelete}
                                onClick={handleDeleteClick}
                            >
                                <Trash2 className="size-4" />
                                Delete user
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <Trash2 className="size-5" />
                                {stage === 'deleting'
                                    ? 'Deleting…'
                                    : `Deleting ${subjectName || 'the user'} in ${secondsLeft}s`}
                            </DialogTitle>
                            <DialogDescription>
                                {stage === 'deleting'
                                    ? 'Removing the account now.'
                                    : 'Nothing has been deleted yet. Close this dialog or press Undo to stop.'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-3 py-6">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-red-600 transition-[width] duration-100 ease-linear"
                                    style={{ width: `${stage === 'deleting' ? 100 : progress}%` }}
                                />
                            </div>
                            {identifier && (
                                <p className="text-center text-xs text-muted-foreground">
                                    <span className="font-medium">{identifier}</span> is still
                                    intact.
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled
                                className="mr-auto"
                            >
                                <Trash2 className="size-4" />
                                {stage === 'deleting' ? 'Deleting…' : `Waiting ${secondsLeft}s`}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={stage === 'deleting'}
                                onClick={handleUndo}
                            >
                                <Undo2 className="size-4" />
                                Undo
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
