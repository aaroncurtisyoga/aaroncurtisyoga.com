"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { X } from "lucide-react";

import { getEventById, updateEvent } from "@/app/_lib/actions/event.actions";
import { PlaceDetails } from "@/app/_lib/types";
import { EventFormValues } from "@/app/admin/events/_components/EventForm/EventFormProvider";

// Import field components
import TitleInput from "@/app/admin/events/_components/EventForm/Fields/TitleInput";
import LocationInput from "@/app/admin/events/_components/EventForm/Fields/LocationInput";
import Category from "@/app/admin/events/_components/EventForm/Fields/Category";
import StartDatePickerInput from "@/app/admin/events/_components/EventForm/Fields/StartDatePickerInput";
import EndDatePickerInput from "@/app/admin/events/_components/EventForm/Fields/EndDatePickerInput";
import DescriptionRichTextEditor from "@/app/admin/events/_components/EventForm/Fields/DescriptionRichTextEditor";
import ImagePicker from "@/app/admin/events/_components/EventForm/Fields/ImagePicker";
import { endForNewStart } from "@/app/admin/events/_components/EventForm/Fields/end-for-new-start";

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    defaultValues: {
      isFree: false,
      isHostedExternally: false,
    },
  });

  const isHostedExternally = watch("isHostedExternally");
  const isFree = watch("isFree");

  // Fetch event data on mount
  useEffect(() => {
    async function fetchEvent() {
      try {
        const event = await getEventById(id);

        if (!event) {
          setError("Event not found");
          setIsLoading(false);
          return;
        }

        // Reset form with fetched data
        reset({
          id: event.id,
          title: event.title,
          description: event.description ?? undefined,
          imageUrl: event.imageUrl ?? undefined,
          price: event.price ?? undefined,
          isFree: event.isFree,
          isHostedExternally: event.isHostedExternally,
          externalRegistrationUrl: event.externalRegistrationUrl ?? undefined,
          maxAttendees: event.maxAttendees ?? undefined,
          category: event.category?.id ?? undefined,
          location: event.location
            ? {
                formattedAddress: event.location.formattedAddress ?? undefined,
                lat: event.location.lat ?? undefined,
                lng: event.location.lng ?? undefined,
                name: event.location.name ?? undefined,
                placeId: event.location.placeId ?? undefined,
              }
            : undefined,
          startDateTime: event.startDateTime
            ? new Date(event.startDateTime)
            : undefined,
          endDateTime: event.endDateTime
            ? new Date(event.endDateTime)
            : undefined,
        });
      } catch (err) {
        console.error("Failed to fetch event:", err);
        setError("Failed to load event data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvent();
  }, [id, reset]);

  const setLocationValue = useCallback(
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

  const onSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);

    try {
      // Convert Date to UTC ISO strings
      const startDateTime =
        data.startDateTime instanceof Date
          ? data.startDateTime.toISOString()
          : data.startDateTime;
      const endDateTime =
        data.endDateTime instanceof Date
          ? data.endDateTime.toISOString()
          : data.endDateTime;

      const eventData = {
        ...data,
        startDateTime,
        endDateTime,
      };

      const updated = await updateEvent({
        event: eventData,
        path: `/events/${id}`,
      });

      if (updated) {
        toast.success("Event updated successfully");
        router.push("/admin/events");
      } else {
        toast.error("Failed to update event");
      }
    } catch (err) {
      console.error("Error updating event:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update event",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] gap-2">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">Loading event...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => router.push("/admin/events")}>
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="relative">
        {/* Close button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute -top-2 -right-2 z-10"
          onClick={() => router.push("/admin/events")}
          aria-label="Close"
        >
          <X size={20} />
        </Button>

        <h1 className="mb-6 font-display text-3xl uppercase text-foreground">
          Edit Event
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <TitleInput
            control={control}
            isSubmitting={isSubmitting}
            errors={errors}
            rules={{ required: "Event name is required" }}
          />

          {/* Location & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <LocationInput
              control={control}
              setLocationValueInReactHookForm={setLocationValue}
              errors={errors}
              isDisabled={isSubmitting}
            />
            <Category
              control={control}
              errors={errors}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <StartDatePickerInput
              control={control}
              errors={errors}
              isSubmitting={isSubmitting}
              onChange={handleStartDateChange}
              rules={{ required: "Start date/time is required" }}
            />
            <EndDatePickerInput
              control={control}
              errors={errors}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Price */}
          <div className="max-w-xs">
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <FormField label="Price">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      placeholder="0.00"
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isFree || isSubmitting}
                      className="pl-7"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </div>
                </FormField>
              )}
            />
            <Controller
              name="isFree"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked) {
                        setValue("price", "0");
                      }
                    }}
                  />
                  <Label className="text-sm">Free event</Label>
                </div>
              )}
            />
          </div>

          {/* Hosting Toggle */}
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <Controller
              name="isHostedExternally"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                  <Label className="font-medium">Externally hosted event</Label>
                </div>
              )}
            />
            <p className="text-sm text-muted-foreground">
              {isHostedExternally
                ? "Registration is handled on an external website"
                : "Registration is handled through this platform"}
            </p>
          </div>

          {/* Conditional Fields based on hosting type */}
          {isHostedExternally ? (
            // External hosting fields
            <div className="space-y-4">
              <Controller
                name="externalRegistrationUrl"
                control={control}
                // Optional: a walk-in workshop has no sign-up page, and its
                // description says how to get in instead.
                rules={{
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message:
                      "Please enter a valid URL starting with http(s)://",
                  },
                }}
                render={({ field }) => (
                  <FormField
                    label="External Registration URL"
                    error={errors.externalRegistrationUrl?.message}
                  >
                    <Input
                      placeholder="https://..."
                      type="url"
                      disabled={isSubmitting}
                      className={
                        errors.externalRegistrationUrl
                          ? "border-destructive"
                          : ""
                      }
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormField>
                )}
              />
            </div>
          ) : (
            // Internal hosting fields
            <div className="space-y-6">
              {/* Max Attendees */}
              <div className="max-w-xs">
                <Controller
                  name="maxAttendees"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Maximum Attendees">
                      <Input
                        placeholder="Leave empty for unlimited"
                        type="number"
                        min="1"
                        disabled={isSubmitting}
                        value={field.value?.toString() ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value, 10)
                              : undefined,
                          )
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                      <p className="text-xs text-muted-foreground">
                        Set a limit on the number of registrations
                      </p>
                    </FormField>
                  )}
                />
              </div>
            </div>
          )}

          {/* Image and description apply to every event, however people
              sign up. */}
          <div className="space-y-6">
            <ImagePicker
              errors={errors}
              setValue={setValue}
              control={control}
            />
            <DescriptionRichTextEditor
              control={control}
              errors={errors}
              isDisabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/events")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" size={16} />}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
