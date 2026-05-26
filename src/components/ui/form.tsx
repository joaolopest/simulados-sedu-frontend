"use client";

import * as React from "react";
import { Label as LabelPrimitive, Slot } from "radix-ui";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

interface ContextoCampoFormulario<
  TFormValues extends FieldValues = FieldValues,
  TNome extends FieldPath<TFormValues> = FieldPath<TFormValues>,
> {
  name: TNome;
}

const ContextoCampoFormulario = React.createContext<ContextoCampoFormulario | null>(
  null,
);

function FormField<
  TFormValues extends FieldValues = FieldValues,
  TNome extends FieldPath<TFormValues> = FieldPath<TFormValues>,
>({ ...props }: ControllerProps<TFormValues, TNome>) {
  return (
    <ContextoCampoFormulario.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </ContextoCampoFormulario.Provider>
  );
}

interface ContextoItemFormulario {
  id: string;
}

const ContextoItemFormulario = React.createContext<ContextoItemFormulario | null>(
  null,
);

function useFormField() {
  const contextoCampo = React.useContext(ContextoCampoFormulario);
  const contextoItem = React.useContext(ContextoItemFormulario);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: contextoCampo?.name });

  if (!contextoCampo) {
    throw new Error("useFormField precisa ser usado dentro de <FormField>");
  }
  if (!contextoItem) {
    throw new Error("useFormField precisa ser usado dentro de <FormItem>");
  }

  const estadoCampo = getFieldState(contextoCampo.name, formState);
  const { id } = contextoItem;

  return {
    id,
    name: contextoCampo.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...estadoCampo,
  };
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  return (
    <ContextoItemFormulario.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </ContextoItemFormulario.Provider>
  );
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      data-slot="form-label"
      data-error={error ? "true" : undefined}
      className={cn(
        "data-[error=true]:text-destructive",
        className,
      )}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? formDescriptionId
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();
  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function FormMessage({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const corpo = error ? String(error.message ?? "") : props.children;
  if (!corpo) return null;
  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    >
      {corpo}
    </p>
  );
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
