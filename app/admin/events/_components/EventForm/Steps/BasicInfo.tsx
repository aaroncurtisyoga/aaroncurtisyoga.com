"use client";

import { FC, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { X } from "lucide-react";
import { PlaceDetails } from "@/app/_lib/types";
import { updateEvent } from "@/app/_lib/actions/event.actions";
import {
  EventFormValues,
  useEventFormContext,
} from "@/app/admin/events/_components/EventForm/EventFormProvider";
import Category from "@/app/admin/events/_components/EventForm/Fields/Category";
import EndDatePickerInput from "@/app/admin/events/_components/EventForm/Fields/EndDatePickerInput";
import LocationInput from "@/app/admin/events/_components/EventForm/Fields/LocationInput";
import StartDatePickerInput from "@/app/admin/events/_components/EventForm/Fields/StartDatePickerInput";
import TitleInput from "@/app/admin/events/_components/EventForm/Fields/TitleInput";
import PriceInput from "@/app/admin/events/_components/EventForm/Fields/PriceInput";
import ExternalHostingInput from "@/app/admin/events/_components/EventForm/Fields/ExternalHostingInput";
import { endForNewStart } from "@/app/admin/events/_components/EventForm/Fields/end-for-new-start";

const BasicInfo: FC = () => {
  const router = useRouter();
  const { mode, defaultValues } = useEventFormContext();
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useFormContext<EventFormValues>();
  const [isUpdating, setIsUpdating] = useState(false);

  const setLocationValueInReactHookForm = useCallback(
    (placeDetails: PlaceDetails) => {
      setValue("location", {
        formattedAddress: placeDetails.formattedAddress,
        lat: placeDetails.lat,
        lng: placeDetails.lng,
        name: placeDetails.name,
        placeId: placeDetails.placeId,
      });
    },
    [setValue],
  );

  // Moving the start moves the end with it, keeping the event's length
  const handleStartDateChange = useCallback(
    (newStartDate: Date | undefined) => {
      const oldStart = getValues("startDateTime");
      // This replaces the field's own onChange, so it has to mark the form
      // dirty itself, or "Update now" stays disabled after a time change
      const options = { shouldDirty: true, shouldValidate: true };
      setValue("startDateTime", newStartDate, options);
      if (newStartDate) {
        setValue(
          "endDateTime",
          endForNewStart(newStartDate, oldStart, getValues("endDateTime")),
          options,
        );
      }
    },
    [setValue, getValues],
  );

  // No need for initialization useEffect - handled in EventFormProvider

  const handleUpdateNow = async (data: EventFormValues) => {
    if (mode !== "edit" || !data.id) return;

    setIsUpdating(true);
    try {
      const updated = await updateEvent({
        event: data,
        path: `/admin/events`,
      });
      if (updated) {
        toast.success("Event updated successfully");
        router.push("/admin/events");
      }
    } catch (error) {
      console.error("Failed to update event:", error);
      toast.error("Failed to update event. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const onSubmit = async (data: EventFormValues) => {
    // Every event goes through the details step, externally hosted ones
    // included: their description is how a walk-in workshop tells people how
    // to get in, and it's the lead line on the homepage's featured card.
    const eventId = data.id;
    router.push(
      mode === "edit"
        ? `/admin/events/${eventId}/edit/details`
        : `/admin/events/create/details`,
    );
  };

  return (
    <div className="relative">
      {/* Close button in top-right corner */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute -top-2 -right-2 z-10"
        onClick={() => router.push("/admin/events")}
        aria-label="Close"
      >
        <X size={20} />
      </Button>

      <form onSubmit={handleSubmit(onSubmit)}>
        {defaultValues?.isExternal && (
          <div className="mb-4 p-3 bg-muted rounded-lg flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              This event was synced from an external source
              {defaultValues.sourceType && ` (${defaultValues.sourceType})`}.
              You can still edit all fields including the category.
            </span>
          </div>
        )}
        {/* Title - Full width */}
        <div className="mb-5">
          <TitleInput
            control={control}
            isSubmitting={isSubmitting}
            errors={errors}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Row 1 */}
          <LocationInput
            control={control}
            setLocationValueInReactHookForm={setLocationValueInReactHookForm}
            errors={errors}
          />
          <Category
            control={control}
            errors={errors}
            isSubmitting={isSubmitting}
          />

          {/* Row 2 */}
          <StartDatePickerInput
            control={control}
            errors={errors}
            isSubmitting={isSubmitting}
            onChange={handleStartDateChange}
          />
          <EndDatePickerInput
            control={control}
            errors={errors}
            isSubmitting={isSubmitting}
          />

          {/* Row 3 - Both fields with checkboxes */}
          <PriceInput
            control={control}
            isSubmitting={isSubmitting}
            errors={errors}
          />
          <ExternalHostingInput
            control={control}
            isSubmitting={isSubmitting}
            errors={errors}
          />
        </div>
        <div className="flex justify-between mt-5">
          <Button type="button" onClick={() => reset()} variant="secondary">
            Reset Form
          </Button>
          <div className="flex gap-2">
            {mode === "edit" && (
              <Button
                type="button"
                variant="secondary"
                className="text-green-600 hover:text-green-700"
                onClick={() => handleSubmit(handleUpdateNow)()}
                disabled={isUpdating || !isDirty || isSubmitting}
              >
                {isUpdating && <Loader2 className="animate-spin" size={16} />}
                Update Now
              </Button>
            )}
            <Button type="submit" disabled={isUpdating}>
              Next
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BasicInfo;
