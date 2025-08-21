import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
declare const inputVariants: (props?: ({
    variant?: "default" | "success" | "warning" | "error" | null | undefined;
    inputSize?: "sm" | "md" | "lg" | "xl" | null | undefined;
} & import("class-variance-authority/dist/types").ClassProp) | undefined) => string;
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, VariantProps<typeof inputVariants> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}
export declare function Input({ className, variant, inputSize, label, error, helperText, leftIcon, rightIcon, id, ...props }: InputProps & {
    ref?: React.Ref<HTMLInputElement>;
}): import("react/jsx-runtime").JSX.Element;
export declare namespace Input {
    var displayName: string;
}
export declare const InputWithRef: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
export {};
//# sourceMappingURL=Input.d.ts.map