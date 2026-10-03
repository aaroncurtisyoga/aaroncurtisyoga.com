import { FC } from "react";
import {
  Control,
  Controller,
  FieldErrors,
  RegisterOptions,
} from "react-hook-form";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { EventFormValues } from "@/app/admin/events/_components/EventForm/EventFormProvider";

interface StartDatePickerInputProps {
  control: Control<EventFormValues>;
  errors: FieldErrors<EventFormValues>;
  isSubmitting: boolean;
  onChange?: (value: Date | undefined) => void;
  rules?: RegisterOptions<EventFormValues, "startDateTime">;
}

const StartDatePickerInput: FC<StartDatePickerInputProps> = ({
  control,
  errors,
  isSubmitting,
  onChange,
  rules,
}) => {
  return (
    <Controller
      control={control}
      name={"startDateTime" satisfies keyof EventFormValues}
      rules={rules}
      render={({ field }) => (
        <DateTimePicker
          label="Start Date/Time"
          value={
            field.value instanceof Date
              ? field.value
              : field.value
                ? new Date(field.value)
                : undefined
          }
          onChange={onChange || field.onChange}
          disabled={isSubmitting}
          error={errors.startDateTime?.message as string}
          required={!!rules?.required}
        />
      )}
    />
  );
};

export default StartDatePickerInput;
