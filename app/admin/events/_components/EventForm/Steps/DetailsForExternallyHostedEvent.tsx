"use client";

import { FC } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useFormContext } from "react-hook-form";
import {
  EventFormValues,
  useEventFormContext,
} from "@/app/admin/events/_components/EventForm/EventFormProvider";
import ImagePicker from "@/app/admin/events/_components/EventForm/Fields/ImagePicker";
// External registration URL is now handled in BasicInfo step

const DetailsForExternallyHostedEvent: FC = () => {
  const router = useRouter();
  const { mode } = useEventFormContext();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useFormContext<EventFormValues>();

  const onSubmit = async (data: EventFormValues) => {
    const eventId = data.id;
    const nextStepUrl =
      mode === "edit"
        ? `/admin/events/${eventId}/edit/submit`
        : `/admin/events/create/submit`;
    router.push(nextStepUrl);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-5">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-muted-foreground">
            Registration for this event happens on the external site you linked
            in the previous step. You can still add a photo below; it&apos;s
            used on the event page and in the newsletter.
          </p>
        </div>
        <ImagePicker errors={errors} setValue={setValue} control={control} />
      </div>
      <div className="flex justify-between mt-5">
        <Button type="button" asChild>
          <Link href={mode === "edit" ? "../" : "/admin/events/create"}>
            Previous
          </Link>
        </Button>
        <Button type="submit">Next</Button>
      </div>
    </form>
  );
};

export default DetailsForExternallyHostedEvent;
