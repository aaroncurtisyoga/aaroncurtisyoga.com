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
import DescriptionRichTextEditor from "@/app/admin/events/_components/EventForm/Fields/DescriptionRichTextEditor";

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
            People sign up somewhere else for this one. If there&apos;s no link
            (walk-in tickets at a studio, say), use the description&apos;s first
            paragraph to say how to get in: it&apos;s the big line on the
            homepage card when the event is starred.
          </p>
        </div>
        <ImagePicker errors={errors} setValue={setValue} control={control} />
        <DescriptionRichTextEditor control={control} errors={errors} />
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
