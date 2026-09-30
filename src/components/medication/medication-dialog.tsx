import { useEffect } from 'react'
import { useAddMedication, useUpdateMedication } from '#/lib/api/hooks'

import { useForm } from '@tanstack/react-form'
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription, DialogFooter,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import type { Id } from '#/types/entities'

interface MedicationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Pass existing medication to edit; omit for create */
    medication?: {
        _id: Id<'medications'>
        name: string
        genericName: string
        category: string
        requiresPrescription: boolean
    } | null
}

export function MedicationDialog({
    open,
    onOpenChange,
    medication,
}: MedicationDialogProps) {
    const createMedication = useAddMedication()
    const updateMedication = useUpdateMedication()
    const isEdit = !!medication

    const form = useForm({
        defaultValues: {
            name: medication?.name ?? '',
            genericName: medication?.genericName ?? '',
            category: medication?.category ?? '',
            requiresPrescription: medication?.requiresPrescription ?? false,
        },
        onSubmit: async ({ value }) => {
            if (isEdit) {
                await updateMedication({ id: medication!._id, ...value })
            } else {
                await createMedication(value)
            }
            onOpenChange(false)
            form.reset()
        },
    })

    // reset form values when the medication prop changes (switching between edit targets)
    useEffect(() => {
        form.reset()
    }, [medication?._id])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Medication' : 'Add Medication'}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Update the medication details below.'
                            : 'Fill in the details to add a new medication to the master list.'}
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        form.handleSubmit()
                    }}
                    className="space-y-4 py-2"
                >
                    {/* Name */}
                    <form.Field name="name">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="med-name">Brand Name *</Label>
                                <Input
                                    id="med-name"
                                    placeholder="e.g. Panadol"
                                    value={field.state.value}
                                    onChange={e => field.handleChange(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                    </form.Field>

                    {/* Generic Name */}
                    <form.Field name="genericName">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="med-generic">Generic Name *</Label>
                                <Input
                                    id="med-generic"
                                    placeholder="e.g. Paracetamol"
                                    value={field.state.value}
                                    onChange={e => field.handleChange(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                    </form.Field>

                    {/* Category */}
                    <form.Field name="category">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="med-category">Category *</Label>
                                <Input
                                    id="med-category"
                                    placeholder="e.g. Analgesic, Antibiotic…"
                                    value={field.state.value}
                                    onChange={e => field.handleChange(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                    </form.Field>

                    {/* Requires Prescription */}
                    <form.Field name="requiresPrescription">
                        {(field) => (
                            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium">Requires Prescription</p>
                                    <p className="text-xs text-muted-foreground">
                                        Cannot be sold via POS without a prescription
                                    </p>
                                </div>
                                <Switch
                                    checked={field.state.value}
                                    onCheckedChange={field.handleChange}
                                />
                            </div>
                        )}
                    </form.Field>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <form.Subscribe selector={s => s.isSubmitting}>
                            {(isSubmitting) => (
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting
                                        ? isEdit ? 'Saving…' : 'Adding…'
                                        : isEdit ? 'Save Changes' : 'Add Medication'}
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}